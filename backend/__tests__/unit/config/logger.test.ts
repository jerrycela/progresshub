describe('Logger Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('應成功建立 logger 實例', () => {
    process.env.NODE_ENV = 'development';

    const { logger } = require('../../../src/config/logger');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('開發環境應使用 debug 等級', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_LEVEL;

    const { logger } = require('../../../src/config/logger');

    expect(logger.level).toBe('debug');
  });

  it('生產環境應使用 info 等級', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LOG_LEVEL;

    const { logger } = require('../../../src/config/logger');

    expect(logger.level).toBe('info');
  });

  it('應尊重自訂 LOG_LEVEL 環境變數', () => {
    process.env.LOG_LEVEL = 'warn';

    const { logger } = require('../../../src/config/logger');

    expect(logger.level).toBe('warn');
  });

  it('應設定 defaultMeta 為 progresshub-backend', () => {
    const { logger } = require('../../../src/config/logger');

    expect(logger.defaultMeta).toEqual({ service: 'progresshub-backend' });
  });

  it('生產環境應有檔案日誌 transport', () => {
    process.env.NODE_ENV = 'production';

    const { logger } = require('../../../src/config/logger');

    // 生產環境有 Console + 2 個 File transport
    const transportCount = logger.transports.length;
    expect(transportCount).toBe(3);
  });

  it('開發環境應只有 Console transport', () => {
    process.env.NODE_ENV = 'development';

    const { logger } = require('../../../src/config/logger');

    expect(logger.transports.length).toBe(1);
  });

  describe('httpLogStream', () => {
    it('應提供 write 方法', () => {
      const { httpLogStream } = require('../../../src/config/logger');

      expect(httpLogStream).toBeDefined();
      expect(typeof httpLogStream.write).toBe('function');
    });

    it('write 方法應呼叫 logger.http 並去除尾端空白', () => {
      const { logger, httpLogStream } = require('../../../src/config/logger');
      const httpSpy = jest.spyOn(logger, 'http').mockImplementation(() => logger);

      httpLogStream.write('GET /health 200 5ms\n');

      expect(httpSpy).toHaveBeenCalledWith('GET /health 200 5ms');
    });
  });
});
