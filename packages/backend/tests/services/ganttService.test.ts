import { prismaMock } from '../__mocks__/prisma'
import { GanttService } from '../../src/services/ganttService'

describe('GanttService', () => {
  let ganttService: GanttService

  beforeEach(() => {
    ganttService = new GanttService()
  })

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    status: 'ACTIVE' as const,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockMilestone = {
    id: 'milestone-1',
    name: 'Alpha Release',
    description: 'First alpha version',
    dueDate: new Date('2026-03-01'),
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'IN_PROGRESS' as const,
    priority: 'HIGH' as const,
    progress: 50,
    estimatedHours: 8,
    actualHours: null,
    dueDate: new Date('2026-02-15'),
    startedAt: new Date('2026-02-01'),
    completedAt: null,
    projectId: 'project-1',
    milestoneId: 'milestone-1',
    assigneeId: 'user-1',
    createdById: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  describe('getGanttStats', () => {
    it('should return correct statistics', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        { ...mockTask, status: 'UNCLAIMED', progress: 0, priority: 'LOW' },
        { ...mockTask, status: 'CLAIMED', progress: 10, priority: 'MEDIUM' },
        { ...mockTask, status: 'IN_PROGRESS', progress: 50, priority: 'HIGH' },
        { ...mockTask, status: 'PAUSED', progress: 30, priority: 'MEDIUM' },
        { ...mockTask, status: 'BLOCKED', progress: 60, priority: 'URGENT' },
        { ...mockTask, status: 'DONE', progress: 100, priority: 'HIGH' }
      ])

      const stats = await ganttService.getGanttStats({})

      expect(stats.total).toBe(6)
      expect(stats.unclaimed).toBe(1)
      expect(stats.claimed).toBe(1)
      expect(stats.inProgress).toBe(1)
      expect(stats.paused).toBe(1)
      expect(stats.blocked).toBe(1)
      expect(stats.completed).toBe(1)
    })

    it('should count overdue tasks correctly', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      prismaMock.task.findMany.mockResolvedValue([
        { ...mockTask, dueDate: pastDate, status: 'IN_PROGRESS' },
        { ...mockTask, dueDate: pastDate, status: 'DONE' } // Should not count as overdue
      ])

      const stats = await ganttService.getGanttStats({})

      expect(stats.overdue).toBe(1)
    })

    it('should calculate progress distribution correctly', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        { ...mockTask, progress: 0 },   // notStarted
        { ...mockTask, progress: 15 },  // early
        { ...mockTask, progress: 40 },  // midway
        { ...mockTask, progress: 60 },  // advanced
        { ...mockTask, progress: 85 },  // nearComplete
        { ...mockTask, progress: 100 }  // complete
      ])

      const stats = await ganttService.getGanttStats({})

      expect(stats.progressDistribution.notStarted).toBe(1)
      expect(stats.progressDistribution.early).toBe(1)
      expect(stats.progressDistribution.midway).toBe(1)
      expect(stats.progressDistribution.advanced).toBe(1)
      expect(stats.progressDistribution.nearComplete).toBe(1)
      expect(stats.progressDistribution.complete).toBe(1)
    })

    it('should count priorities correctly', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        { ...mockTask, priority: 'LOW' },
        { ...mockTask, priority: 'MEDIUM' },
        { ...mockTask, priority: 'MEDIUM' },
        { ...mockTask, priority: 'HIGH' },
        { ...mockTask, priority: 'URGENT' }
      ])

      const stats = await ganttService.getGanttStats({})

      expect(stats.byPriority.low).toBe(1)
      expect(stats.byPriority.medium).toBe(2)
      expect(stats.byPriority.high).toBe(1)
      expect(stats.byPriority.urgent).toBe(1)
    })

    it('should filter by projectId', async () => {
      prismaMock.task.findMany.mockResolvedValue([mockTask])

      await ganttService.getGanttStats({ projectId: 'project-1' })

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ projectId: 'project-1' }),
        select: expect.any(Object)
      })
    })
  })

  describe('getGanttData', () => {
    it('should return projects, milestones, tasks, and dateRange', async () => {
      ;(prismaMock.task.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockTask,
          project: { name: 'Test Project' },
          milestone: { name: 'Alpha Release' },
          assignee: { name: 'John Doe' }
        }
      ])

      ;(prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockMilestone,
          project: { name: 'Test Project' },
          tasks: [{ id: 'task-1', status: 'IN_PROGRESS' }]
        }
      ])

      ;(prismaMock.project.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProject,
          tasks: [{ progress: 50 }],
          milestones: [{ id: 'milestone-1' }]
        }
      ])

      const result = await ganttService.getGanttData({})

      expect(result.projects).toHaveLength(1)
      expect(result.milestones).toHaveLength(1)
      expect(result.tasks).toHaveLength(1)
      expect(result.dateRange).toBeDefined()
      expect(result.dateRange.start).toBeDefined()
      expect(result.dateRange.end).toBeDefined()
    })

    it('should transform task data correctly', async () => {
      ;(prismaMock.task.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockTask,
          project: { name: 'Test Project' },
          milestone: { name: 'Alpha Release' },
          assignee: { name: 'John Doe' }
        }
      ])

      ;(prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaMock.project.findMany as jest.Mock).mockResolvedValue([])

      const result = await ganttService.getGanttData({})

      expect(result.tasks[0]).toMatchObject({
        id: 'task-1',
        title: 'Test Task',
        status: 'IN_PROGRESS',
        progress: 50,
        projectName: 'Test Project',
        milestoneName: 'Alpha Release',
        assigneeName: 'John Doe'
      })
    })

    it('should transform milestone data correctly', async () => {
      ;(prismaMock.task.findMany as jest.Mock).mockResolvedValue([])

      ;(prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockMilestone,
          project: { name: 'Test Project' },
          tasks: [
            { id: 'task-1', status: 'DONE' },
            { id: 'task-2', status: 'IN_PROGRESS' }
          ]
        }
      ])

      ;(prismaMock.project.findMany as jest.Mock).mockResolvedValue([])

      const result = await ganttService.getGanttData({})

      expect(result.milestones[0]).toMatchObject({
        id: 'milestone-1',
        name: 'Alpha Release',
        projectName: 'Test Project',
        taskCount: 2,
        completedTaskCount: 1
      })
    })

    it('should calculate project progress correctly', async () => {
      ;(prismaMock.task.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([])

      ;(prismaMock.project.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockProject,
          tasks: [
            { progress: 0 },
            { progress: 50 },
            { progress: 100 }
          ],
          milestones: [{ id: 'ms-1' }, { id: 'ms-2' }]
        }
      ])

      const result = await ganttService.getGanttData({})

      expect(result.projects[0].progress).toBe(50) // Average: (0+50+100)/3 = 50
      expect(result.projects[0].taskCount).toBe(3)
      expect(result.projects[0].milestoneCount).toBe(2)
    })

    it('should filter by assigneeId', async () => {
      ;(prismaMock.task.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaMock.milestone.findMany as jest.Mock).mockResolvedValue([])
      ;(prismaMock.project.findMany as jest.Mock).mockResolvedValue([])

      await ganttService.getGanttData({ assigneeId: 'user-1' })

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ assigneeId: 'user-1' }),
        include: expect.any(Object),
        orderBy: expect.any(Array)
      })
    })
  })
})
