import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import prisma from "../config/database";
import { PermissionLevel } from "@prisma/client";
import { sendError } from "../utils/response";

export interface JwtPayload {
  userId: string;
  email: string;
  permissionLevel: PermissionLevel;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendError(res, "AUTH_REQUIRED", "未提供認證 Token", 401);
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verify user still exists
    const user = await prisma.employee.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      sendError(res, "AUTH_INVALID_TOKEN", "無效的認證 Token", 401);
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      permissionLevel: user.permissionLevel,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, "AUTH_INVALID_TOKEN", "無效的認證 Token", 401);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, "AUTH_EXPIRED", "認證 Token 已過期", 401);
      return;
    }
    sendError(res, "AUTH_REQUIRED", "認證失敗", 500);
  }
};

/**
 * Permission Level Authorization Middleware
 * Checks if user has required permission level
 */
export const authorize = (...allowedRoles: PermissionLevel[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "AUTH_REQUIRED", "未通過認證", 401);
      return;
    }

    if (!allowedRoles.includes(req.user.permissionLevel)) {
      sendError(res, "AUTH_FORBIDDEN", "權限不足", 403);
      return;
    }

    next();
  };
};
