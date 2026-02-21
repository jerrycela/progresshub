import { Response } from "express";
import type { PaginationMeta } from "../types/shared-api";
import { env } from "../config/env";

/**
 * 統一 API 回應格式工具
 *
 * 成功回應：{ success: true, data: T, meta?: { total, page, limit } }
 * 錯誤回應：{ success: false, error: { code: string, message: string, details?: unknown } }
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendPaginatedSuccess = <T>(
  res: Response,
  data: T,
  meta: { total: number; page: number; limit: number },
  statusCode = 200,
): Response => {
  // 自動計算 hasMore：當前頁 * 每頁數量 < 總數
  const hasMore = meta.page * meta.limit < meta.total;
  return res.status(statusCode).json({
    success: true,
    data,
    meta: { ...meta, hasMore },
  });
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
): Response => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  });
};

/**
 * 取得安全的錯誤訊息
 *
 * 安全原則：
 * - 開發環境：返回原始錯誤訊息，方便除錯
 * - 生產環境：返回通用的 fallback 訊息，避免洩漏敏感資訊（如 SQL 結構、檔案路徑等）
 */
export const getSafeErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (env.NODE_ENV === "development" && error instanceof Error) {
    return error.message;
  }
  return fallback;
};
