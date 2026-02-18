// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gitLabConnection: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    gitLabInstance: {
      findFirst: jest.fn(),
      create: jest.fn(),
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

import prisma from '../../../src/config/database';
import { UserSettingsService } from '../../../src/services/userSettingsService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('UserSettingsService', () => {
  const service = new UserSettingsService();

  const mockEmployee = {
    id: 'emp-001',
    name: '測試員工',
    email: 'test@example.com',
    avatarUrl: null,
    permissionLevel: 'EMPLOYEE',
    functionType: 'PROGRAMMING',
    isActive: true,
    lastActiveAt: null,
    department: '工程部',
    slackUserId: 'U12345',
    managedProjects: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
  };

  const mockGitLabConn = {
    id: 'gl-001',
    gitlabUsername: 'testuser',
    gitlabUserId: 12345,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('應回傳含 GitLab 連結的使用者設定 DTO', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(mockGitLabConn);

      const result = await service.getSettings('emp-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-001');
      expect(result!.name).toBe('測試員工');
      expect(result!.role).toBe('EMPLOYEE');
      expect(result!.gitlabUsername).toBe('testuser');
      expect(result!.gitlabId).toBe('12345');
      expect(result!.slackId).toBe('U12345');
    });

    it('無 GitLab 連結時應回傳 undefined gitlabId', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSettings('emp-001');

      expect(result!.gitlabId).toBeUndefined();
      expect(result!.gitlabUsername).toBeUndefined();
    });

    it('員工不存在時回傳 null', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getSettings('nonexistent');

      expect(result).toBeNull();
    });

    it('有 slackUserId 時應生成 slackUsername', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getSettings('emp-001');

      expect(result!.slackUsername).toBe('@測試員工');
    });
  });

  describe('updateSettings', () => {
    it('應更新使用者名稱和 email', async () => {
      (mockedPrisma.employee.update as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        name: '新名稱',
      });
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.updateSettings('emp-001', { name: '新名稱' });

      expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: { name: '新名稱' },
      });
      expect(result).not.toBeNull();
    });

    it('應更新 avatarUrl', async () => {
      (mockedPrisma.employee.update as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await service.updateSettings('emp-001', { avatar: 'https://example.com/avatar.jpg' });

      expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: { avatarUrl: 'https://example.com/avatar.jpg' },
      });
    });
  });

  describe('linkGitLab', () => {
    it('已有連結時應更新 username', async () => {
      const existingConn = { id: 'gl-001', gitlabUsername: 'old' };
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingConn) // 第一次：檢查是否已有連結
        .mockResolvedValueOnce(mockGitLabConn); // 第二次：getSettings 中的查詢
      (mockedPrisma.gitLabConnection.update as jest.Mock).mockResolvedValue({});
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      await service.linkGitLab('emp-001', 'newuser');

      expect(mockedPrisma.gitLabConnection.update).toHaveBeenCalledWith({
        where: { id: 'gl-001' },
        data: { gitlabUsername: 'newuser' },
      });
    });

    it('無連結且有 instance 時應建立新連結', async () => {
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // 第一次：無既有連結
        .mockResolvedValueOnce(mockGitLabConn); // 第二次：getSettings
      (mockedPrisma.gitLabInstance.findFirst as jest.Mock).mockResolvedValue({
        id: 'inst-001',
      });
      (mockedPrisma.gitLabConnection.create as jest.Mock).mockResolvedValue({});
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      await service.linkGitLab('emp-001', 'newuser');

      expect(mockedPrisma.gitLabConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employeeId: 'emp-001',
          instanceId: 'inst-001',
          gitlabUsername: 'newuser',
        }),
      });
    });

    it('無 instance 時應先建立預設 instance', async () => {
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (mockedPrisma.gitLabInstance.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.gitLabInstance.create as jest.Mock).mockResolvedValue({
        id: 'new-inst',
      });
      (mockedPrisma.gitLabConnection.create as jest.Mock).mockResolvedValue({});
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      await service.linkGitLab('emp-001', 'newuser');

      expect(mockedPrisma.gitLabInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Default GitLab (manual-link)',
          baseUrl: 'https://gitlab.com',
          clientId: 'placeholder-not-configured',
          clientSecret: 'placeholder-not-configured',
        }),
      });
    });
  });

  describe('unlinkGitLab', () => {
    it('應軟刪除 GitLab 連結', async () => {
      (mockedPrisma.gitLabConnection.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await service.unlinkGitLab('emp-001');

      expect(mockedPrisma.gitLabConnection.updateMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp-001', isActive: true },
        data: { isActive: false },
      });
    });
  });

  describe('linkSlack', () => {
    it('應設定合成的 slackUserId', async () => {
      (mockedPrisma.employee.update as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await service.linkSlack('emp-001', 'testuser');

      expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: { slackUserId: 'placeholder-manual-link' },
      });
    });
  });

  describe('unlinkSlack', () => {
    it('應清除 slackUserId', async () => {
      (mockedPrisma.employee.update as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        slackUserId: null,
      });
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        slackUserId: null,
      });
      (mockedPrisma.gitLabConnection.findFirst as jest.Mock).mockResolvedValue(null);

      await service.unlinkSlack('emp-001');

      expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: { slackUserId: null },
      });
    });
  });
});
