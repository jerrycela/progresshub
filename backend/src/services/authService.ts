import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import prisma from "../config/database";
import { env } from "../config/env";
import { Employee, PermissionLevel } from "@prisma/client";
import { toUserDTO, UserDTO } from "../mappers";
import { AppError } from "../middleware/errorHandler";

// FIXME: OAuth state 使用 In-Memory Map，在多進程/多節點/重啟時會失效。
// 影響：使用者在節點 A 產生 state，但 callback 打到節點 B 時會驗證失敗。
// 優先級：生產環境部署前必須遷移至 Redis 或資料庫。
// 參考：https://github.com/your-org/progresshub/issues/XX
const OAUTH_STATE_MAX_COUNT = 1000;
const STATE_TTL = 10 * 60 * 1000; // 10 minutes
const oauthStates = new Map<string, { expiresAt: number }>();

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: UserDTO;
}

export class AuthService {
  /**
   * Generate a cryptographically random OAuth state parameter for CSRF protection.
   * Cleans up expired states before generating a new one.
   */
  generateOAuthState(): string {
    // Cleanup expired states
    const now = Date.now();
    for (const [key, value] of oauthStates.entries()) {
      if (now > value.expiresAt) {
        oauthStates.delete(key);
      }
    }

    if (oauthStates.size >= OAUTH_STATE_MAX_COUNT) {
      throw new AppError(
        503,
        "OAuth state storage is full, please try again later",
      );
    }

    const state = crypto.randomBytes(32).toString("hex");
    oauthStates.set(state, { expiresAt: now + STATE_TTL });
    return state;
  }

  /**
   * Verify and consume a one-time OAuth state parameter.
   * Returns true if the state is valid and not expired.
   */
  verifyOAuthState(state: string): boolean {
    const data = oauthStates.get(state);
    if (!data) return false;

    oauthStates.delete(state); // One-time use
    return Date.now() <= data.expiresAt;
  }

