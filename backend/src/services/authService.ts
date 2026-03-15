import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import prisma from "../config/database";
import { env } from "../config/env";
import { Employee, PermissionLevel } from "@prisma/client";
import { toUserDTO, UserDTO } from "../mappers";
import { AppError } from "../middleware/errorHandler";

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: UserDTO;
}

export class AuthService {
  /**
   * Generate a cryptographically random OAuth state parameter for CSRF protection.
   * Persists state to database for multi-node compatibility.
   */
  async generateOAuthState(): Promise<string> {
    // 5% chance: clean up expired states
    if (Math.random() < 0.05) {
      await prisma.oAuthState.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
    }
    const state = crypto.randomBytes(32).toString("hex");
    await prisma.oAuthState.create({
      data: {
        state,
        provider: "slack",
        payload: {},
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });
    return state;
  }

  /**
   * Verify and consume a one-time OAuth state parameter.
   * Returns true if the state is valid and not expired.
   */
  async verifyOAuthState(state: string): Promise<boolean> {
    try {
      const record = await prisma.oAuthState.delete({
        where: { state },
      });
      return record.expiresAt > new Date();
    } catch {
      return false; // Not found or already consumed
    }
  }

  /**
   * Slack OAuth Code Exchange login
   * Frontend sends the OAuth `code`, backend exchanges it for user identity
   */
  async loginWithSlackCode(code: string): Promise<LoginResult> {
    const tokenResponse = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID || "",
        client_secret: env.SLACK_CLIENT_SECRET || "",
        code,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

    // Validate Slack workspace to prevent cross-workspace login
    if (env.SLACK_TEAM_ID) {
      const teamId = tokenResponse.data.team?.id;
      if (!teamId || teamId !== env.SLACK_TEAM_ID) {
        throw new AppError(403, "This Slack workspace is not authorized");
      }
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
    // Defense-in-depth: cap permission to EMPLOYEE in production
    // (route layer also caps, but service adds second barrier)
    if (process.env.NODE_ENV === "production") {
      permissionLevel = PermissionLevel.EMPLOYEE;
    }

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

    // ADMIN has global access — skip project membership entirely
    if (permissionLevel !== PermissionLevel.ADMIN) {
      await prisma.projectMember.deleteMany({
        where: { employeeId: employee.id },
      });

      // Auto-assign active projects for demo accounts when none selected
      const effectiveProjectIds =
        projectIds && projectIds.length > 0
          ? projectIds
          : (
              await prisma.project.findMany({
                where: { status: "ACTIVE" },
                select: { id: true },
                take: 5,
              })
            ).map((p) => p.id);

      if (effectiveProjectIds.length > 0) {
        await prisma.projectMember.createMany({
          data: effectiveProjectIds.map((projectId) => ({
            projectId,
            employeeId: employee.id,
          })),
          skipDuplicates: true,
        });
      }
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
        name: employee.name,
        email: employee.email,
        permissionLevel: employee.permissionLevel,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN, algorithm: "HS256" } as SignOptions,
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
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as {
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
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
        algorithm: "HS256",
      } as SignOptions,
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
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as {
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
   * Atomic rotation: delete old token and create new one in the same transaction
   * to prevent replay attacks where two concurrent requests use the same token.
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    // Verify JWT signature first (outside transaction — no DB needed)
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as { userId: string; type: string };

    if (decoded.type !== "refresh") {
      throw new AppError(401, "Invalid token type");
    }

    // Atomic rotation: delete old + verify employee + create new in one transaction
    return prisma.$transaction(async (tx) => {
      // Conditionally delete — if count === 0, token was already consumed
      const deleted = await tx.refreshToken.deleteMany({
        where: { token: refreshToken },
      });

      if (deleted.count === 0) {
        throw new AppError(
          401,
          "Refresh token has been revoked or already used",
        );
      }

      const employee = await tx.employee.findUnique({
        where: { id: decoded.userId },
      });

      if (!employee || !employee.isActive) {
        throw new AppError(401, "User not found or account is disabled");
      }

      // Generate new tokens
      const newAccessToken = this.generateToken(employee);

      const expiresInMs = this.parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
      const expiresAt = new Date(Date.now() + expiresInMs);

      const newRefreshToken = jwt.sign(
        { userId: employee.id, type: "refresh" },
        env.JWT_REFRESH_SECRET,
        {
          expiresIn: env.JWT_REFRESH_EXPIRES_IN,
          algorithm: "HS256",
        } as SignOptions,
      );

      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: employee.id,
          expiresAt,
        },
      });

      return { token: newAccessToken, refreshToken: newRefreshToken };
    });
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
