import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { sendSuccess, sendError, sendPaginated } from '../middleware/responseFormatter'
import { progressService } from '../services/progressService'
import { CreateProgressLogDto, ProgressQueryParams } from '../types/progress'

const router = Router()

// Helper to handle async route errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// ============================================
// Progress Routes
// ============================================

// POST /api/progress - Create progress log
router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const data: CreateProgressLogDto = req.body

  // Validation
  if (!data.taskId) {
    return sendError(res, 'VALIDATION_REQUIRED', '任務 ID 為必填', 400)
  }

  if (!data.content || !data.content.trim()) {
    return sendError(res, 'VALIDATION_REQUIRED', '進度說明為必填', 400)
  }

  if (data.progress === undefined || data.progress === null) {
    return sendError(res, 'VALIDATION_REQUIRED', '進度為必填', 400)
  }

  const log = await progressService.createProgressLog(data, req.user.userId)

  return sendSuccess(res, log, 201)
}))

// GET /api/progress/my - Get my progress logs
router.get('/my', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const params: ProgressQueryParams = {
    taskId: req.query.taskId as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10
  }

  const result = await progressService.getProgressLogsByEmployee(req.user.userId, params)

  return sendPaginated(res, result.logs, {
    total: result.total,
    page: params.page || 1,
    limit: params.limit || 10
  })
}))

// GET /api/progress/summary - Get my progress summary
router.get('/summary', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  const summary = await progressService.getEmployeeProgressSummary(req.user.userId)

  return sendSuccess(res, summary)
}))

// GET /api/progress/task/:taskId - Get progress logs for a task
router.get('/task/:taskId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params
  const logs = await progressService.getProgressLogsByTask(taskId)

  return sendSuccess(res, logs)
}))

// GET /api/progress/task/:taskId/summary - Get task progress summary
router.get('/task/:taskId/summary', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params
  const summary = await progressService.getTaskProgressSummary(taskId)

  return sendSuccess(res, summary)
}))

export default router