  /**
   * Slack OAuth Code Exchange login
   * Frontend sends the OAuth `code`, backend exchanges it for user identity
   */
  async loginWithSlackCode(code: string): Promise<LoginResult> {
    const tokenResponse = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          code,
        },
      },
    );

    if (!tokenResponse.data.ok) {
      throw new AppError(
        502,
        `Slack OAuth failed: ${tokenResponse.data.error || "unknown error"}`,
      );
    }

    const { authed_user } = tokenResponse.data;
    if (!authed_user?.id) {
      throw new AppError(502, "Slack OAuth: missing user identity");
    }

    // Get user profile from Slack
    const userResponse = await axios.get("https://slack.com/api/users.info", {
      params: { user: authed_user.id },
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token || env.SLACK_BOT_TOKEN}`,
      },
    });

    const slackUser = userResponse.data.user;
    const email = slackUser?.profile?.email || `${authed_user.id}@slack.local`;
    const name = slackUser?.real_name || slackUser?.name || authed_user.id;

    // Find or create employee
    let employee = await prisma.employee.findUnique({
      where: { slackUserId: authed_user.id },
    });

    if (!employee) {
      // Try matching by email
      employee = await prisma.employee.findUnique({
        where: { email },
      });

      if (employee) {
        // Link existing employee to Slack
        employee = await prisma.employee.update({
          where: { id: employee.id },
          data: { slackUserId: authed_user.id },
        });
      } else {
        // Create new employee
        employee = await prisma.employee.create({
          data: {
            slackUserId: authed_user.id,
            email,
            name,
            permissionLevel: PermissionLevel.EMPLOYEE,
            isActive: true,
          },
        });
      }
    }

    // Check if account is active
    if (!employee.isActive) {
      throw new AppError(403, "帳號已停用，請聯繫管理員");
    }

    // Update last active
    await prisma.employee.update({
      where: { id: employee.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.generateToken(employee);
    const refreshToken = await this.generateRefreshToken(employee);
    return { token, refreshToken, user: toUserDTO(employee) };
  }

  /**
   * Development-only login by email (no Slack required)
   */
  async devLogin(email: string): Promise<LoginResult> {
    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee) {
      throw new AppError(404, `Employee with email ${email} not found`);
    }

    return this.completeDevLogin(employee);
  }

  /**
   * Development-only login by employee ID (no Slack required)
   */
  async devLoginById(employeeId: string): Promise<LoginResult> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError(404, `Employee with ID ${employeeId} not found`);
    }

    return this.completeDevLogin(employee);
  }

  /**
   * Demo login: find-or-create an employee by name + role, then issue tokens.
   * Email is deterministically derived from the name slug to ensure idempotency.
   */
  async demoLogin(
    name: string,
    permissionLevel: PermissionLevel,
    projectIds?: string[],
  ): Promise<LoginResult> {
    const nameSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const email = `demo-${nameSlug}@demo.progresshub.local`;

    const functionType =
      permissionLevel === PermissionLevel.EMPLOYEE ? "PROGRAMMING" : "PLANNING";

    const employee = await prisma.employee.upsert({
      where: { email },
      update: { name, permissionLevel, functionType },
      create: {
        email,
        name,
        permissionLevel,
        isActive: true,
        functionType,
      },
    });

    // Clear old project memberships and set new ones
    await prisma.projectMember.deleteMany({
      where: { employeeId: employee.id },
    });
    if (projectIds && projectIds.length > 0) {
      await prisma.projectMember.createMany({
        data: projectIds.map((projectId) => ({
          projectId,
          employeeId: employee.id,
        })),
        skipDuplicates: true,
      });
    }

    return this.completeDevLogin(employee);
  }

  private async completeDevLogin(employee: Employee): Promise<LoginResult> {
    if (!employee.isActive) {
      throw new AppError(403, "Account is disabled");
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.generateToken(employee);
    const refreshToken = await this.generateRefreshToken(employee);
    return { token, refreshToken, user: toUserDTO(employee) };
  }

  /**
   * Generate JWT Token (access token, short-lived)
   */
  generateToken(employee: Employee): string {
    return jwt.sign(
      {
        userId: employee.id,
        email: employee.email,
        permissionLevel: employee.permissionLevel,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as SignOptions,
    );
  }

  /**
   * Verify access token
   */
  verifyToken(token: string): {
    userId: string;
    email: string;
    permissionLevel: PermissionLevel;
  } {
    return jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      permissionLevel: PermissionLevel;
    };
  }

  /**
   * Generate a refresh token (long-lived) and persist it to the database.
   * The refresh token itself is a JWT signed with a separate secret.
   * Runs a 1% probabilistic cleanup of expired tokens to prevent table bloat.
   */
  async generateRefreshToken(employee: Employee): Promise<string> {
    const refreshToken = jwt.sign(
      {
        userId: employee.id,
        type: "refresh",
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions,
    );

    const expiresInMs = this.parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + expiresInMs);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: employee.id,
        expiresAt,
      },
    });

    // 1% probabilistic cleanup of expired tokens to avoid table bloat
    if (Math.random() < 0.01) {
      prisma.refreshToken
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => {
          // Non-critical cleanup; ignore errors
        });
    }

    return refreshToken;
  }

  /**
   * Verify a refresh token: check JWT signature and ensure it exists in the database.
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== "refresh") {
      throw new AppError(401, "Invalid token type");
    }

    // Check if the token exists in the database (not revoked)
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored) {
      throw new AppError(401, "Refresh token has been revoked or is invalid");
    }

    if (new Date() > stored.expiresAt) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new AppError(401, "Refresh token has expired");
    }

    return { userId: decoded.userId };
  }

  /**
   * Revoke a specific refresh token (used during logout).
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  /**
   * Revoke all refresh tokens for a given user.
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  /**
   * Use a refresh token to generate a new access token.
   * The old refresh token remains valid (rotation is optional).
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const { userId } = await this.verifyRefreshToken(refreshToken);

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
    });

    if (!employee || !employee.isActive) {
      await this.revokeRefreshToken(refreshToken);
      throw new AppError(401, "User not found or account is disabled");
    }

    // Revoke old refresh token and issue a new one (token rotation)
    await this.revokeRefreshToken(refreshToken);

    const newAccessToken = this.generateToken(employee);
    const newRefreshToken = await this.generateRefreshToken(employee);

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Parse a duration string (e.g. "7d", "2h", "30m") into milliseconds.
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      // Default to 7 days if format is unrecognized
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { id: userId },
    });
  }
}

export const authService = new AuthService();
