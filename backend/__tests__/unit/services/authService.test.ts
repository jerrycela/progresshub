import jwt from 'jsonwebtoken';
import axios from 'axios';

// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

import prisma from '../../../src/config/database';
import { AuthService } from '../../../src/services/authService';

describe('AuthService', () => {
  const service = new AuthService();

  const mockEmployee = {
    id: 'emp-001',
    name: '測試用戶',
    email: 'test@example.com',
    slackUserId: 'U12345',
    permissionLevel: 'EMPLOYEE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: null,
    avatarUrl: null,
    functionType: null,
    isActive: true,
    lastActiveAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('應生成有效的 JWT token', () => {
      const token = service.generateToken(mockEmployee as any);

      expect(typeof token).toBe('string');
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe('emp-001');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.permissionLevel).toBe('EMPLOYEE');
    });

    it('生成的 token 應包含過期時間', () => {
      const token = service.generateToken(mockEmployee as any);

      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('應驗證有效的 token 並回傳 payload', () => {
      const token = service.generateToken(mockEmployee as any);
      const result = service.verifyToken(token);

      expect(result.userId).toBe('emp-001');
      expect(result.email).toBe('test@example.com');
      expect(result.permissionLevel).toBe('EMPLOYEE');
    });

    it('無效的 token 應拋出錯誤', () => {
      expect(() => service.verifyToken('invalid-token')).toThrow();
    });
  });

  describe('loginWithSlackCode', () => {
    const mockSlackOAuthResponse = {
      data: {
        ok: true,
        access_token: 'xoxb-test-token',
        authed_user: { id: 'U12345' },
      },
    };

    const mockSlackUserInfoResponse = {
      data: {
        ok: true,
        user: {
          real_name: '測試用戶',
          name: 'testuser',
          profile: { email: 'test@example.com' },
        },
      },
    };

    it('既有用戶應直接登入並回傳 token', async () => {
      mockedAxios.post.mockResolvedValue(mockSlackOAuthResponse);
      mockedAxios.get.mockResolvedValue(mockSlackUserInfoResponse);
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.employee.update as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.loginWithSlackCode('test-oauth-code');

      expect(result.user.id).toBe('emp-001');
      expect(result.user.name).toBe('測試用戶');
      expect(result.user.email).toBe('test@example.com');
      expect(typeof result.token).toBe('string');
      expect(prisma.employee.create).not.toHaveBeenCalled();
    });

    it('新用戶應自動註冊並回傳 token', async () => {
      mockedAxios.post.mockResolvedValue(mockSlackOAuthResponse);
      mockedAxios.get.mockResolvedValue(mockSlackUserInfoResponse);
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.employee.create as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.employee.update as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.loginWithSlackCode('test-oauth-code');

      expect(prisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slackUserId: 'U12345',
          email: 'test@example.com',
          name: '測試用戶',
          permissionLevel: 'EMPLOYEE',
        }),
      });
      expect(result.user.id).toBe('emp-001');
      expect(typeof result.token).toBe('string');
    });

    it('Slack OAuth 失敗應拋出錯誤', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { ok: false, error: 'invalid_code' },
      });

      await expect(service.loginWithSlackCode('bad-code')).rejects.toThrow(
        'Slack OAuth failed',
      );
    });
  });

  describe('getUserById', () => {
    it('應回傳指定用戶', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.getUserById('emp-001');

      expect(result).toEqual(mockEmployee);
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
      });
    });

    it('用戶不存在時應回傳 null', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });
});
