import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, PermissionLevel } from '@prisma/client';
import { HttpError } from './errorHandler';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    slackUserId: string;
    permissionLevel: PermissionLevel;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError('未提供認證令牌', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret';

    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.employee.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        slackUserId: true,
        permissionLevel: true,
      },
    });

    if (!user) {
      throw new HttpError('用戶不存在', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpError('無效的認證令牌', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new HttpError('認證令牌已過期', 401));
    } else {
      next(error);
    }
  }
};

export const requirePermission = (...allowedLevels: PermissionLevel[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError('未認證', 401));
    }

    if (!allowedLevels.includes(req.user.permissionLevel)) {
      return next(new HttpError('權限不足', 403));
    }

    next();
  };
};

export const requirePM = requirePermission(PermissionLevel.PM, PermissionLevel.ADMIN);
export const requireAdmin = requirePermission(PermissionLevel.ADMIN);
