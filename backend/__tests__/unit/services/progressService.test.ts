// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    progressLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
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
import { ProgressService } from '../../../src/services/progressService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ProgressService', () => {
  const service = new ProgressService();

  const mockLog = {
    id: 'log-001',
    taskId: 'task-001',
    employeeId: 'emp-001',
    progressPercentage: 50,
    progressDelta: 20,
    notes: '進度更新',
    reportType: 'PROGRESS',
    reportedAt: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProgressLogs', () => {
    it('應回傳分頁進度記錄', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([mockLog]);
      (mockedPrisma.progressLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getProgressLogs({ page: 1, limit: 20 });

      expect(result).toEqual({ data: [mockLog], total: 1 });
    });

    it('應根據 taskId 篩選', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.progressLog.count as jest.Mock).mockResolvedValue(0);

      await service.getProgressLogs({ taskId: 'task-001' });

      expect(mockedPrisma.progressLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ taskId: 'task-001' }),
        }),
      );
    });

    it('應根據日期範圍篩選', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.progressLog.count as jest.Mock).mockResolvedValue(0);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await service.getProgressLogs({ startDate, endDate });

      expect(mockedPrisma.progressLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reportedAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });
  });

  describe('createProgressLog', () => {
    it('應建立進度記錄並更新任務', async () => {
      const txClient = {
        progressLog: {
          create: jest.fn().mockResolvedValue(mockLog),
        },
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'task-001',
            actualStartDate: null,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await service.createProgressLog({
        taskId: 'task-001',
        employeeId: 'emp-001',
        progressPercentage: 50,
        notes: '進度更新',
      });

      expect(txClient.progressLog.create).toHaveBeenCalled();
      expect(txClient.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            progressPercentage: 50,
            status: 'IN_PROGRESS',
            actualStartDate: expect.any(Date),
          }),
        }),
      );
    });

    it('進度 100% 應將狀態設為 DONE', async () => {
      const txClient = {
        progressLog: {
          create: jest.fn().mockResolvedValue(mockLog),
        },
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'task-001',
            actualStartDate: new Date(),
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await service.createProgressLog({
        taskId: 'task-001',
        employeeId: 'emp-001',
        progressPercentage: 100,
      });

      expect(txClient.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DONE',
            actualEndDate: expect.any(Date),
          }),
        }),
      );
    });

    it('進度 0% 應將狀態設為 UNCLAIMED', async () => {
      const txClient = {
        progressLog: {
          create: jest.fn().mockResolvedValue(mockLog),
        },
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'task-001',
            actualStartDate: null,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await service.createProgressLog({
        taskId: 'task-001',
        employeeId: 'emp-001',
        progressPercentage: 0,
      });

      expect(txClient.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'UNCLAIMED' }),
        }),
      );
    });
  });

  describe('getTodayProgressStatus', () => {
    it('應回傳今日進度回報狀態', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([
        { taskId: 'task-001' },
        { taskId: 'task-001' },
        { taskId: 'task-002' },
      ]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getTodayProgressStatus('emp-001');

      expect(result.hasReported).toBe(true);
      expect(result.tasksReported).toBe(2); // 2 unique tasks
      expect(result.totalInProgressTasks).toBe(5);
    });

    it('無回報時應回傳 false', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getTodayProgressStatus('emp-001');

      expect(result.hasReported).toBe(false);
      expect(result.tasksReported).toBe(0);
      expect(result.totalInProgressTasks).toBe(3);
    });
  });

  describe('getProjectProgressStats', () => {
    it('應回傳按日期分組的專案進度', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([
        { progressPercentage: 30, reportedAt: new Date('2026-02-10') },
        { progressPercentage: 50, reportedAt: new Date('2026-02-10') },
        { progressPercentage: 80, reportedAt: new Date('2026-02-11') },
      ]);

      const result = await service.getProjectProgressStats('proj-001', 7);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-02-10');
      expect(result[0].averageProgress).toBe(40); // (30+50)/2
      expect(result[0].logsCount).toBe(2);
      expect(result[1].date).toBe('2026-02-11');
      expect(result[1].averageProgress).toBe(80);
    });

    it('無記錄時應回傳空陣列', async () => {
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProjectProgressStats('proj-001');

      expect(result).toEqual([]);
    });
  });
});
