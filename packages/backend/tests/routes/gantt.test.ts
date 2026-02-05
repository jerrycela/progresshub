import request from 'supertest'
import app from '../../src/index'
import { ganttService } from '../../src/services/ganttService'

// Mock the ganttService
jest.mock('../../src/services/ganttService')

// Mock the auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { userId: 'user-1', email: 'test@example.com', role: 'EMPLOYEE' }
    next()
  }),
  authorize: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
}))

const mockGanttData = {
  projects: [
    {
      id: 'project-1',
      name: 'Test Project',
      description: null,
      status: 'ACTIVE',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-06-30T00:00:00.000Z',
      taskCount: 5,
      milestoneCount: 2,
      progress: 50
    }
  ],
  milestones: [
    {
      id: 'milestone-1',
      name: 'Alpha Release',
      description: null,
      date: '2026-03-01T00:00:00.000Z',
      projectId: 'project-1',
      projectName: 'Test Project',
      taskCount: 3,
      completedTaskCount: 1
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Test Task',
      description: null,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      progress: 50,
      startDate: '2026-02-01T00:00:00.000Z',
      dueDate: '2026-02-15T00:00:00.000Z',
      projectId: 'project-1',
      projectName: 'Test Project',
      milestoneId: 'milestone-1',
      milestoneName: 'Alpha Release',
      assigneeId: 'user-1',
      assigneeName: 'John Doe',
      isOverdue: false
    }
  ],
  dateRange: {
    start: '2026-01-01T00:00:00.000Z',
    end: '2026-06-30T00:00:00.000Z'
  }
}

const mockGanttStats = {
  total: 10,
  unclaimed: 2,
  claimed: 1,
  inProgress: 3,
  paused: 1,
  blocked: 1,
  completed: 2,
  overdue: 1,
  progressDistribution: {
    notStarted: 2,
    early: 1,
    midway: 2,
    advanced: 2,
    nearComplete: 1,
    complete: 2
  },
  byPriority: {
    low: 2,
    medium: 4,
    high: 3,
    urgent: 1
  }
}

describe('Gantt Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/gantt', () => {
    it('should return gantt data', async () => {
      ;(ganttService.getGanttData as jest.Mock).mockResolvedValue(mockGanttData)

      const response = await request(app)
        .get('/api/gantt')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.projects).toHaveLength(1)
      expect(response.body.data.milestones).toHaveLength(1)
      expect(response.body.data.tasks).toHaveLength(1)
      expect(response.body.data.dateRange).toBeDefined()
    })

    it('should pass query params to service', async () => {
      ;(ganttService.getGanttData as jest.Mock).mockResolvedValue(mockGanttData)

      await request(app)
        .get('/api/gantt?projectId=project-1&status=IN_PROGRESS')
        .set('Authorization', 'Bearer valid-token')

      expect(ganttService.getGanttData).toHaveBeenCalledWith({
        projectId: 'project-1',
        milestoneId: undefined,
        assigneeId: undefined,
        status: 'IN_PROGRESS',
        startDate: undefined,
        endDate: undefined
      })
    })

    it('should pass date range params to service', async () => {
      ;(ganttService.getGanttData as jest.Mock).mockResolvedValue(mockGanttData)

      await request(app)
        .get('/api/gantt?startDate=2026-01-01&endDate=2026-03-31')
        .set('Authorization', 'Bearer valid-token')

      expect(ganttService.getGanttData).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-01-01',
          endDate: '2026-03-31'
        })
      )
    })

    it('should filter by assigneeId', async () => {
      ;(ganttService.getGanttData as jest.Mock).mockResolvedValue(mockGanttData)

      await request(app)
        .get('/api/gantt?assigneeId=user-1')
        .set('Authorization', 'Bearer valid-token')

      expect(ganttService.getGanttData).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: 'user-1'
        })
      )
    })
  })

  describe('GET /api/gantt/stats', () => {
    it('should return gantt statistics', async () => {
      ;(ganttService.getGanttStats as jest.Mock).mockResolvedValue(mockGanttStats)

      const response = await request(app)
        .get('/api/gantt/stats')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBe(10)
      expect(response.body.data.inProgress).toBe(3)
      expect(response.body.data.completed).toBe(2)
      expect(response.body.data.overdue).toBe(1)
    })

    it('should include progress distribution', async () => {
      ;(ganttService.getGanttStats as jest.Mock).mockResolvedValue(mockGanttStats)

      const response = await request(app)
        .get('/api/gantt/stats')
        .set('Authorization', 'Bearer valid-token')

      expect(response.body.data.progressDistribution).toBeDefined()
      expect(response.body.data.progressDistribution.notStarted).toBe(2)
      expect(response.body.data.progressDistribution.complete).toBe(2)
    })

    it('should include priority breakdown', async () => {
      ;(ganttService.getGanttStats as jest.Mock).mockResolvedValue(mockGanttStats)

      const response = await request(app)
        .get('/api/gantt/stats')
        .set('Authorization', 'Bearer valid-token')

      expect(response.body.data.byPriority).toBeDefined()
      expect(response.body.data.byPriority.high).toBe(3)
      expect(response.body.data.byPriority.urgent).toBe(1)
    })

    it('should pass query params to service', async () => {
      ;(ganttService.getGanttStats as jest.Mock).mockResolvedValue(mockGanttStats)

      await request(app)
        .get('/api/gantt/stats?projectId=project-1')
        .set('Authorization', 'Bearer valid-token')

      expect(ganttService.getGanttStats).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1'
        })
      )
    })
  })
})
