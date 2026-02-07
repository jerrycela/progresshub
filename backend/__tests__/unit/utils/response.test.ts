import { Response } from 'express';
import { sendSuccess, sendPaginatedSuccess, sendError } from '../../../src/utils/response';

describe('Response Utils', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('sendSuccess', () => {
    it('應回傳 200 和 success: true 格式', () => {
      const data = { id: 1, name: '測試' };

      sendSuccess(mockResponse as Response, data);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: '測試' },
      });
    });

    it('應支援自訂 statusCode', () => {
      sendSuccess(mockResponse as Response, { created: true }, 201);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { created: true },
      });
    });

    it('應正確處理 null data', () => {
      sendSuccess(mockResponse as Response, null);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    it('應正確處理陣列 data', () => {
      const items = [{ id: 1 }, { id: 2 }];
      sendSuccess(mockResponse as Response, items);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
      });
    });
  });

  describe('sendPaginatedSuccess', () => {
    it('應回傳包含 meta 的分頁格式', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { total: 50, page: 1, limit: 10 };

      sendPaginatedSuccess(mockResponse as Response, data, meta);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: { total: 50, page: 1, limit: 10, hasMore: true },
      });
    });

    it('應支援自訂 statusCode', () => {
      const meta = { total: 0, page: 1, limit: 10 };

      sendPaginatedSuccess(mockResponse as Response, [], meta, 200);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('sendError', () => {
    it('應回傳 success: false 和錯誤格式', () => {
      sendError(mockResponse as Response, 'NOT_FOUND', '找不到資源', 404);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'NOT_FOUND', message: '找不到資源' },
      });
    });

    it('預設 statusCode 應為 400', () => {
      sendError(mockResponse as Response, 'VALIDATION_ERROR', '驗證失敗');

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('應支援附加 details', () => {
      sendError(
        mockResponse as Response,
        'VALIDATION_ERROR',
        '驗證失敗',
        400,
        { field: 'email', reason: '格式無效' },
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '驗證失敗',
          details: { field: 'email', reason: '格式無效' },
        },
      });
    });

    it('details 為 undefined 時不應包含在回應中', () => {
      sendError(mockResponse as Response, 'ERROR', '錯誤', 500);

      const jsonArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.error).not.toHaveProperty('details');
    });
  });
});
