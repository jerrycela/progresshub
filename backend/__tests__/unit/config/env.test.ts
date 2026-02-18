// Mock dotenv 以避免 .env 檔案干擾測試
// dotenv.config() 會在每次 require('env.ts') 時從 .env 讀值覆蓋 process.env
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('生產環境未設定 JWT_SECRET 應拋出錯誤', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => {
      require('../../../src/config/env');
    }).toThrow('JWT_SECRET 環境變數未設定');
  });

  it('生產環境未設定 JWT_REFRESH_SECRET 應拋出錯誤', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'prod-secret';
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => {
      require('../../../src/config/env');
    }).toThrow('JWT_REFRESH_SECRET 環境變數未設定');
  });

  it('開發環境應使用預設 JWT_SECRET', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    const { env } = require('../../../src/config/env');
    expect(env.JWT_SECRET).toBe('dev-only-secret-key');
  });

  it('開發環境應使用預設 JWT_REFRESH_SECRET', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_REFRESH_SECRET;

    const { env } = require('../../../src/config/env');
    expect(env.JWT_REFRESH_SECRET).toBe('dev-only-refresh-secret-key');
  });

  it('應正確解析逗號分隔的 ALLOWED_ORIGINS', () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
    process.env.JWT_SECRET = 'test-secret';

    const { env } = require('../../../src/config/env');

    expect(env.ALLOWED_ORIGINS).toEqual([
      'https://example.com',
      'https://app.example.com',
    ]);
  });

  it('選填設定應有預設值', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.PORT;

    const { env } = require('../../../src/config/env');

    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('2h');
  });

  it('ALLOWED_ORIGINS 未設定時應回傳空陣列', () => {
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.ALLOWED_ORIGINS;

    const { env } = require('../../../src/config/env');

    expect(env.ALLOWED_ORIGINS).toEqual([]);
  });
});
