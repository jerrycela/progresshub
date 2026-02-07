import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import logger from "../config/logger";
import { sendError } from "../utils/response";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errorCode: string = "APP_ERROR",
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 判斷是否為開發環境
 */
const isDevelopment = (): boolean => process.env.NODE_ENV === "development";

/**
 * 全域錯誤處理中介層
 *
 * 安全原則：
 * - AppError（預期的業務錯誤）：返回受控的錯誤訊息
 * - Prisma 錯誤：返回通用訊息，不洩露資料庫結構
 * - 未預期錯誤：生產環境只返回通用訊息，開發環境返回錯誤訊息（不含 stack trace）
 * - 所有詳細錯誤資訊僅記錄到伺服器端日誌
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // 將完整錯誤資訊記錄到伺服器端日誌，包含 stack trace
  logger.error("錯誤發生", {
    message: err.message,
    stack: err.stack,
    name: err.name,
    ...(err instanceof AppError && {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      isOperational: err.isOperational,
    }),
    ...(err instanceof Prisma.PrismaClientKnownRequestError && {
      code: err.code,
      meta: err.meta,
    }),
  });

  // 處理 AppError（預期的業務錯誤，訊息由我們控制，可安全返回）
  if (err instanceof AppError) {
    sendError(res, err.errorCode, err.message, err.statusCode);
    return;
  }

  // 處理 Prisma 已知請求錯誤（返回通用訊息，不洩露資料庫細節）
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一約束衝突
    if (err.code === "P2002") {
      sendError(res, "DUPLICATE_ENTRY", "資料重複，該記錄已存在", 409);
      return;
    }

    // 記錄不存在
    if (err.code === "P2025") {
      sendError(res, "NOT_FOUND", "找不到指定的記錄", 404);
      return;
    }

    // 外鍵約束衝突
    if (err.code === "P2003") {
      sendError(res, "INVALID_REFERENCE", "關聯的記錄參照無效", 400);
      return;
    }

    // 其他 Prisma 已知錯誤，返回通用資料庫錯誤訊息
    sendError(res, "DATABASE_ERROR", "資料庫操作失敗", 500);
    return;
  }

  // 處理 Prisma 驗證錯誤
  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, "VALIDATION_ERROR", "提供的資料格式無效", 400);
    return;
  }

  // 處理其他 Prisma 錯誤（初始化錯誤、Rust 引擎錯誤等）
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    sendError(res, "DATABASE_ERROR", "資料庫操作失敗", 500);
    return;
  }

  // 未預期的錯誤：生產環境返回通用訊息，開發環境返回錯誤訊息（不含 stack trace）
  const clientMessage = isDevelopment() ? err.message : "伺服器內部錯誤";

  sendError(res, "INTERNAL_ERROR", clientMessage, 500);
};

/**
 * 404 路由未找到處理器
 *
 * 安全原則：不返回請求路徑，避免洩露路由結構
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  sendError(res, "ROUTE_NOT_FOUND", "找不到請求的路由", 404);
};
