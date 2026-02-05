import request from 'supertest'
import app from '../../src/index'
import { progressService } from '../../src/services/progressService'

// Mock the progressService
jest.mock('../../src/services/progressService')

// Mock the auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { userId: 'user-1', email: 'test@example.com', role: 'EMPLOYEE' }
    next()
  }),
  authorize: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
}))

const mockProgressLog = {
  id: 'log-1',
  content: 'Completed feature X',
  progress: 60,
  hoursSpent: 2,
  taskId: 'task-1',
  taskTitle: 'Test Task',
  projectId: 'project-1',
  projectName: 'Test Project',
  employeeId: 'user-1',
  employeeName: 'John Doe',
  createdAt: '2026-02-06T10:00:00.000Z'
}

const mockSummary = {
  totalLogs: 10,
  totalHoursSpent: 25,
  tasksWorkedOn: 3,
  averageProgress: 65,
  recentLogs: [mockProgressLog]
}

const mockTaskSummary = {
  taskId: 'task-1',
  taskTitle: 'Test Task',
  currentProgress: 60,
  totalHoursSpent: 8,
  logCount: 5,
  lastUpdate: '2026-02-06T10:00:00.000Z'
}

describe('Progress Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/progress', () => {
    it('should create a progress log', async () => {
      ;(progressService.createProgressLog as jest.Mock).mockResolvedValue(mockProgressLog)

      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', 'Bearer valid-token')
        .send({
          taskId: 'task-1',
          content: 'Completed feature X',
          progress: 60,
          hoursSpent: 2
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.progress).toBe(60)
      expect(progressService.createProgressLog).toHaveBeenCalledWith(
        { taskId: 'task-1', content: 'Completed feature X', progress: 60, hoursSpent: 2 },
        'user-1'
      )
    })

    it('should return 400 when taskId is missing', async () => {
      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Test',
          progress: 50
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_REQUIRED')
    })

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', 'Bearer valid-token')
        .send({
          taskId: 'task-1',
          progress: 50
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_REQUIRED')
    })

    it('should return 400 when progress is missing', async () => {
      const response = await request(app)
        .post('/api/progress')
        .set('Authorization', 'Bearer valid-token')
        .send({
          taskId: 'task-1',
          content: 'Test'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_REQUIRED')
    })
  })

  describe('GET /api/progress/my', () => {
    it('should return my progress logs', async () => {
      ;(progressService.getProgressLogsByEmployee as jest.Mock).mockResolvedValue({
        logs: [mockProgressLog],
        total: 1
      })

      const response = await request(app)
        .get('/api/progress/my')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta.total).toBe(1)
      expect(progressService.getProgressLogsByEmployee).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ page: 1, limit: 10 })
      )
    })

    it('should pass query params', async () => {
      ;(progressService.getProgressLogsByEmployee as jest.Mock).mockResolvedValue({
        logs: [],
        total: 0
      })

      await request(app)
        .get('/api/progress/my?taskId=task-1&page=2&limit=5')
        .set('Authorization', 'Bearer valid-token')

      expect(progressService.getProgressLogsByEmployee).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ taskId: 'task-1', page: 2, limit: 5 })
      )
    })

    it('should pass date range params', async () => {
      ;(progressService.getProgressLogsByEmployee as jest.Mock).mockResolvedValue({
        logs: [],
        total: 0
      })

      await request(app)
        .get('/api/progress/my?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', 'Bearer valid-token')

      expect(progressService.getProgressLogsByEmployee).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-01-31' })
      )
    })
  })

  describe('GET /api/progress/summary', () => {
    it('should return my progress summary', async () => {
      ;(progressService.getEmployeeProgressSummary as jest.Mock).mockResolvedValue(mockSummary)

      const response = await request(app)
        .get('/api/progress/summary')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.totalLogs).toBe(10)
      expect(response.body.data.totalHoursSpent).toBe(25)
      expect(response.body.data.tasksWorkedOn).toBe(3)
    })
  })

  describe('GET /api/progress/task/:taskId', () => {
    it('should return progress logs for a task', async () => {
      ;(progressService.getProgressLogsByTask as jest.Mock).mockResolvedValue([mockProgressLog])

      const response = await request(app)
        .get('/api/progress/task/task-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(progressService.getProgressLogsByTask).toHaveBeenCalledWith('task-1')
    })
  })

  describe('GET /api/progress/task/:taskId/summary', () => {
    it('should return task progress summary', async () => {
      ;(progressService.getTaskProgressSummary as jest.Mock).mockResolvedValue(mockTaskSummary)

      const response = await request(app)
        .get('/api/progress/task/task-1/summary')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.taskId).toBe('task-1')
      expect(response.body.data.currentProgress).toBe(60)
      expect(response.body.data.totalHoursSpent).toBe(8)
    })
  })
})
