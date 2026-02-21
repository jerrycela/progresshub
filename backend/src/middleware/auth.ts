import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import prisma from "../config/database";
import { PermissionLevel } from "@prisma/client";
import { sendError } from "../utils/response";
import { ErrorCodes } from "../types/shared-api";

export interface JwtPayload {
  userId: string;
  name: string;
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
      sendError(res, ErrorCodes.AUTH_REQUIRED, "未提供認證 Token", 401);
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verify user still exists
    const user = await prisma.employee.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      sendError(res, ErrorCodes.AUTH_INVALID_TOKEN, "無效的認證 Token", 401);
      return;
    }

    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      permissionLevel: user.permissionLevel,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, ErrorCodes.AUTH_INVALID_TOKEN, "無效的認證 Token", 401);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, ErrorCodes.AUTH_EXPIRED, "認證 Token 已過期", 401);
      return;
    }
    sendError(res, ErrorCodes.AUTH_REQUIRED, "認證失敗", 500);
  }
};

/**
 * Permission Level Authorization Middleware
 * Checks if user has required permission level
 */
export const authorize = (...allowedRoles: PermissionLevel[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, ErrorCodes.AUTH_REQUIRED, "未通過認證", 401);
      return;
    }

    if (!allowedRoles.includes(req.user.permissionLevel)) {
      sendError(res, ErrorCodes.AUTH_UNAUTHORIZED, "權限不足", 403);
      return;
    }

    next();
  };
};

/**
 * Task Resource-Level Authorization Middleware
 * Checks if user has access to modify a specific task
 * ADMIN always has access; PM has access; task creator and assignee have access
 */
export const authorizeTaskAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    sendError(res, ErrorCodes.AUTH_REQUIRED, "未通過認證", 401);
    return;
  }

  // ADMIN always has access
  if (req.user.permissionLevel === PermissionLevel.ADMIN) {
    next();
    return;
  }

  const taskId = req.params.id;
  if (!taskId) {
    sendError(res, ErrorCodes.VALIDATION_FAILED, "Missing task ID", 400);
    return;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assignedToId: true, creatorId: true, collaborators: true },
  });

  if (!task) {
    sendError(res, ErrorCodes.TASK_NOT_FOUND, "任務不存在", 404);
    return;
  }

  const userId = req.user.userId;
  const isCreator = task.creatorId === userId;
  const isAssignee = task.assignedToId === userId;
  const isCollaborator = task.collaborators.includes(userId);
  const isPM = req.user.permissionLevel === PermissionLevel.PM;

  if (isCreator || isAssignee || isCollaborator || isPM) {
    next();
    return;
  }

  sendError(res, ErrorCodes.AUTH_UNAUTHORIZED, "您沒有權限修改此任務", 403);
};

/**
 * Employee Self-Edit Authorization Middleware
 * Allows ADMIN to edit anyone, or employee to edit their own profile
 */
export const authorizeSelfOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    sendError(res, ErrorCodes.AUTH_REQUIRED, "未通過認證", 401);
    return;
  }

  if (req.user.permissionLevel === PermissionLevel.ADMIN) {
    next();
    return;
  }

  if (req.user.userId === req.params.id) {
    next();
    return;
  }

  sendError(res, ErrorCodes.AUTH_UNAUTHORIZED, "您只能編輯自己的資料", 403);
};
