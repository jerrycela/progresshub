// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    progressLog: {
      findMany: jest.fn(),
      create: jest.fn(),
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
import { TaskService } from '../../../src/services/taskService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TaskService', () => {
  const service = new TaskService();

  const mockTask = {
    id: 'task-001',
    name: '測試任務',
    description: '描述',
    projectId: 'proj-001',
    assignedToId: 'emp-001',
    status: 'CLAIMED' as const,
    priority: 'MEDIUM',
    progressPercentage: 0,
    collaborators: [],
    functionTags: ['PROGRAMMING'],
    dependencies: [],
    plannedStartDate: new Date('2026-01-01'),
    plannedEndDate: new Date('2026-02-01'),
    actualStartDate: null,
    actualEndDate: null,
    closedAt: null,
    pauseReason: null,
    pauseNote: null,
    pausedAt: null,
    blockerReason: null,
    milestoneId: null,
    estimatedHours: 10,
    creatorId: 'emp-002',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTaskWithRelations = {
    ...mockTask,
    project: { id: 'proj-001', name: '測試專案' },
    assignedTo: { id: 'emp-001', name: '測試員工', email: 'test@example.com' },
    creator: { id: 'emp-002', name: '建立者', email: 'creator@example.com' },
    milestone: null,
    gitlabIssueMapping: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('應回傳分頁任務列表', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([mockTaskWithRelations]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getTasks({ page: 1, limit: 20 });

      expect(result).toEqual({ data: [mockTaskWithRelations], total: 1 });
      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { plannedStartDate: 'asc' },
        }),
      );
    });

    it('應根據 projectId 篩選', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getTasks({ projectId: 'proj-001' });

      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'proj-001' }),
        }),
      );
    });

    it('應根據 assignedToId 篩選', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getTasks({ assignedToId: 'emp-001' });

      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedToId: 'emp-001' }),
        }),
      );
    });

    it('應根據 status 篩選', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getTasks({ status: 'IN_PROGRESS' as any });

      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('應正確計算分頁 skip 值', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.getTasks({ page: 3, limit: 10 });

      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('getPoolTasks', () => {
    it('應回傳所有任務（不限狀態）', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await service.getPoolTasks();

      const callArg = (mockedPrisma.task.findMany as jest.Mock).mock.calls[0][0];
      expect(callArg.where).toBeUndefined();
      expect(callArg.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('getTaskById', () => {
    it('應回傳含關聯的任務', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      const result = await service.getTaskById('task-001');

      expect(result).toEqual(mockTaskWithRelations);
      expect(mockedPrisma.task.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'task-001' } }),
      );
    });

    it('任務不存在時回傳 null', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getTaskById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTasksByEmployee', () => {
    it('應回傳員工負責或協作的任務', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([mockTaskWithRelations]);

      const result = await service.getTasksByEmployee('emp-001');

      expect(result).toEqual([mockTaskWithRelations]);
      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { assignedToId: 'emp-001' },
              { collaborators: { has: 'emp-001' } },
            ],
          },
        }),
      );
    });

    it('應支援 status 篩選', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await service.getTasksByEmployee('emp-001', 'IN_PROGRESS' as any);

      expect(mockedPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });
  });

  describe('createTask', () => {
    it('應建立任務（無指派人時為 UNCLAIMED）', async () => {
      (mockedPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.createTask({
        projectId: 'proj-001',
        name: '新任務',
      });

      expect(mockedPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'proj-001',
            name: '新任務',
            status: 'UNCLAIMED',
          }),
        }),
      );
    });

    it('應建立任務（有指派人時為 CLAIMED）', async () => {
      (mockedPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.createTask({
        projectId: 'proj-001',
        name: '新任務',
        assignedToId: 'emp-001',
      });

      expect(mockedPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLAIMED',
            assignedToId: 'emp-001',
          }),
        }),
      );
    });

    it('應驗證 functionTags', async () => {
      await expect(
        service.createTask({
          projectId: 'proj-001',
          name: '新任務',
          functionTags: ['INVALID_TAG'],
        }),
      ).rejects.toThrow('Invalid functionTags');
    });

    it('應驗證合法的 functionTags', async () => {
      (mockedPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.createTask({
        projectId: 'proj-001',
        name: '新任務',
        functionTags: ['PROGRAMMING', 'ART'],
      });

      expect(mockedPrisma.task.create).toHaveBeenCalled();
    });

    it('應驗證 dependencies 存在', async () => {
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(1); // 只找到 1 個

      await expect(
        service.createTask({
          projectId: 'proj-001',
          name: '新任務',
          dependencies: ['dep-001', 'dep-002'],
        }),
      ).rejects.toThrow('One or more dependency task IDs do not exist');
    });

    it('dependencies 都存在時應成功', async () => {
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(2);
      (mockedPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.createTask({
        projectId: 'proj-001',
        name: '新任務',
        dependencies: ['dep-001', 'dep-002'],
      });

      expect(mockedPrisma.task.create).toHaveBeenCalled();
    });

    it('SELF_CREATED 時應設為 CLAIMED 且 assignedToId 為 creatorId', async () => {
      (mockedPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.createTask({
        projectId: 'proj-001',
        name: '自建任務',
        sourceType: 'SELF_CREATED',
        creatorId: 'emp-001',
      });

      expect(mockedPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLAIMED',
            assignedToId: 'emp-001',
          }),
        }),
      );
    });

    it('POOL sourceType 且無 assigneeId 時應設為 UNCLAIMED', async () => {
      (mockedPrisma.task.create as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.createTask({
        projectId: 'proj-001',
        name: '任務池任務',
        sourceType: 'POOL',
        creatorId: 'emp-001',
      });

      expect(mockedPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'UNCLAIMED',
          }),
        }),
      );
    });
  });

  describe('updateTask', () => {
    it('應更新任務基本欄位', async () => {
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.updateTask('task-001', { name: '新名稱' });

      expect(mockedPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-001' },
          data: expect.objectContaining({ name: '新名稱' }),
        }),
      );
    });

    it('應處理 assignedToId disconnect', async () => {
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue(mockTaskWithRelations);

      await service.updateTask('task-001', { assignedToId: undefined });

      // assignedToId is undefined, so assignedTo should not be in updateData
      expect(mockedPrisma.task.update).toHaveBeenCalled();
    });

    it('應驗證 functionTags', async () => {
      await expect(
        service.updateTask('task-001', { functionTags: ['INVALID'] }),
      ).rejects.toThrow('Invalid functionTags');
    });

    it('應驗證 dependencies', async () => {
      (mockedPrisma.task.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.updateTask('task-001', { dependencies: ['nonexistent'] }),
      ).rejects.toThrow('One or more dependency task IDs do not exist');
    });
  });

  describe('deleteTask', () => {
    it('應刪除任務', async () => {
      (mockedPrisma.task.delete as jest.Mock).mockResolvedValue(mockTask);

      await service.deleteTask('task-001');

      expect(mockedPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-001' },
      });
    });
  });

  describe('claimTask', () => {
    it('應成功認領 UNCLAIMED 任務', async () => {
      const txClient = {
        task: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockTaskWithRelations),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      const result = await service.claimTask('task-001', 'emp-001');

      expect(txClient.task.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-001', status: 'UNCLAIMED' },
        data: expect.objectContaining({
          status: 'CLAIMED',
          assignedToId: 'emp-001',
        }),
      });
      expect(result).toEqual(mockTaskWithRelations);
    });

    it('任務已被認領時應拋出 409', async () => {
      const txClient = {
        task: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await expect(
        service.claimTask('task-001', 'emp-001'),
      ).rejects.toThrow('Task cannot be claimed');
    });
  });

  describe('unclaimTask', () => {
    it('應成功取消認領', async () => {
      const txClient = {
        task: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockTaskWithRelations,
            status: 'UNCLAIMED',
            assignedToId: null,
          }),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      const result = await service.unclaimTask('task-001', 'emp-001');

      expect(txClient.task.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'task-001',
          assignedToId: 'emp-001',
          status: { in: ['CLAIMED', 'IN_PROGRESS'] },
        },
        data: expect.objectContaining({
          status: 'UNCLAIMED',
          assignedToId: null,
          progressPercentage: 0,
        }),
      });
      expect(result.status).toBe('UNCLAIMED');
    });

    it('非負責人取消認領時應拋出 409', async () => {
      const txClient = {
        task: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await expect(
        service.unclaimTask('task-001', 'emp-999'),
      ).rejects.toThrow('Task cannot be unclaimed');
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      // updateStatus 使用 $transaction，需要模擬 tx client
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(mockedPrisma),
      );
    });

    it('應允許合法的狀態轉換 CLAIMED → IN_PROGRESS', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'CLAIMED',
        actualStartDate: null,
      });
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTaskWithRelations,
        status: 'IN_PROGRESS',
      });

      const result = await service.updateStatus('task-001', 'IN_PROGRESS' as any);

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockedPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            actualStartDate: expect.any(Date),
          }),
        }),
      );
    });

    it('應拒絕非法的狀態轉換 UNCLAIMED → DONE', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'UNCLAIMED',
      });

      await expect(
        service.updateStatus('task-001', 'DONE' as any),
      ).rejects.toThrow('Cannot transition task from UNCLAIMED to DONE');
    });

    it('DONE 為終態，不可轉換', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'DONE',
      });

      await expect(
        service.updateStatus('task-001', 'IN_PROGRESS' as any),
      ).rejects.toThrow('Cannot transition task from DONE to IN_PROGRESS');
    });

    it('任務不存在時應拋出 404', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'CLAIMED' as any),
      ).rejects.toThrow('Task not found');
    });

    it('PAUSED 需要 pauseReason', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.updateStatus('task-001', 'PAUSED' as any),
      ).rejects.toThrow('Pause reason is required');
    });

    it('PAUSED 有 pauseReason 時應成功', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTaskWithRelations,
        status: 'PAUSED',
      });

      await service.updateStatus('task-001', 'PAUSED' as any, {
        pauseReason: '等待資源',
        pauseNote: '詳細備註',
      });

      expect(mockedPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAUSED',
            pauseReason: '等待資源',
            pauseNote: '詳細備註',
            pausedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('BLOCKED 應設定 blockerReason', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTaskWithRelations,
        status: 'BLOCKED',
      });

      await service.updateStatus('task-001', 'BLOCKED' as any, {
        blockerReason: '需要 API 文件',
      });

      expect(mockedPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'BLOCKED',
            blockerReason: '需要 API 文件',
          }),
        }),
      );
    });

    it('從 PAUSED 恢復到 IN_PROGRESS 應清除暫停原因', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'PAUSED',
        pauseReason: '等待',
        pauseNote: '筆記',
        pausedAt: new Date(),
      });
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTaskWithRelations,
        status: 'IN_PROGRESS',
      });

      await service.updateStatus('task-001', 'IN_PROGRESS' as any);

      expect(mockedPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pauseReason: null,
            pauseNote: null,
            pausedAt: null,
            blockerReason: null,
          }),
        }),
      );
    });

    it('DONE 應設定 actualEndDate 和 closedAt 和進度 100%', async () => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTaskWithRelations,
        status: 'DONE',
      });

      await service.updateStatus('task-001', 'DONE' as any);

      expect(mockedPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DONE',
            actualEndDate: expect.any(Date),
            closedAt: expect.any(Date),
            progressPercentage: 100,
          }),
        }),
      );
    });

    it('已有 actualStartDate 時不應覆蓋', async () => {
      const existingStart = new Date('2026-01-15');
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'CLAIMED',
        actualStartDate: existingStart,
      });
      (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTaskWithRelations,
        status: 'IN_PROGRESS',
      });

      await service.updateStatus('task-001', 'IN_PROGRESS' as any);

      const updateCall = (mockedPrisma.task.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.actualStartDate).toBeUndefined();
    });
  });

  describe('updateTaskProgress', () => {
    it('應更新進度並建立 ProgressLog', async () => {
      const txClient = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            ...mockTask,
            status: 'IN_PROGRESS',
            progressPercentage: 30,
          }),
          update: jest.fn().mockResolvedValue({
            ...mockTaskWithRelations,
            progressPercentage: 50,
          }),
        },
        progressLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await service.updateTaskProgress('task-001', 'emp-001', 50, '進度更新');

      expect(txClient.progressLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: 'task-001',
          employeeId: 'emp-001',
          progressPercentage: 50,
          progressDelta: 20,
          notes: '進度更新',
          reportType: 'PROGRESS',
        }),
      });
    });

    it('進度 100% 應自動設定 DONE 並記錄 COMPLETE', async () => {
      const txClient = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            ...mockTask,
            status: 'IN_PROGRESS',
            progressPercentage: 80,
          }),
          update: jest.fn().mockResolvedValue({
            ...mockTaskWithRelations,
            status: 'DONE',
            progressPercentage: 100,
          }),
        },
        progressLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await service.updateTaskProgress('task-001', 'emp-001', 100);

      expect(txClient.progressLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportType: 'COMPLETE',
        }),
      });
      expect(txClient.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DONE',
            progressPercentage: 100,
            actualEndDate: expect.any(Date),
            closedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('CLAIMED 狀態有進度時應自動轉為 IN_PROGRESS', async () => {
      const txClient = {
        task: {
          findUnique: jest.fn().mockResolvedValue({
            ...mockTask,
            status: 'CLAIMED',
            progressPercentage: 0,
            actualStartDate: null,
          }),
          update: jest.fn().mockResolvedValue({
            ...mockTaskWithRelations,
            status: 'IN_PROGRESS',
          }),
        },
        progressLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await service.updateTaskProgress('task-001', 'emp-001', 10);

      expect(txClient.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            actualStartDate: expect.any(Date),
          }),
        }),
      );
    });

    it('任務不存在時應拋出 404', async () => {
      const txClient = {
        task: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(txClient),
      );

      await expect(
        service.updateTaskProgress('nonexistent', 'emp-001', 50),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('getTaskProgressLogs', () => {
    it('應回傳任務的進度記錄', async () => {
      const mockLogs = [{ id: 'log-001', taskId: 'task-001' }];
      (mockedPrisma.progressLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getTaskProgressLogs('task-001');

      expect(result).toEqual(mockLogs);
      expect(mockedPrisma.progressLog.findMany).toHaveBeenCalledWith({
        where: { taskId: 'task-001' },
        orderBy: { reportedAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true } },
        },
      });
    });
  });

  describe('狀態機完整性驗證', () => {
    beforeEach(() => {
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (fn: Function) => fn(mockedPrisma),
      );
    });

    const testTransition = async (from: string, to: string, shouldSucceed: boolean) => {
      (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: from,
        actualStartDate: from !== 'UNCLAIMED' && from !== 'CLAIMED' ? new Date() : null,
      });

      if (shouldSucceed) {
        (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
          ...mockTaskWithRelations,
          status: to,
        });
      }

      const payload =
        to === 'PAUSED' ? { pauseReason: '測試' } : to === 'BLOCKED' ? { blockerReason: '測試' } : undefined;

      if (shouldSucceed) {
        await expect(service.updateStatus('task-001', to as any, payload)).resolves.toBeDefined();
      } else {
        await expect(service.updateStatus('task-001', to as any, payload)).rejects.toThrow();
      }
    };

    it('UNCLAIMED → CLAIMED 合法', () => testTransition('UNCLAIMED', 'CLAIMED', true));
    it('UNCLAIMED → IN_PROGRESS 非法', () => testTransition('UNCLAIMED', 'IN_PROGRESS', false));
    it('CLAIMED → IN_PROGRESS 合法', () => testTransition('CLAIMED', 'IN_PROGRESS', true));
    it('CLAIMED → UNCLAIMED 合法', () => testTransition('CLAIMED', 'UNCLAIMED', true));
    it('IN_PROGRESS → DONE 合法', () => testTransition('IN_PROGRESS', 'DONE', true));
    it('IN_PROGRESS → PAUSED 合法', () => testTransition('IN_PROGRESS', 'PAUSED', true));
    it('IN_PROGRESS → BLOCKED 合法', () => testTransition('IN_PROGRESS', 'BLOCKED', true));
    it('PAUSED → IN_PROGRESS 合法', () => testTransition('PAUSED', 'IN_PROGRESS', true));
    it('PAUSED → DONE 非法', () => testTransition('PAUSED', 'DONE', false));
    it('BLOCKED → IN_PROGRESS 合法', () => testTransition('BLOCKED', 'IN_PROGRESS', true));
    it('BLOCKED → DONE 非法', () => testTransition('BLOCKED', 'DONE', false));
    it('DONE → IN_PROGRESS 非法', () => testTransition('DONE', 'IN_PROGRESS', false));
    it('DONE → UNCLAIMED 非法', () => testTransition('DONE', 'UNCLAIMED', false));
  });
});
