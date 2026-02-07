import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// Mock logger 以避免測試時產生日誌輸出
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { AppError, errorHandler, notFoundHandler } from '../../../src/middleware/errorHandler';

describe('ErrorHandler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('AppError class', () => {
    it('應正確建立 AppError 實例並設定屬性', () => {
      const error = new AppError(400, '測試錯誤');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('測試錯誤');
      expect(error.errorCode).toBe('APP_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('應允許自訂 errorCode', () => {
      const error = new AppError(400, '驗證失敗', 'VALIDATION_ERROR');

      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('應允許自訂 isOperational 為 false', () => {
      const error = new AppError(500, '系統錯誤', 'SYSTEM_ERROR', false);

      expect(error.isOperational).toBe(false);
    });

    it('應保留正確的 prototype chain', () => {
      const error = new AppError(404, 'Not Found');

      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('應正確處理 AppError 並使用統一回應格式', () => {
      const error = new AppError(400, '無效的請求參數', 'INVALID_REQUEST');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '無效的請求參數' },
      });
    });

    it('應正確處理 AppError 404', () => {
      const error = new AppError(404, '找不到資源', 'NOT_FOUND');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'NOT_FOUND', message: '找不到資源' },
      });
    });

    it('應正確處理 Prisma P2002 唯一約束衝突', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.8.0' },
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: '資料重複，該記錄已存在' },
      });
    });

    it('應正確處理 Prisma P2025 記錄不存在', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        { code: 'P2025', clientVersion: '5.8.0' },
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'NOT_FOUND', message: '找不到指定的記錄' },
      });
    });

    it('應正確處理 Prisma P2003 外鍵約束衝突', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.8.0' },
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INVALID_REFERENCE', message: '關聯的記錄參照無效' },
      });
    });

    it('應正確處理其他 Prisma 已知錯誤並回傳 500', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Some other error',
        { code: 'P2000', clientVersion: '5.8.0' },
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'DATABASE_ERROR', message: '資料庫操作失敗' },
      });
    });

    it('應正確處理 Prisma 驗證錯誤', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Validation failed',
        { clientVersion: '5.8.0' },
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '提供的資料格式無效' },
      });
    });

    it('應在開發環境下回傳錯誤訊息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('未預期的錯誤');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '未預期的錯誤' },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('應在生產環境下回傳通用錯誤訊息', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('敏感的內部錯誤資訊');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '伺服器內部錯誤' },
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('應回傳 404 和找不到路由的訊息', () => {
      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'ROUTE_NOT_FOUND', message: '找不到請求的路由' },
      });
    });
  });
});
