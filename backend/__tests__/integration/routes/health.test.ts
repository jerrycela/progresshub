import express from 'express';
import request from 'supertest';

// Mock database 模組
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

// Mock logger 以避免測試時產生日誌輸出
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
  },
  httpLogStream: {
    write: jest.fn(),
  },
}));

import prisma from '../../../src/config/database';
import healthRoutes from '../../../src/routes/health';

describe('Health Routes', () => {
  const app = express();
  app.use('/health', healthRoutes);

  describe('GET /health', () => {
    it('應回傳 200 和基本健康狀態（包裹在統一格式中）', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'ok');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(typeof response.body.data.uptime).toBe('number');
    });

    it('回傳的 timestamp 應為有效的 ISO 格式', async () => {
      const response = await request(app).get('/health');

      const date = new Date(response.body.data.timestamp);
      expect(date.toISOString()).toBe(response.body.data.timestamp);
    });
  });

  describe('GET /health/ready', () => {
    it('應在資料庫連線正常時回傳 200', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'ready');
      expect(response.body.data).toHaveProperty('database', 'connected');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('應在資料庫連線失敗時回傳 503', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code', 'SERVICE_NOT_READY');
      expect(response.body.error).toHaveProperty('message', 'Service not ready');
      expect(response.body.error.details).toHaveProperty('database', 'disconnected');
    });
  });

  describe('GET /health/live', () => {
    it('應回傳 200 和存活狀態', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'alive');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).not.toHaveProperty('memory');
    });
  });
});
