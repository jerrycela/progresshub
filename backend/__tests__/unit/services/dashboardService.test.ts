// Mock get/set 函式需在 mock 定義前宣告
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();

// Mock node-cache — cache 在模組層級建立，mock 需在 import 前
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockCacheGet,
    set: mockCacheSet,
  }));
});

// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    task: {
      count: jest.fn(),
    },
    employee: {
      count: jest.fn(),
    },
    projectMember: {
      findMany: jest.fn().mockResolvedValue([{ projectId: 'proj-1' }, { projectId: 'proj-2' }]),
    },
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
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
import { DashboardService } from '../../../src/services/dashboardService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('DashboardService', () => {
  const service = new DashboardService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('快取命中時應直接回傳（全域）', async () => {
      const cachedStats = {
        totalTasks: 100,
        completedTasks: 50,
        inProgressTasks: 30,
        unclaimedTasks: 10,
        overdueTasksCount: 5,
      };
      mockCacheGet.mockReturnValue(cachedStats);

      const result = await service.getStats();

      expect(result).toEqual(cachedStats);
      expect(mockCacheGet).toHaveBeenCalledWith('dashboard_stats_global');
      expect(mockedPrisma.task.count).not.toHaveBeenCalled();
    });

    it('快取未命中時應查詢並設定快取（全域）', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.task.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalTasks
        .mockResolvedValueOnce(50)  // completedTasks
        .mockResolvedValueOnce(30)  // inProgressTasks
        .mockResolvedValueOnce(10)  // unclaimedTasks
        .mockResolvedValueOnce(5);  // overdueTasksCount

      const result = await service.getStats();

      expect(result.totalTasks).toBe(100);
      expect(result.completedTasks).toBe(50);
      expect(result.inProgressTasks).toBe(30);
      expect(result.unclaimedTasks).toBe(10);
      expect(result.overdueTasksCount).toBe(5);
      expect(mockCacheSet).toHaveBeenCalledWith('dashboard_stats_global', result);
    });

    it('傳入 userId 時應使用使用者專屬快取鍵', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getStats('user-123');

      expect(mockCacheGet).toHaveBeenCalledWith('dashboard_stats_user-123');
      expect(mockCacheSet).toHaveBeenCalledWith('dashboard_stats_user-123', expect.any(Object));
    });

    it('傳入 userId 時應加入使用者篩選條件', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getStats('user-123');

      // Verify all count calls include project-scoped filter
      const calls = (mockedPrisma.task.count as jest.Mock).mock.calls;
      for (const call of calls) {
        const where = call[0]?.where;
        expect(where).toHaveProperty('projectId');
        expect(where.projectId).toEqual({ in: ['proj-1', 'proj-2'] });
      }
    });

    it('應執行 5 個平行計數查詢', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getStats();

      expect(mockedPrisma.task.count).toHaveBeenCalledTimes(5);
    });
  });

  describe('getWorkloads', () => {
    it('快取命中時應直接回傳', async () => {
      const cachedWorkloads = [
        { functionType: 'PROGRAMMING', totalTasks: 10, unclaimedTasks: 2, inProgressTasks: 5, memberCount: 3 },
      ];
      mockCacheGet.mockReturnValue(cachedWorkloads);

      const result = await service.getWorkloads();

      expect(result).toEqual(cachedWorkloads);
      expect(mockedPrisma.employee.count).not.toHaveBeenCalled();
    });

    it('快取未命中時應查詢 7 種職能的負載', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([
          { function_type: 'PLANNING', total_tasks: BigInt(10), unclaimed_tasks: BigInt(2), in_progress_tasks: BigInt(5) },
          { function_type: 'PROGRAMMING', total_tasks: BigInt(8), unclaimed_tasks: BigInt(1), in_progress_tasks: BigInt(3) },
        ])
        .mockResolvedValueOnce([
          { function_type: 'PLANNING', member_count: BigInt(3) },
          { function_type: 'PROGRAMMING', member_count: BigInt(5) },
        ]);

      const result = await service.getWorkloads();

      expect(result).toHaveLength(7); // 7 function types
      expect(result[0].functionType).toBe('PLANNING');
      expect(result[1].functionType).toBe('PROGRAMMING');
      expect(result[0].totalTasks).toBe(10);
      expect(result[1].memberCount).toBe(5);
      expect(mockCacheSet).toHaveBeenCalledWith('dashboard_workloads', result);
    });

    it('應使用 2 個聚合查詢取代 28 個個別 COUNT', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([]) // task stats
        .mockResolvedValueOnce([]); // employee stats

      await service.getWorkloads();

      // Should use 2 raw SQL queries instead of 28 individual counts
      expect(mockedPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    });
  });
});
