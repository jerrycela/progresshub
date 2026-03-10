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

// Simple auth cache to avoid DB lookup on every request
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const AUTH_CACHE_MAX_ENTRIES = 500;
const authCache = new Map<
  string,
  { user: JwtPayload & { isActive: boolean }; cachedAt: number }
>();

// Clean expired entries periodically (unref so it doesn't block process exit)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of authCache) {
    if (now - entry.cachedAt > AUTH_CACHE_TTL) {
      authCache.delete(key);
    }
  }
}, 60_000).unref();

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

    const cached = authCache.get(decoded.userId);
    const now = Date.now();

    if (cached && now - cached.cachedAt < AUTH_CACHE_TTL) {
      if (!cached.user.isActive) {
        sendError(res, ErrorCodes.AUTH_INVALID_TOKEN, "無效的認證 Token", 401);
        return;
      }
      req.user = {
        userId: decoded.userId,
        name: cached.user.name,
        email: cached.user.email,
        permissionLevel: cached.user.permissionLevel,
      };
      next();
      return;
    }

    // Cache miss — query DB
    const user = await prisma.employee.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      sendError(res, ErrorCodes.AUTH_INVALID_TOKEN, "無效的認證 Token", 401);
      return;
    }

    // Evict oldest entries if cache is full
    if (authCache.size >= AUTH_CACHE_MAX_ENTRIES) {
      const entries = Array.from(authCache.entries());
      entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
      for (let i = 0; i < 100; i++) {
        authCache.delete(entries[i][0]);
      }
    }

    // Update cache
    authCache.set(decoded.userId, {
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        permissionLevel: user.permissionLevel,
        isActive: user.isActive,
      },
      cachedAt: now,
    });

    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email,
      permissionLevel: user.permissionLevel,
    };

    next();
  } catch (error) {
    // TokenExpiredError must be checked before JsonWebTokenError (it's a subclass)
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, ErrorCodes.AUTH_EXPIRED, "認證 Token 已過期", 401);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, ErrorCodes.AUTH_INVALID_TOKEN, "無效的認證 Token", 401);
      return;
    }
    sendError(res, ErrorCodes.SERVER_ERROR, "認證失敗", 500);
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
  try {
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
  } catch (error) {
    next(error);
  }
};

/**
 * Project Membership Check Utility
 * Returns true if user is ADMIN or a member of the specified project.
 * Use in route handlers (not middleware) for flexible per-endpoint logic.
 */
export const isProjectMember = async (
  userId: string,
  projectId: string,
  permissionLevel: PermissionLevel,
): Promise<boolean> => {
  if (permissionLevel === PermissionLevel.ADMIN) return true;

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_employeeId: {
        projectId,
        employeeId: userId,
      },
    },
  });

  return !!membership;
};

/**
 * Employee Self-Edit Authorization Middleware
 * Allows ADMIN to edit anyone, MANAGER to attempt editing others (business logic
 * in the route handler enforces MANAGER can only edit EMPLOYEE-level accounts),
 * or employee to edit their own profile.
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

  // MANAGER can pass through; the route handler enforces target-account restrictions
  if (req.user.permissionLevel === PermissionLevel.MANAGER) {
    next();
    return;
  }

  if (req.user.userId === req.params.id) {
    next();
    return;
  }

  sendError(res, ErrorCodes.AUTH_UNAUTHORIZED, "您只能編輯自己的資料", 403);
};
