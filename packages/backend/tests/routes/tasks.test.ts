import request from 'supertest'
import app from '../../src/index'
import { taskService } from '../../src/services/taskService'
import { TaskStatus } from '../../src/types/task'

// Mock the taskService
jest.mock('../../src/services/taskService')

// Mock the auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { userId: 'user-1', email: 'test@example.com', role: 'EMPLOYEE' }
    next()
  }),
  authorize: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
}))

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'UNCLAIMED',
  priority: 'MEDIUM',
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

describe('Task Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================
  // CRUD Tests
  // ============================================

  describe('GET /api/tasks', () => {
    it('should return paginated tasks', async () => {
      ;(taskService.getTasks as jest.Mock).mockResolvedValue({
        tasks: [mockTask],
        total: 1
      })

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false
      })
    })

    it('should filter by projectId', async () => {
      ;(taskService.getTasks as jest.Mock).mockResolvedValue({
        tasks: [],
        total: 0
      })

      await request(app)
        .get('/api/tasks?projectId=project-1')
        .set('Authorization', 'Bearer valid-token')

      expect(taskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'project-1' })
      )
    })

    it('should filter by status', async () => {
      ;(taskService.getTasks as jest.Mock).mockResolvedValue({
        tasks: [],
        total: 0
      })

      await request(app)
        .get('/api/tasks?status=IN_PROGRESS')
        .set('Authorization', 'Bearer valid-token')

      expect(taskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PROGRESS' })
      )
    })
  })

  describe('GET /api/tasks/my', () => {
    it('should return current user tasks', async () => {
      ;(taskService.getTasksByAssignee as jest.Mock).mockResolvedValue([
        { ...mockTask, assigneeId: 'user-1', status: 'CLAIMED' }
      ])

      const response = await request(app)
        .get('/api/tasks/my')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(taskService.getTasksByAssignee).toHaveBeenCalledWith('user-1', undefined)
    })

    it('should filter by status', async () => {
      ;(taskService.getTasksByAssignee as jest.Mock).mockResolvedValue([])

      await request(app)
        .get('/api/tasks/my?status=IN_PROGRESS')
        .set('Authorization', 'Bearer valid-token')

      expect(taskService.getTasksByAssignee).toHaveBeenCalledWith('user-1', 'IN_PROGRESS')
    })
  })

  describe('GET /api/tasks/:id', () => {
    it('should return task by id', async () => {
      ;(taskService.getTaskById as jest.Mock).mockResolvedValue(mockTask)

      const response = await request(app)
        .get('/api/tasks/task-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe('task-1')
    })

    it('should return 404 when task not found', async () => {
      ;(taskService.getTaskById as jest.Mock).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/tasks/non-existent')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND')
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      ;(taskService.createTask as jest.Mock).mockResolvedValue(mockTask)

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Task',
          projectId: 'project-1'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(taskService.createTask).toHaveBeenCalledWith(
        { title: 'New Task', projectId: 'project-1' },
        'user-1'
      )
    })

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          projectId: 'project-1'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_REQUIRED')
    })

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Task'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_REQUIRED')
    })
  })

  describe('PUT /api/tasks/:id', () => {
    it('should update task', async () => {
      ;(taskService.updateTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        title: 'Updated Title'
      })

      const response = await request(app)
        .put('/api/tasks/task-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated Title' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe('Updated Title')
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      ;(taskService.deleteTask as jest.Mock).mockResolvedValue(undefined)

      const response = await request(app)
        .delete('/api/tasks/task-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toBe('任務已刪除')
    })
  })

  // ============================================
  // Status Transition Tests
  // ============================================

  describe('POST /api/tasks/:id/claim', () => {
    it('should claim task', async () => {
      ;(taskService.claimTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'CLAIMED',
        assigneeId: 'user-1'
      })

      const response = await request(app)
        .post('/api/tasks/task-1/claim')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('CLAIMED')
      expect(taskService.claimTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/unclaim', () => {
    it('should unclaim task', async () => {
      ;(taskService.unclaimTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'UNCLAIMED',
        assigneeId: null
      })

      const response = await request(app)
        .post('/api/tasks/task-1/unclaim')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('UNCLAIMED')
      expect(taskService.unclaimTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/start', () => {
    it('should start task', async () => {
      ;(taskService.startTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      })

      const response = await request(app)
        .post('/api/tasks/task-1/start')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('IN_PROGRESS')
      expect(taskService.startTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/pause', () => {
    it('should pause task', async () => {
      ;(taskService.pauseTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'PAUSED'
      })

      const response = await request(app)
        .post('/api/tasks/task-1/pause')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('PAUSED')
      expect(taskService.pauseTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/resume', () => {
    it('should resume task', async () => {
      ;(taskService.resumeTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS'
      })

      const response = await request(app)
        .post('/api/tasks/task-1/resume')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('IN_PROGRESS')
      expect(taskService.resumeTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/block', () => {
    it('should block task', async () => {
      ;(taskService.blockTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'BLOCKED'
      })

      const response = await request(app)
        .post('/api/tasks/task-1/block')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('BLOCKED')
      expect(taskService.blockTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/unblock', () => {
    it('should unblock task', async () => {
      ;(taskService.unblockTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS'
      })

      const response = await request(app)
        .post('/api/tasks/task-1/unblock')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('IN_PROGRESS')
      expect(taskService.unblockTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })

  describe('POST /api/tasks/:id/complete', () => {
    it('should complete task', async () => {
      ;(taskService.completeTask as jest.Mock).mockResolvedValue({
        ...mockTask,
        status: 'DONE',
        progress: 100,
        completedAt: new Date()
      })

      const response = await request(app)
        .post('/api/tasks/task-1/complete')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('DONE')
      expect(response.body.data.progress).toBe(100)
      expect(taskService.completeTask).toHaveBeenCalledWith('task-1', 'user-1')
    })
  })
})
