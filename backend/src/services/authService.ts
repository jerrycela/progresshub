import jwt, { SignOptions } from "jsonwebtoken";
import axios from "axios";
import prisma from "../config/database";
import { env } from "../config/env";
import { Employee, PermissionLevel } from "@prisma/client";
import { toUserDTO, UserDTO } from "../mappers";

export interface LoginResult {
  token: string;
  user: UserDTO;
}

export class AuthService {
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
    return { token, user: toUserDTO(employee) };
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

    if (!employee.isActive) {
      throw new Error("Account is disabled");
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.generateToken(employee);
    return { token, user: toUserDTO(employee) };
  }

  /**
   * Generate JWT Token
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
   * Verify Token
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
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { id: userId },
    });
  }
}

export const authService = new AuthService();
