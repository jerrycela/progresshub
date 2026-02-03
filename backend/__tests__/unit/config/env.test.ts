describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error if JWT_SECRET is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => {
      require('../../../src/config/env');
    }).toThrow('JWT_SECRET must be set in production environment');
  });

  it('should use default JWT_SECRET in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    jest.resetModules();
    
    const { env } = require('../../../src/config/env');
    expect(env.JWT_SECRET).toBe('dev-only-secret-key');
  });

  it('should parse ALLOWED_ORIGINS from comma-separated string', () => {
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';
    process.env.JWT_SECRET = 'test-secret';
    
    jest.resetModules();
    const { env } = require('../../../src/config/env');
    
    expect(env.ALLOWED_ORIGINS).toEqual([
      'https://example.com',
      'https://app.example.com',
    ]);
  });

  it('should have default values for optional configs', () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'development';
    
    jest.resetModules();
    const { env } = require('../../../src/config/env');
    
    expect(env.PORT).toBe(3000);
    expect(env.JWT_EXPIRES_IN).toBe('7d');
  });
});
