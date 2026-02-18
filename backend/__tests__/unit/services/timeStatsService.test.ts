// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
    timeEntry: {
      findMany: jest.fn(),
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
import { TimeStatsService } from '../../../src/services/timeStatsService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TimeStatsService', () => {
  const service = new TimeStatsService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectStats', () => {
    it('應回傳專案工時統計', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-001',
        name: '測試專案',
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          hours: 3,
          status: 'APPROVED',
          categoryId: 'cat-001',
          category: { id: 'cat-001', name: '開發', billable: true },
        },
        {
          hours: 2,
          status: 'PENDING',
          categoryId: 'cat-002',
          category: { id: 'cat-002', name: '會議', billable: false },
        },
      ]);

      const result = await service.getProjectStats('proj-001');

      expect(result.projectId).toBe('proj-001');
      expect(result.totalHours).toBe(5);
      expect(result.billableHours).toBe(3);
      expect(result.approvedHours).toBe(3);
      expect(result.pendingHours).toBe(2);
      expect(result.categoryBreakdown).toHaveLength(2);
    });

    it('應支援日期範圍篩選', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-001',
        name: '測試專案',
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);

      const dateRange = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
      };

      await service.getProjectStats('proj-001', dateRange);

      expect(mockedPrisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: dateRange.startDate, lte: dateRange.endDate },
          }),
        }),
      );
    });

    it('專案不存在時應拋出錯誤', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProjectStats('nonexistent')).rejects.toThrow(
        'Project not found',
      );
    });

    it('無工時時百分比應為 0', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-001',
        name: '測試專案',
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProjectStats('proj-001');

      expect(result.totalHours).toBe(0);
      expect(result.categoryBreakdown).toHaveLength(0);
    });

    it('類別分類應按工時降序排列', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-001',
        name: '測試專案',
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          hours: 2,
          status: 'APPROVED',
          categoryId: 'cat-001',
          category: { id: 'cat-001', name: '會議', billable: false },
        },
        {
          hours: 5,
          status: 'APPROVED',
          categoryId: 'cat-002',
          category: { id: 'cat-002', name: '開發', billable: true },
        },
      ]);

      const result = await service.getProjectStats('proj-001');

      expect(result.categoryBreakdown[0].categoryName).toBe('開發');
      expect(result.categoryBreakdown[1].categoryName).toBe('會議');
    });
  });

  describe('getEmployeeStats', () => {
    it('應回傳員工工時統計含專案和類別分類', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-001',
        name: '測試員工',
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          hours: 4,
          status: 'APPROVED',
          projectId: 'proj-001',
          categoryId: 'cat-001',
          project: { id: 'proj-001', name: '專案 A' },
          category: { id: 'cat-001', name: '開發' },
        },
        {
          hours: 2,
          status: 'PENDING',
          projectId: 'proj-002',
          categoryId: 'cat-001',
          project: { id: 'proj-002', name: '專案 B' },
          category: { id: 'cat-001', name: '開發' },
        },
      ]);

      const result = await service.getEmployeeStats('emp-001');

      expect(result.employeeId).toBe('emp-001');
      expect(result.totalHours).toBe(6);
      expect(result.approvedHours).toBe(4);
      expect(result.pendingHours).toBe(2);
      expect(result.projectBreakdown).toHaveLength(2);
      expect(result.categoryBreakdown).toHaveLength(1); // 同一類別合併
    });

    it('員工不存在時應拋出錯誤', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getEmployeeStats('nonexistent')).rejects.toThrow(
        'Employee not found',
      );
    });
  });

  describe('getTeamDashboard', () => {
    it('應回傳團隊儀表板統計', async () => {
      const dateRange = {
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
      };
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          hours: 4,
          status: 'APPROVED',
          employeeId: 'emp-001',
          projectId: 'proj-001',
          date: new Date('2026-02-10'),
          project: { id: 'proj-001', name: '專案 A' },
          employee: { id: 'emp-001', name: '員工 A' },
          category: { billable: true },
        },
        {
          hours: 3,
          status: 'PENDING',
          employeeId: 'emp-002',
          projectId: 'proj-001',
          date: new Date('2026-02-11'),
          project: { id: 'proj-001', name: '專案 A' },
          employee: { id: 'emp-002', name: '員工 B' },
          category: { billable: false },
        },
      ]);

      const result = await service.getTeamDashboard(dateRange);

      expect(result.totalHours).toBe(7);
      expect(result.billableHours).toBe(4);
      expect(result.approvedHours).toBe(4);
      expect(result.pendingHours).toBe(3);
      expect(result.employeeCount).toBe(2);
      expect(result.projectCount).toBe(1);
      expect(result.topProjects).toHaveLength(1);
      expect(result.topEmployees).toHaveLength(2);
      expect(result.dailyTrend).toHaveLength(2);
    });

    it('無資料時應回傳零值', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getTeamDashboard({
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(result.totalHours).toBe(0);
      expect(result.employeeCount).toBe(0);
      expect(result.projectCount).toBe(0);
    });
  });

  describe('getMonthlySummary', () => {
    it('應回傳月度工時摘要', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          date: new Date('2026-02-03'), // Tuesday
          hours: 4,
          project: { name: '專案 A' },
          category: { name: '開發', billable: true },
        },
        {
          date: new Date('2026-02-04'), // Wednesday
          hours: 3,
          project: { name: '專案 A' },
          category: { name: '會議', billable: false },
        },
      ]);

      const result = await service.getMonthlySummary('emp-001', 2026, 2);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(2);
      expect(result.totalHours).toBe(7);
      expect(result.billableHours).toBe(4);
      expect(result.workingDays).toBe(2);
    });
  });

  describe('getPendingApprovalStats', () => {
    it('ADMIN 應看到所有待審核', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-001',
        permissionLevel: 'ADMIN',
        managedProjects: [],
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          hours: 3,
          employeeId: 'emp-001',
          projectId: 'proj-001',
          employee: { id: 'emp-001', name: '員工 A' },
          project: { id: 'proj-001', name: '專案 A' },
        },
      ]);

      const result = await service.getPendingApprovalStats('admin-001');

      expect(result.totalPending).toBe(1);
    });

    it('PM 只看到管理專案的待審核', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'pm-001',
        permissionLevel: 'PM',
        managedProjects: ['proj-001'],
      });
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPendingApprovalStats('pm-001');

      expect(mockedPrisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: { in: ['proj-001'] },
          }),
        }),
      );
    });

    it('無管理專案的非 ADMIN 應回傳空結果', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-001',
        permissionLevel: 'EMPLOYEE',
        managedProjects: [],
      });

      const result = await service.getPendingApprovalStats('emp-001');

      expect(result.totalPending).toBe(0);
      expect(result.byEmployee).toEqual([]);
      expect(result.byProject).toEqual([]);
    });

    it('審核者不存在時應拋出錯誤', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPendingApprovalStats('nonexistent'),
      ).rejects.toThrow('Approver not found');
    });
  });
});
