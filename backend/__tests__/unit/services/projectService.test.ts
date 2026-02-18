// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
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
import { ProjectService } from '../../../src/services/projectService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ProjectService', () => {
  const service = new ProjectService();

  const mockProject = {
    id: 'proj-001',
    name: '測試專案',
    description: '描述',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjects', () => {
    it('應回傳分頁專案列表', async () => {
      (mockedPrisma.project.findMany as jest.Mock).mockResolvedValue([mockProject]);
      (mockedPrisma.project.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getProjects({ page: 1, limit: 20 });

      expect(result).toEqual({ data: [mockProject], total: 1 });
    });

    it('應根據 status 篩選', async () => {
      (mockedPrisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.project.count as jest.Mock).mockResolvedValue(0);

      await service.getProjects({ status: 'ACTIVE' as any });

      expect(mockedPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('應支援搜尋（名稱和描述）', async () => {
      (mockedPrisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.project.count as jest.Mock).mockResolvedValue(0);

      await service.getProjects({ search: '測試' });

      expect(mockedPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: '測試', mode: 'insensitive' } },
              { description: { contains: '測試', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('getProjectById', () => {
    it('應回傳含任務和里程碑的專案', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.getProjectById('proj-001');

      expect(result).toEqual(mockProject);
      expect(mockedPrisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'proj-001' } }),
      );
    });

    it('專案不存在時回傳 null', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getProjectById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('應建立專案', async () => {
      (mockedPrisma.project.create as jest.Mock).mockResolvedValue(mockProject);

      await service.createProject({
        name: '新專案',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      });

      expect(mockedPrisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: '新專案' }),
        }),
      );
    });
  });

  describe('updateProject', () => {
    it('應更新專案欄位', async () => {
      (mockedPrisma.project.update as jest.Mock).mockResolvedValue(mockProject);

      await service.updateProject('proj-001', { name: '新名稱' });

      expect(mockedPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-001' },
        data: expect.objectContaining({ name: '新名稱' }),
      });
    });
  });

  describe('deleteProject', () => {
    it('無進行中任務時應成功刪除', async () => {
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);
      (mockedPrisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      await service.deleteProject('proj-001');

      expect(mockedPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-001' },
      });
    });

    it('有進行中任務時應拋出錯誤', async () => {
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(3);

      await expect(service.deleteProject('proj-001')).rejects.toThrow(
        '無法刪除專案：仍有 3 個進行中的任務',
      );
    });

    it('應檢查正確的活躍任務狀態', async () => {
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);
      (mockedPrisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      await service.deleteProject('proj-001');

      expect(mockedPrisma.task.count).toHaveBeenCalledWith({
        where: {
          projectId: 'proj-001',
          status: { in: ['IN_PROGRESS', 'CLAIMED', 'BLOCKED', 'PAUSED'] },
        },
      });
    });
  });

  describe('getProjectStats', () => {
    it('應回傳專案統計', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        { status: 'DONE', progressPercentage: 100 },
        { status: 'IN_PROGRESS', progressPercentage: 50 },
        { status: 'UNCLAIMED', progressPercentage: 0 },
      ]);

      const result = await service.getProjectStats('proj-001');

      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(1);
      expect(result.inProgressTasks).toBe(1);
      expect(result.averageProgress).toBe(50); // (100+50+0)/3 = 50
    });

    it('無任務時應回傳零值', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getProjectStats('proj-001');

      expect(result.totalTasks).toBe(0);
      expect(result.averageProgress).toBe(0);
    });
  });

  describe('getGanttData', () => {
    it('應回傳甘特圖資料（優先使用實際日期）', async () => {
      const actualStart = new Date('2026-02-01');
      const actualEnd = new Date('2026-02-15');
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        tasks: [
          {
            id: 'task-001',
            name: '任務 1',
            plannedStartDate: new Date('2026-01-15'),
            plannedEndDate: new Date('2026-02-28'),
            actualStartDate: actualStart,
            actualEndDate: actualEnd,
            progressPercentage: 100,
            dependencies: [],
            assignedTo: { name: '員工 A' },
          },
        ],
      });

      const result = await service.getGanttData('proj-001');

      expect(result.tasks[0].start).toEqual(actualStart);
      expect(result.tasks[0].end).toEqual(actualEnd);
    });

    it('無實際日期時應使用計畫日期', async () => {
      const plannedStart = new Date('2026-01-15');
      const plannedEnd = new Date('2026-02-28');
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue({
        ...mockProject,
        tasks: [
          {
            id: 'task-001',
            name: '任務 1',
            plannedStartDate: plannedStart,
            plannedEndDate: plannedEnd,
            actualStartDate: null,
            actualEndDate: null,
            progressPercentage: 0,
            dependencies: [],
            assignedTo: null,
          },
        ],
      });

      const result = await service.getGanttData('proj-001');

      expect(result.tasks[0].start).toEqual(plannedStart);
      expect(result.tasks[0].end).toEqual(plannedEnd);
      expect(result.tasks[0].assignee).toBe('');
    });

    it('專案不存在時應拋出錯誤', async () => {
      (mockedPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getGanttData('nonexistent')).rejects.toThrow(
        'Project not found',
      );
    });
  });
});
