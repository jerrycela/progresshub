import { Response } from "express";

/**
 * 統一 API 回應格式工具
 *
 * 成功回應：{ success: true, data: T, meta?: { total, page, limit } }
 * 錯誤回應：{ success: false, error: { code: string, message: string, details?: unknown } }
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: { total: number; page: number; limit: number };
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
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
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
