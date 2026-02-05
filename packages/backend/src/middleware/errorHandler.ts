import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // AppError - 預期的錯誤
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    })
  }

  // 未預期的錯誤
  console.error('Unexpected error:', err)

  return res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? '伺服器錯誤'
        : err.message
    }
  })
}
