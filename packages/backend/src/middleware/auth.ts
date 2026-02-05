import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { AppError } from '../utils/AppError'
import type { JwtPayload } from '../types/auth'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new AppError('AUTH_REQUIRED', '需要登入才能存取', 401)
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      throw new AppError('AUTH_REQUIRED', '需要登入才能存取', 401)
    }

    const decoded = verifyAccessToken(token)
    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof AppError) {
      next(error)
    } else {
      next(new AppError('AUTH_INVALID_TOKEN', 'Token 無效或已過期', 401))
    }
  }
}

export function authorize(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('AUTH_REQUIRED', '需要登入才能存取', 401))
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('PERM_DENIED', '權限不足', 403))
      return
    }

    next()
  }
}
