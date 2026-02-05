import { prismaMock } from '../__mocks__/prisma'
import { ProgressService } from '../../src/services/progressService'
import { AppError } from '../../src/utils/AppError'

describe('ProgressService', () => {
  let progressService: ProgressService

  beforeEach(() => {
    progressService = new ProgressService()
  })

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'IN_PROGRESS' as const,
    priority: 'HIGH' as const,
    progress: 50,
    estimatedHours: 8,
    actualHours: 4,
    dueDate: new Date('2026-02-15'),
    startedAt: new Date('2026-02-01'),
    completedAt: null,
    projectId: 'project-1',
    milestoneId: null,
    assigneeId: 'user-1',
    createdById: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockProgressLog = {
    id: 'log-1',
    content: 'Completed feature X',
    progress: 60,
    hoursSpent: 2,
    taskId: 'task-1',
    employeeId: 'user-1',
    createdAt: new Date()
  }

  describe('createProgressLog', () => {
    it('should create a progress log and update task', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        project: { id: 'project-1', name: 'Test Project' }
      })

      ;(prismaMock.$transaction as jest.Mock).mockResolvedValue([
        {
          ...mockProgressLog,
          task: { title: 'Test Task', projectId: 'project-1', project: { name: 'Test Project' } },
          employee: { name: 'John Doe' }
        },
        { ...mockTask, progress: 60 }
      ])

      const result = await progressService.createProgressLog(
        { taskId: 'task-1', content: 'Completed feature X', progress: 60, hoursSpent: 2 },
        'user-1'
      )

      expect(result.progress).toBe(60)
      expect(result.content).toBe('Completed feature X')
      expect(result.taskTitle).toBe('Test Task')
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should throw error for invalid progress value', async () => {
      await expect(
        progressService.createProgressLog(
          { taskId: 'task-1', content: 'Test', progress: 150 },
          'user-1'
        )
      ).rejects.toThrow('進度必須是 0-100 之間的整數')
    })

    it('should throw error for negative progress', async () => {
      await expect(
        progressService.createProgressLog(
          { taskId: 'task-1', content: 'Test', progress: -10 },
          'user-1'
        )
      ).rejects.toThrow('進度必須是 0-100 之間的整數')
    })

    it('should throw error for negative hours', async () => {
      await expect(
        progressService.createProgressLog(
          { taskId: 'task-1', content: 'Test', progress: 50, hoursSpent: -1 },
          'user-1'
        )
      ).rejects.toThrow('工時不能為負數')
    })

    it('should throw error for empty content', async () => {
      await expect(
        progressService.createProgressLog(
          { taskId: 'task-1', content: '   ', progress: 50 },
          'user-1'
        )
      ).rejects.toThrow('進度說明為必填')
    })

    it('should throw error when task not found', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        progressService.createProgressLog(
          { taskId: 'non-existent', content: 'Test', progress: 50 },
          'user-1'
        )
      ).rejects.toThrow('找不到指定的任務')
    })

    it('should throw error when user is not assignee', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        assigneeId: 'user-2'
      })

      await expect(
        progressService.createProgressLog(
          { taskId: 'task-1', content: 'Test', progress: 50 },
          'user-1'
        )
      ).rejects.toThrow('只有被指派者可以回報進度')
    })
  })

  describe('getProgressLogsByEmployee', () => {
    it('should return paginated progress logs', async () => {
      ;(prismaMock.progressLog.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProgressLog,
          task: { title: 'Test Task', projectId: 'project-1', project: { name: 'Test Project' } },
          employee: { name: 'John Doe' }
        }
      ])
      ;(prismaMock.progressLog.count as jest.Mock).mockResolvedValue(1)

      const result = await progressService.getProgressLogsByEmployee('user-1', { page: 1, limit: 10 })

      expect(result.logs).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.logs[0].taskTitle).toBe('Test Task')
    })

    it('should filter by taskId', async () => {
      ;(prismaMock.progressLog.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaMock.progressLog.count as jest.Mock).mockResolvedValue(0)

      await progressService.getProgressLogsByEmployee('user-1', { taskId: 'task-1' })

      expect(prismaMock.progressLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ employeeId: 'user-1', taskId: 'task-1' })
        })
      )
    })

    it('should filter by date range', async () => {
      ;(prismaMock.progressLog.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaMock.progressLog.count as jest.Mock).mockResolvedValue(0)

      await progressService.getProgressLogsByEmployee('user-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      })

      expect(prismaMock.progressLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: 'user-1',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      )
    })
  })

  describe('getProgressLogsByTask', () => {
    it('should return progress logs for a task', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prismaMock.progressLog.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProgressLog,
          task: { title: 'Test Task', projectId: 'project-1', project: { name: 'Test Project' } },
          employee: { name: 'John Doe' }
        }
      ])

      const result = await progressService.getProgressLogsByTask('task-1')

      expect(result).toHaveLength(1)
      expect(result[0].taskId).toBe('task-1')
    })

    it('should throw error when task not found', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(progressService.getProgressLogsByTask('non-existent'))
        .rejects.toThrow('找不到指定的任務')
    })
  })

  describe('getTaskProgressSummary', () => {
    it('should return task progress summary', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
        id: 'task-1',
        title: 'Test Task',
        progress: 60
      })

      ;(prismaMock.progressLog.findMany as jest.Mock).mockResolvedValue([
        { hoursSpent: 2, createdAt: new Date('2026-02-10') },
        { hoursSpent: 3, createdAt: new Date('2026-02-05') }
      ])

      const result = await progressService.getTaskProgressSummary('task-1')

      expect(result.taskId).toBe('task-1')
      expect(result.currentProgress).toBe(60)
      expect(result.totalHoursSpent).toBe(5)
      expect(result.logCount).toBe(2)
      expect(result.lastUpdate).toBeDefined()
    })

    it('should throw error when task not found', async () => {
      ;(prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(progressService.getTaskProgressSummary('non-existent'))
        .rejects.toThrow('找不到指定的任務')
    })
  })

  describe('getEmployeeProgressSummary', () => {
    it('should return employee progress summary', async () => {
      ;(prismaMock.progressLog.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProgressLog,
          taskId: 'task-1',
          progress: 60,
          hoursSpent: 2,
          task: { title: 'Task 1', projectId: 'project-1', project: { name: 'Project 1' } },
          employee: { name: 'John Doe' }
        },
        {
          ...mockProgressLog,
          id: 'log-2',
          taskId: 'task-2',
          progress: 40,
          hoursSpent: 3,
          task: { title: 'Task 2', projectId: 'project-1', project: { name: 'Project 1' } },
          employee: { name: 'John Doe' }
        }
      ])

      const result = await progressService.getEmployeeProgressSummary('user-1')

      expect(result.totalLogs).toBe(2)
      expect(result.totalHoursSpent).toBe(5)
      expect(result.tasksWorkedOn).toBe(2)
      expect(result.averageProgress).toBe(50) // (60 + 40) / 2
      expect(result.recentLogs).toHaveLength(2)
    })
  })
})
