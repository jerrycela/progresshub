// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
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

import prisma from '../../../src/config/database';
import { EmployeeService } from '../../../src/services/employeeService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('EmployeeService', () => {
  const service = new EmployeeService();

  const mockEmployee = {
    id: 'emp-001',
    name: '測試員工',
    email: 'test@example.com',
    slackUserId: 'U12345',
    department: '工程部',
    permissionLevel: 'EMPLOYEE' as const,
    functionType: 'PROGRAMMING',
    isActive: true,
    avatarUrl: null,
    lastActiveAt: null,
    managedProjects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployees', () => {
    it('應回傳分頁員工列表（僅活躍員工）', async () => {
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([mockEmployee]);
      (mockedPrisma.employee.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getEmployees({ page: 1, limit: 20 });

      expect(result).toEqual({ data: [mockEmployee], total: 1 });
      expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('應根據部門篩選', async () => {
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.employee.count as jest.Mock).mockResolvedValue(0);

      await service.getEmployees({ department: '工程部' });

      expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ department: '工程部' }),
        }),
      );
    });

    it('應支援搜尋（名稱和 email）', async () => {
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.employee.count as jest.Mock).mockResolvedValue(0);

      await service.getEmployees({ search: '測試' });

      expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: '測試', mode: 'insensitive' } },
              { email: { contains: '測試', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('應根據 permissionLevel 篩選', async () => {
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.employee.count as jest.Mock).mockResolvedValue(0);

      await service.getEmployees({ permissionLevel: 'ADMIN' as any });

      expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ permissionLevel: 'ADMIN' }),
        }),
      );
    });
  });

  describe('getEmployeeById', () => {
    it('應回傳含任務關聯的員工', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.getEmployeeById('emp-001');

      expect(result).toEqual(mockEmployee);
    });

    it('員工不存在時回傳 null', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getEmployeeById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createEmployee', () => {
    it('應建立員工（預設 EMPLOYEE 權限）', async () => {
      (mockedPrisma.employee.create as jest.Mock).mockResolvedValue(mockEmployee);

      await service.createEmployee({
        name: '新員工',
        email: 'new@example.com',
      });

      expect(mockedPrisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '新員工',
          email: 'new@example.com',
          permissionLevel: 'EMPLOYEE',
        }),
      });
    });

    it('應使用指定的 permissionLevel', async () => {
      (mockedPrisma.employee.create as jest.Mock).mockResolvedValue(mockEmployee);

      await service.createEmployee({
        name: '管理員',
        email: 'admin@example.com',
        permissionLevel: 'ADMIN' as any,
      });

      expect(mockedPrisma.employee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ permissionLevel: 'ADMIN' }),
      });
    });
  });

  describe('updateEmployee', () => {
    it('應更新員工', async () => {
      (mockedPrisma.employee.update as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        name: '新名稱',
      });

      await service.updateEmployee('emp-001', { name: '新名稱' });

      expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: { name: '新名稱' },
      });
    });
  });

  describe('softDeleteEmployee', () => {
    it('應軟刪除員工（設定 isActive=false）', async () => {
      (mockedPrisma.employee.update as jest.Mock).mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });

      await service.softDeleteEmployee('emp-001');

      expect(mockedPrisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-001' },
        data: { isActive: false },
      });
    });
  });

  describe('emailExists', () => {
    it('email 存在時應回傳 true', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('email 不存在時應回傳 false', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.emailExists('notexist@example.com');

      expect(result).toBe(false);
    });

    it('排除自己的 ID 時應回傳 false', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.emailExists('test@example.com', 'emp-001');

      expect(result).toBe(false);
    });

    it('排除不同 ID 時應回傳 true', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.emailExists('test@example.com', 'emp-999');

      expect(result).toBe(true);
    });
  });

  describe('slackUserIdExists', () => {
    it('slackUserId 存在時應回傳 true', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.slackUserIdExists('U12345');

      expect(result).toBe(true);
    });

    it('slackUserId 不存在時應回傳 false', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.slackUserIdExists('U99999');

      expect(result).toBe(false);
    });

    it('排除自己時應回傳 false', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.slackUserIdExists('U12345', 'emp-001');

      expect(result).toBe(false);
    });
  });
});
