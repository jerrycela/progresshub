// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    timeEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
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
import { TimeEntryService } from '../../../src/services/timeEntryService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TimeEntryService', () => {
  const service = new TimeEntryService();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mockEntry = {
    id: 'te-001',
    employeeId: 'emp-001',
    projectId: 'proj-001',
    taskId: 'task-001',
    categoryId: 'cat-001',
    date: today,
    hours: 2,
    description: '開發功能',
    status: 'PENDING' as const,
    approvedBy: null,
    approvedAt: null,
    rejectedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEntryWithRelations = {
    ...mockEntry,
    project: { id: 'proj-001', name: '測試專案' },
    task: { id: 'task-001', name: '測試任務' },
    category: { id: 'cat-001', name: '開發', color: '#00F' },
    employee: { id: 'emp-001', name: '測試員工' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // 預設 aggregate 回傳 0（每日總工時）
    (mockedPrisma.timeEntry.aggregate as jest.Mock).mockResolvedValue({
      _sum: { hours: 0 },
    });
  });

  describe('getTimeEntries', () => {
    it('應回傳分頁工時記錄', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([mockEntryWithRelations]);
      (mockedPrisma.timeEntry.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTimeEntries({ page: 1, limit: 50 });

      expect(result).toEqual({ data: [mockEntryWithRelations], total: 1 });
    });

    it('應根據 employeeId 篩選', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.timeEntry.count as jest.Mock).mockResolvedValue(0);

      await service.getTimeEntries({ employeeId: 'emp-001' });

      expect(mockedPrisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ employeeId: 'emp-001' }),
        }),
      );
    });

    it('應根據日期範圍篩選', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.timeEntry.count as jest.Mock).mockResolvedValue(0);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await service.getTimeEntries({ startDate, endDate });

      expect(mockedPrisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });
  });

  describe('getTimeEntryById', () => {
    it('應回傳含關聯的工時記錄', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      const result = await service.getTimeEntryById('te-001');

      expect(result).toEqual(mockEntryWithRelations);
    });
  });

  describe('createTimeEntry — 業務規則驗證', () => {
    const validData = {
      employeeId: 'emp-001',
      projectId: 'proj-001',
      categoryId: 'cat-001',
      date: today,
      hours: 2,
    };

    it('應成功建立合法工時記錄', async () => {
      (mockedPrisma.timeEntry.create as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      await service.createTimeEntry(validData);

      expect(mockedPrisma.timeEntry.create).toHaveBeenCalled();
    });

    it('BR-01: 工時必須是 0.25 小時倍數', async () => {
      await expect(
        service.createTimeEntry({ ...validData, hours: 0.3 }),
      ).rejects.toThrow('Hours must be in increments of 0.25');
    });

    it('BR-01: 0.25 小時應通過', async () => {
      (mockedPrisma.timeEntry.create as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      await service.createTimeEntry({ ...validData, hours: 0.25 });

      expect(mockedPrisma.timeEntry.create).toHaveBeenCalled();
    });

    it('BR-01: 0.5 小時應通過', async () => {
      (mockedPrisma.timeEntry.create as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      await service.createTimeEntry({ ...validData, hours: 0.5 });

      expect(mockedPrisma.timeEntry.create).toHaveBeenCalled();
    });

    it('BR-02: 單筆上限 12 小時', async () => {
      await expect(
        service.createTimeEntry({ ...validData, hours: 12.25 }),
      ).rejects.toThrow('Single entry cannot exceed 12 hours');
    });

    it('BR-02: 12 小時剛好應通過', async () => {
      (mockedPrisma.timeEntry.create as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      await service.createTimeEntry({ ...validData, hours: 12 });

      expect(mockedPrisma.timeEntry.create).toHaveBeenCalled();
    });

    it('BR-03: 單日總工時上限 16 小時', async () => {
      (mockedPrisma.timeEntry.aggregate as jest.Mock).mockResolvedValue({
        _sum: { hours: 15 },
      });

      await expect(
        service.createTimeEntry({ ...validData, hours: 2 }),
      ).rejects.toThrow('Daily total cannot exceed 16 hours');
    });

    it('BR-03: 加上後剛好 16 小時應通過', async () => {
      (mockedPrisma.timeEntry.aggregate as jest.Mock).mockResolvedValue({
        _sum: { hours: 14 },
      });
      (mockedPrisma.timeEntry.create as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      await service.createTimeEntry({ ...validData, hours: 2 });

      expect(mockedPrisma.timeEntry.create).toHaveBeenCalled();
    });

    it('BR-04: 不能登記超過 7 天前的工時', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await expect(
        service.createTimeEntry({ ...validData, date: oldDate }),
      ).rejects.toThrow('Cannot log time entries older than 7 days');
    });

    it('BR-04: 7 天內的日期應通過', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      (mockedPrisma.timeEntry.create as jest.Mock).mockResolvedValue(mockEntryWithRelations);

      await service.createTimeEntry({ ...validData, date: recentDate });

      expect(mockedPrisma.timeEntry.create).toHaveBeenCalled();
    });
  });

  describe('createBatchTimeEntries', () => {
    it('應在 transaction 內批次建立多筆工時記錄', async () => {
      const txClient = {
        timeEntry: {
          create: jest.fn().mockResolvedValue(mockEntry),
          aggregate: jest.fn().mockResolvedValue({ _sum: { hours: 0 } }),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      const entries = [
        { employeeId: 'emp-001', projectId: 'proj-001', categoryId: 'cat-001', date: today, hours: 2 },
        { employeeId: 'emp-001', projectId: 'proj-001', categoryId: 'cat-001', date: today, hours: 1 },
      ];

      const result = await service.createBatchTimeEntries(entries);

      expect(result).toHaveLength(2);
      expect(txClient.timeEntry.create).toHaveBeenCalledTimes(2);
      expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTimeEntry', () => {
    it('應更新 PENDING 工時記錄', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue(mockEntry);
      (mockedPrisma.timeEntry.update as jest.Mock).mockResolvedValue({
        ...mockEntryWithRelations,
        hours: 3,
      });

      await service.updateTimeEntry('te-001', { hours: 3 });

      expect(mockedPrisma.timeEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('不能修改已核准的工時記錄', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: 'APPROVED',
      });

      await expect(
        service.updateTimeEntry('te-001', { hours: 3 }),
      ).rejects.toThrow('Cannot modify approved time entry');
    });

    it('工時記錄不存在時應拋出錯誤', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateTimeEntry('nonexistent', { hours: 3 }),
      ).rejects.toThrow('Time entry not found');
    });
  });

  describe('deleteTimeEntry', () => {
    it('應刪除 PENDING 工時記錄', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue(mockEntry);
      (mockedPrisma.timeEntry.delete as jest.Mock).mockResolvedValue(mockEntry);

      await service.deleteTimeEntry('te-001');

      expect(mockedPrisma.timeEntry.delete).toHaveBeenCalledWith({ where: { id: 'te-001' } });
    });

    it('不能刪除已核准的工時記錄', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: 'APPROVED',
      });

      await expect(service.deleteTimeEntry('te-001')).rejects.toThrow(
        'Cannot delete approved time entry',
      );
    });

    it('工時記錄不存在時應拋出錯誤', async () => {
      (mockedPrisma.timeEntry.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteTimeEntry('nonexistent')).rejects.toThrow(
        'Time entry not found',
      );
    });
  });

  describe('approveTimeEntry', () => {
    it('應核准工時記錄', async () => {
      (mockedPrisma.timeEntry.update as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: 'APPROVED',
      });

      await service.approveTimeEntry('te-001', 'approver-001');

      expect(mockedPrisma.timeEntry.update).toHaveBeenCalledWith({
        where: { id: 'te-001' },
        data: {
          status: 'APPROVED',
          approvedBy: 'approver-001',
          approvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('rejectTimeEntry', () => {
    it('應駁回工時記錄並附上原因', async () => {
      (mockedPrisma.timeEntry.update as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: 'REJECTED',
      });

      await service.rejectTimeEntry('te-001', 'approver-001', '工時過高');

      expect(mockedPrisma.timeEntry.update).toHaveBeenCalledWith({
        where: { id: 'te-001' },
        data: {
          status: 'REJECTED',
          approvedBy: 'approver-001',
          approvedAt: expect.any(Date),
          rejectedReason: '工時過高',
        },
      });
    });
  });

  describe('batchApprove', () => {
    it('應批次核准多筆 PENDING 工時記錄', async () => {
      (mockedPrisma.timeEntry.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.batchApprove(
        ['te-001', 'te-002', 'te-003'],
        'approver-001',
      );

      expect(result.count).toBe(3);
      expect(mockedPrisma.timeEntry.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['te-001', 'te-002', 'te-003'] }, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedBy: 'approver-001',
          approvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getWeeklyTimesheet', () => {
    it('應回傳按專案/任務分組的週報資料', async () => {
      const weekStart = new Date('2026-02-09');
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockEntry,
          date: new Date('2026-02-09'),
          hours: 3,
          project: { id: 'proj-001', name: '專案 A' },
          task: { id: 'task-001', name: '任務 1' },
        },
        {
          ...mockEntry,
          date: new Date('2026-02-10'),
          hours: 4,
          project: { id: 'proj-001', name: '專案 A' },
          task: { id: 'task-001', name: '任務 1' },
        },
      ]);

      const result = await service.getWeeklyTimesheet('emp-001', weekStart);

      expect(result.weekStart).toEqual(weekStart);
      expect(result.entries).toHaveLength(1); // 同專案同任務合併
      expect(result.weeklyTotal).toBe(7);
    });

    it('不同專案應分開分組', async () => {
      const weekStart = new Date('2026-02-09');
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockEntry,
          projectId: 'proj-001',
          date: new Date('2026-02-09'),
          hours: 3,
          project: { id: 'proj-001', name: '專案 A' },
          task: null,
          taskId: null,
        },
        {
          ...mockEntry,
          projectId: 'proj-002',
          date: new Date('2026-02-09'),
          hours: 2,
          project: { id: 'proj-002', name: '專案 B' },
          task: null,
          taskId: null,
        },
      ]);

      const result = await service.getWeeklyTimesheet('emp-001', weekStart);

      expect(result.entries).toHaveLength(2);
      expect(result.weeklyTotal).toBe(5);
    });
  });

  describe('getTodaySummary', () => {
    it('應回傳今日工時摘要', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([
        { ...mockEntry, hours: 3, project: { name: '專案 A' }, task: { name: '任務 1' } },
        { ...mockEntry, hours: 2, project: { name: '專案 A' }, task: { name: '任務 2' } },
      ]);

      const result = await service.getTodaySummary('emp-001');

      expect(result.totalHours).toBe(5);
      expect(result.entries).toHaveLength(2);
    });

    it('無工時記錄時應回傳 0', async () => {
      (mockedPrisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getTodaySummary('emp-001');

      expect(result.totalHours).toBe(0);
      expect(result.entries).toHaveLength(0);
    });
  });
});
