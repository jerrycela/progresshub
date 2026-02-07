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

    expect(() => {
      require('../../../src/config/env');
    }).toThrow('JWT_SECRET 環境變數未設定');
  });

  it('開發環境應使用預設 JWT_SECRET', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    jest.resetModules();

    const { env } = require('../../../src/config/env');
    expect(env.JWT_SECRET).toBe('dev-only-secret-key');
  });

  it('應正確解析逗號分隔的 ALLOWED_ORIGINS', () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
    process.env.JWT_SECRET = 'test-secret';

    jest.resetModules();
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

    jest.resetModules();
    const { env } = require('../../../src/config/env');

    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('24h');
  });
});
