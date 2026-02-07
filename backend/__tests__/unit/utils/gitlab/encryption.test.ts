describe('GitLab Encryption Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.GITLAB_ENCRYPTION_KEY = 'test-encryption-key-for-testing';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('encrypt', () => {
    it('應成功加密字串', () => {
      const { encrypt } = require('../../../../src/utils/gitlab/encryption');

      const encrypted = encrypt('my-secret-token');

      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe('my-secret-token');
    });

    it('加密結果應包含 iv:tag:encrypted 格式', () => {
      const { encrypt } = require('../../../../src/utils/gitlab/encryption');

      const encrypted = encrypt('test-data');
      const parts = encrypted.split(':');

      expect(parts.length).toBe(3);
      // iv 為 16 bytes = 32 hex chars
      expect(parts[0].length).toBe(32);
      // tag 為 16 bytes = 32 hex chars
      expect(parts[1].length).toBe(32);
      // encrypted data 長度大於 0
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('相同輸入每次加密結果應不同（因為 random IV）', () => {
      const { encrypt } = require('../../../../src/utils/gitlab/encryption');

      const encrypted1 = encrypt('same-text');
      const encrypted2 = encrypt('same-text');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('未設定 GITLAB_ENCRYPTION_KEY 時應拋出錯誤', () => {
      delete process.env.GITLAB_ENCRYPTION_KEY;
      jest.resetModules();

      const { encrypt } = require('../../../../src/utils/gitlab/encryption');

      expect(() => encrypt('test')).toThrow(
        'GITLAB_ENCRYPTION_KEY environment variable is required',
      );
    });
  });

  describe('decrypt', () => {
    it('應成功解密加密過的字串', () => {
      const { encrypt, decrypt } = require('../../../../src/utils/gitlab/encryption');

      const original = 'my-secret-token-12345';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('應正確處理空字串', () => {
      const { encrypt, decrypt } = require('../../../../src/utils/gitlab/encryption');

      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('應正確處理含特殊字元的字串', () => {
      const { encrypt, decrypt } = require('../../../../src/utils/gitlab/encryption');

      const original = 'glpat-ABCdef_123!@#$%';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('格式無效時應拋出錯誤', () => {
      const { decrypt } = require('../../../../src/utils/gitlab/encryption');

      expect(() => decrypt('invalid-format')).toThrow(
        'Invalid encrypted text format',
      );
    });

    it('只有兩段時應拋出錯誤', () => {
      const { decrypt } = require('../../../../src/utils/gitlab/encryption');

      expect(() => decrypt('part1:part2')).toThrow(
        'Invalid encrypted text format',
      );
    });
  });

  describe('secureCompare', () => {
    it('相同字串應回傳 true', () => {
      const { secureCompare } = require('../../../../src/utils/gitlab/encryption');

      expect(secureCompare('abc123', 'abc123')).toBe(true);
    });

    it('不同字串應回傳 false', () => {
      const { secureCompare } = require('../../../../src/utils/gitlab/encryption');

      expect(secureCompare('abc123', 'abc124')).toBe(false);
    });

    it('長度不同的字串應回傳 false', () => {
      const { secureCompare } = require('../../../../src/utils/gitlab/encryption');

      expect(secureCompare('short', 'much-longer-string')).toBe(false);
    });

    it('空字串比較應回傳 true', () => {
      const { secureCompare } = require('../../../../src/utils/gitlab/encryption');

      expect(secureCompare('', '')).toBe(true);
    });
  });
});
