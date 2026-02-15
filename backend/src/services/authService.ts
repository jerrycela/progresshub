import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import prisma from "../config/database";
import { env } from "../config/env";
import { Employee, PermissionLevel } from "@prisma/client";
import { toUserDTO, UserDTO } from "../mappers";

// TODO: 將 OAuth state 存儲遷移到 Redis，目前使用記憶體 Map 在多進程/多節點部署時會導致驗證失敗
const OAUTH_STATE_MAX_COUNT = 1000;
const STATE_TTL = 10 * 60 * 1000; // 10 minutes
const oauthStates = new Map<string, { expiresAt: number }>();

// In-memory refresh token store
// NOTE: 生產環境應使用 Redis 或資料庫持久化存儲，記憶體存儲在重啟或多節點部署時會失效
const REFRESH_TOKEN_MAX_COUNT = 10000;
const refreshTokenStore = new Map<
  string,
  { userId: string; expiresAt: number }
>();

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
      throw new Error("OAuth state storage is full, please try again later");
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
      throw new Error(
        `Slack OAuth failed: ${tokenResponse.data.error || "unknown error"}`,
      );
    }

    const { authed_user } = tokenResponse.data;
    if (!authed_user?.id) {
      throw new Error("Slack OAuth: missing user identity");
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

    // Update last active
    await prisma.employee.update({
      where: { id: employee.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.generateToken(employee);
    const refreshToken = this.generateRefreshToken(employee);
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
      throw new Error(`Employee with email ${email} not found`);
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
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    return this.completeDevLogin(employee);
  }

  private async completeDevLogin(employee: Employee): Promise<LoginResult> {
    if (!employee.isActive) {
      throw new Error("Account is disabled");
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.generateToken(employee);
    const refreshToken = this.generateRefreshToken(employee);
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
   * Generate a refresh token (long-lived) and store it in-memory.
   * The refresh token itself is a JWT signed with a separate secret.
   */
  generateRefreshToken(employee: Employee): string {
    // Cleanup expired tokens
    const now = Date.now();
    for (const [key, value] of refreshTokenStore.entries()) {
      if (now > value.expiresAt) {
        refreshTokenStore.delete(key);
      }
    }

    if (refreshTokenStore.size >= REFRESH_TOKEN_MAX_COUNT) {
      // Evict oldest entries when store is full
      const entries = Array.from(refreshTokenStore.entries());
      entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = Math.floor(REFRESH_TOKEN_MAX_COUNT * 0.1);
      for (let i = 0; i < toRemove; i++) {
        refreshTokenStore.delete(entries[i][0]);
      }
    }

    const refreshToken = jwt.sign(
      {
        userId: employee.id,
        type: "refresh",
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions,
    );

    // Parse expiry from JWT_REFRESH_EXPIRES_IN for the in-memory store
    const expiresInMs = this.parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
    refreshTokenStore.set(refreshToken, {
      userId: employee.id,
      expiresAt: now + expiresInMs,
    });

    return refreshToken;
  }

  /**
   * Verify a refresh token: check JWT signature and ensure it exists in the store.
   */
  verifyRefreshToken(token: string): { userId: string } {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    // Check if the token is in the store (not revoked)
    const stored = refreshTokenStore.get(token);
    if (!stored) {
      throw new Error("Refresh token has been revoked or is invalid");
    }

    if (Date.now() > stored.expiresAt) {
      refreshTokenStore.delete(token);
      throw new Error("Refresh token has expired");
    }

    return { userId: decoded.userId };
  }

  /**
   * Revoke a specific refresh token (used during logout).
   */
  revokeRefreshToken(token: string): void {
    refreshTokenStore.delete(token);
  }

  /**
   * Revoke all refresh tokens for a given user.
   */
  revokeAllUserRefreshTokens(userId: string): void {
    for (const [key, value] of refreshTokenStore.entries()) {
      if (value.userId === userId) {
        refreshTokenStore.delete(key);
      }
    }
  }

  /**
   * Use a refresh token to generate a new access token.
   * The old refresh token remains valid (rotation is optional).
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const { userId } = this.verifyRefreshToken(refreshToken);

    const employee = await prisma.employee.findUnique({
      where: { id: userId },
    });

    if (!employee || !employee.isActive) {
      this.revokeRefreshToken(refreshToken);
      throw new Error("User not found or account is disabled");
    }

    // Revoke old refresh token and issue a new one (token rotation)
    this.revokeRefreshToken(refreshToken);

    const newAccessToken = this.generateToken(employee);
    const newRefreshToken = this.generateRefreshToken(employee);

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
