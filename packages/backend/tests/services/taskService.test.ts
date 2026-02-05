import { prismaMock } from '../__mocks__/prisma'
import { TaskService } from '../../src/services/taskService'
import { TaskStatus, CreateTaskDto } from '../../src/types/task'
import { AppError } from '../../src/utils/AppError'

describe('TaskService', () => {
  let taskService: TaskService

  beforeEach(() => {
    taskService = new TaskService()
  })

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'UNCLAIMED' as const,
    priority: 'MEDIUM' as const,
    progress: 0,
    estimatedHours: 8,
    actualHours: null,
    dueDate: new Date('2026-02-10'),
    startedAt: null,
    completedAt: null,
    projectId: 'project-1',
    milestoneId: null,
    assigneeId: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    slackId: null,
    avatar: null,
    role: 'EMPLOYEE' as const,
    department: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  describe('createTask', () => {
    it('should create a new task with UNCLAIMED status when no assignee', async () => {
      const createData: CreateTaskDto = {
        title: 'New Task',
        projectId: 'project-1'
      }

      prismaMock.task.create.mockResolvedValue({
        ...mockTask,
        title: 'New Task',
        status: 'UNCLAIMED'
      })

      const result = await taskService.createTask(createData, 'user-1')

      expect(result.title).toBe('New Task')
      expect(result.status).toBe('UNCLAIMED')
      expect(prismaMock.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Task',
          projectId: 'project-1',
          createdById: 'user-1',
          status: 'UNCLAIMED'
        })
      })
    })

    it('should create a task with CLAIMED status when assignee is provided', async () => {
      const createData: CreateTaskDto = {
        title: 'Assigned Task',
        projectId: 'project-1',
        assigneeId: 'user-2'
      }

      prismaMock.task.create.mockResolvedValue({
        ...mockTask,
        title: 'Assigned Task',
        status: 'CLAIMED',
        assigneeId: 'user-2'
      })

      const result = await taskService.createTask(createData, 'user-1')

      expect(result.status).toBe('CLAIMED')
      expect(result.assigneeId).toBe('user-2')
    })
  })

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      prismaMock.task.findUnique.mockResolvedValue(mockTask)

      const result = await taskService.getTaskById('task-1')

      expect(result).toEqual(mockTask)
      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        include: {
          project: true,
          milestone: true,
          assignee: true,
          createdBy: true
        }
      })
    })

    it('should return null when task not found', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null)

      const result = await taskService.getTaskById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      prismaMock.task.findUnique.mockResolvedValue(mockTask)
      prismaMock.task.update.mockResolvedValue({
        ...mockTask,
        title: 'Updated Title'
      })

      const result = await taskService.updateTask('task-1', { title: 'Updated Title' })

      expect(result.title).toBe('Updated Title')
    })

    it('should throw error when task not found', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null)

      await expect(taskService.updateTask('non-existent', { title: 'Updated' }))
        .rejects.toThrow(AppError)
    })
  })

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      prismaMock.task.findUnique.mockResolvedValue(mockTask)
      prismaMock.task.delete.mockResolvedValue(mockTask)

      await expect(taskService.deleteTask('task-1')).resolves.not.toThrow()
      expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } })
    })

    it('should throw error when task not found', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null)

      await expect(taskService.deleteTask('non-existent'))
        .rejects.toThrow(AppError)
    })
  })

  describe('getTasks', () => {
    it('should return paginated tasks', async () => {
      prismaMock.task.findMany.mockResolvedValue([mockTask])
      prismaMock.task.count.mockResolvedValue(1)

      const result = await taskService.getTasks({ page: 1, limit: 10 })

      expect(result.tasks).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should filter by projectId', async () => {
      prismaMock.task.findMany.mockResolvedValue([mockTask])
      prismaMock.task.count.mockResolvedValue(1)

      await taskService.getTasks({ projectId: 'project-1' })

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 'project-1' })
        })
      )
    })

    it('should filter by status', async () => {
      prismaMock.task.findMany.mockResolvedValue([])
      prismaMock.task.count.mockResolvedValue(0)

      await taskService.getTasks({ status: TaskStatus.IN_PROGRESS })

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' })
        })
      )
    })
  })

  describe('getTasksByAssignee', () => {
    it('should return tasks for assignee', async () => {
      const assignedTask = { ...mockTask, assigneeId: 'user-1', status: 'CLAIMED' as const }
      prismaMock.task.findMany.mockResolvedValue([assignedTask])

      const result = await taskService.getTasksByAssignee('user-1')

      expect(result).toHaveLength(1)
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assigneeId: 'user-1' }
        })
      )
    })

    it('should filter by status when provided', async () => {
      prismaMock.task.findMany.mockResolvedValue([])

      await taskService.getTasksByAssignee('user-1', TaskStatus.IN_PROGRESS)

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assigneeId: 'user-1', status: 'IN_PROGRESS' }
        })
      )
    })
  })

  describe('Status Transitions', () => {
    describe('claimTask', () => {
      it('should claim an UNCLAIMED task', async () => {
        prismaMock.task.findUnique.mockResolvedValue(mockTask)
        prismaMock.task.update.mockResolvedValue({
          ...mockTask,
          status: 'CLAIMED',
          assigneeId: 'user-1'
        })

        const result = await taskService.claimTask('task-1', 'user-1')

        expect(result.status).toBe('CLAIMED')
        expect(result.assigneeId).toBe('user-1')
      })

      it('should throw error when task is not UNCLAIMED', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: 'CLAIMED'
        })

        await expect(taskService.claimTask('task-1', 'user-1'))
          .rejects.toThrow(AppError)
      })
    })

    describe('unclaimTask', () => {
      it('should unclaim a CLAIMED task', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: 'CLAIMED',
          assigneeId: 'user-1'
        })
        prismaMock.task.update.mockResolvedValue({
          ...mockTask,
          status: 'UNCLAIMED',
          assigneeId: null
        })

        const result = await taskService.unclaimTask('task-1', 'user-1')

        expect(result.status).toBe('UNCLAIMED')
        expect(result.assigneeId).toBeNull()
      })

      it('should throw error when user is not assignee', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: 'CLAIMED',
          assigneeId: 'user-2'
        })

        await expect(taskService.unclaimTask('task-1', 'user-1'))
          .rejects.toThrow('只有被指派者可以取消認領')
      })
    })

    describe('startTask', () => {
      it('should start a CLAIMED task', async () => {
        const claimedTask = { ...mockTask, status: 'CLAIMED' as const, assigneeId: 'user-1' }
        prismaMock.task.findUnique.mockResolvedValue(claimedTask)
        prismaMock.task.update.mockResolvedValue({
          ...claimedTask,
          status: 'IN_PROGRESS',
          startedAt: new Date()
        })

        const result = await taskService.startTask('task-1', 'user-1')

        expect(result.status).toBe('IN_PROGRESS')
        expect(result.startedAt).toBeDefined()
      })

      it('should throw error when user is not assignee', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: 'CLAIMED',
          assigneeId: 'user-2'
        })

        await expect(taskService.startTask('task-1', 'user-1'))
          .rejects.toThrow('只有被指派者可以開始任務')
      })
    })

    describe('pauseTask', () => {
      it('should pause an IN_PROGRESS task', async () => {
        const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as const, assigneeId: 'user-1' }
        prismaMock.task.findUnique.mockResolvedValue(inProgressTask)
        prismaMock.task.update.mockResolvedValue({
          ...inProgressTask,
          status: 'PAUSED'
        })

        const result = await taskService.pauseTask('task-1', 'user-1')

        expect(result.status).toBe('PAUSED')
      })
    })

    describe('resumeTask', () => {
      it('should resume a PAUSED task', async () => {
        const pausedTask = { ...mockTask, status: 'PAUSED' as const, assigneeId: 'user-1' }
        prismaMock.task.findUnique.mockResolvedValue(pausedTask)
        prismaMock.task.update.mockResolvedValue({
          ...pausedTask,
          status: 'IN_PROGRESS'
        })

        const result = await taskService.resumeTask('task-1', 'user-1')

        expect(result.status).toBe('IN_PROGRESS')
      })
    })

    describe('blockTask', () => {
      it('should block an IN_PROGRESS task', async () => {
        const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as const, assigneeId: 'user-1' }
        prismaMock.task.findUnique.mockResolvedValue(inProgressTask)
        prismaMock.task.update.mockResolvedValue({
          ...inProgressTask,
          status: 'BLOCKED'
        })

        const result = await taskService.blockTask('task-1', 'user-1')

        expect(result.status).toBe('BLOCKED')
      })
    })

    describe('unblockTask', () => {
      it('should unblock a BLOCKED task', async () => {
        const blockedTask = { ...mockTask, status: 'BLOCKED' as const, assigneeId: 'user-1' }
        prismaMock.task.findUnique.mockResolvedValue(blockedTask)
        prismaMock.task.update.mockResolvedValue({
          ...blockedTask,
          status: 'IN_PROGRESS'
        })

        const result = await taskService.unblockTask('task-1', 'user-1')

        expect(result.status).toBe('IN_PROGRESS')
      })
    })

    describe('completeTask', () => {
      it('should complete an IN_PROGRESS task', async () => {
        const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as const, assigneeId: 'user-1' }
        prismaMock.task.findUnique.mockResolvedValue(inProgressTask)
        prismaMock.task.update.mockResolvedValue({
          ...inProgressTask,
          status: 'DONE',
          progress: 100,
          completedAt: new Date()
        })

        const result = await taskService.completeTask('task-1', 'user-1')

        expect(result.status).toBe('DONE')
        expect(result.progress).toBe(100)
        expect(result.completedAt).toBeDefined()
      })

      it('should throw error when task is PAUSED', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: 'PAUSED',
          assigneeId: 'user-1'
        })

        await expect(taskService.completeTask('task-1', 'user-1'))
          .rejects.toThrow('無法從 PAUSED 狀態執行 complete 動作')
      })
    })
  })
})
