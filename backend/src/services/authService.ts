import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';
import { Employee, PermissionLevel } from '@prisma/client';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    permissionLevel: PermissionLevel;
  };
}

export class AuthService {
  /**
   * 透過 Slack User ID 登入或註冊
   */
  async loginWithSlack(
    slackUserId: string,
    email: string,
    name: string
  ): Promise<LoginResult> {
    let employee = await prisma.employee.findUnique({
      where: { slackUserId },
    });

    // 如果員工不存在，自動註冊
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          slackUserId,
          email,
          name,
          permissionLevel: PermissionLevel.EMPLOYEE,
        },
      });
    }

    const token = this.generateToken(employee);

    return {
      token,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        permissionLevel: employee.permissionLevel,
      },
    };
  }

  /**
   * 產生 JWT Token
   */
  generateToken(employee: Employee): string {
    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as string,
    };
    return jwt.sign(
      {
        userId: employee.id,
        email: employee.email,
        permissionLevel: employee.permissionLevel,
      },
      env.JWT_SECRET,
      options
    );
  }

  /**
   * 驗證 Token
   */
  verifyToken(token: string): { userId: string; email: string; permissionLevel: PermissionLevel } {
    return jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      permissionLevel: PermissionLevel;
    };
  }

  /**
   * 取得使用者資訊
   */
  async getUserById(userId: string): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { id: userId },
    });
  }
}

export const authService = new AuthService();
