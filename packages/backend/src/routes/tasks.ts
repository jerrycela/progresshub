import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { sendSuccess, sendError, sendPaginated } from '../middleware/responseFormatter'
import { taskService } from '../services/taskService'
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  TaskPriority,
  TaskAction
} from '../types/task'
import { AppError } from '../utils/AppError'

const router = Router()

// Helper to handle async route errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// ============================================
// CRUD Routes
// ============================================

// GET /api/tasks - List tasks with pagination and filtering
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const {
    projectId,
    milestoneId,
    assigneeId,
    status,
    priority,
    page = '1',
    limit = '10'
  } = req.query

  const result = await taskService.getTasks({
    projectId: projectId as string,
    milestoneId: milestoneId as string,
    assigneeId: assigneeId as string,
    status: status as TaskStatus,
    priority: priority as TaskPriority,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10)
  })

  return sendPaginated(res, result.tasks, {
    total: result.total,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10)
  })
}))

// GET /api/tasks/my - Get current user's tasks
router.get('/my', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { status } = req.query
  const tasks = await taskService.getTasksByAssignee(
    req.user.userId,
    status as TaskStatus | undefined
  )

  return sendSuccess(res, tasks)
}))

// GET /api/tasks/:id - Get single task
router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const task = await taskService.getTaskById(id)

  if (!task) {
    return sendError(res, 'RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
  }

  return sendSuccess(res, task)
}))

// POST /api/tasks - Create new task
router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const createData: CreateTaskDto = req.body

  // Validation
  if (!createData.title || !createData.title.trim()) {
    return sendError(res, 'VALIDATION_REQUIRED', '任務標題為必填', 400)
  }

  if (!createData.projectId) {
    return sendError(res, 'VALIDATION_REQUIRED', '專案 ID 為必填', 400)
  }

  const task = await taskService.createTask(createData, req.user.userId)

  return sendSuccess(res, task, 201)
}))

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const updateData: UpdateTaskDto = req.body

  const task = await taskService.updateTask(id, updateData)

  return sendSuccess(res, task)
}))

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticate, authorize(['PM', 'PRODUCER', 'MANAGER']), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  await taskService.deleteTask(id)

  return sendSuccess(res, { message: '任務已刪除' })
}))

// ============================================
// Status Transition Routes
// ============================================

// POST /api/tasks/:id/claim - Claim task
router.post('/:id/claim', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.claimTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/unclaim - Unclaim task
router.post('/:id/unclaim', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.unclaimTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/start - Start task
router.post('/:id/start', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.startTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/pause - Pause task
router.post('/:id/pause', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.pauseTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/resume - Resume task
router.post('/:id/resume', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.resumeTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/block - Block task
router.post('/:id/block', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.blockTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/unblock - Unblock task
router.post('/:id/unblock', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.unblockTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

// POST /api/tasks/:id/complete - Complete task
router.post('/:id/complete', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const { id } = req.params
  const task = await taskService.completeTask(id, req.user.userId)

  return sendSuccess(res, task)
}))

export default router
