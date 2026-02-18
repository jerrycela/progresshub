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
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
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
    it('快取命中時應直接回傳', async () => {
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
      expect(mockedPrisma.task.count).not.toHaveBeenCalled();
    });

    it('快取未命中時應查詢並設定快取', async () => {
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
      expect(mockCacheSet).toHaveBeenCalledWith('dashboard_stats', result);
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
      (mockedPrisma.employee.count as jest.Mock).mockResolvedValue(3);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(5);

      const result = await service.getWorkloads();

      expect(result).toHaveLength(7); // 7 function types
      expect(result[0].functionType).toBe('PLANNING');
      expect(result[1].functionType).toBe('PROGRAMMING');
      expect(mockCacheSet).toHaveBeenCalledWith('dashboard_workloads', result);
    });

    it('每種職能應查詢 4 個計數', async () => {
      mockCacheGet.mockReturnValue(undefined);
      (mockedPrisma.employee.count as jest.Mock).mockResolvedValue(0);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getWorkloads();

      // 7 types × 3 task.count + 7 employee.count = 21 + 7 = 28
      expect(mockedPrisma.employee.count).toHaveBeenCalledTimes(7);
      expect(mockedPrisma.task.count).toHaveBeenCalledTimes(21);
    });
  });
});
