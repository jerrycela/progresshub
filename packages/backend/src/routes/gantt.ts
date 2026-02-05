import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { sendSuccess } from '../middleware/responseFormatter'
import { ganttService } from '../services/ganttService'
import { GanttQueryParams } from '../types/gantt'
import { TaskStatus } from '../types/task'

const router = Router()

// Helper to handle async route errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Parse query params helper
const parseGanttParams = (query: Request['query']): GanttQueryParams => {
  return {
    projectId: query.projectId as string | undefined,
    milestoneId: query.milestoneId as string | undefined,
    assigneeId: query.assigneeId as string | undefined,
    status: query.status as TaskStatus | undefined,
    startDate: query.startDate as string | undefined,
    endDate: query.endDate as string | undefined
  }
}

// ============================================
// Gantt Routes
// ============================================

// GET /api/gantt - Get full Gantt chart data
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const params = parseGanttParams(req.query)
  const data = await ganttService.getGanttData(params)

  return sendSuccess(res, data)
}))

// GET /api/gantt/stats - Get Gantt statistics
router.get('/stats', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const params = parseGanttParams(req.query)
  const stats = await ganttService.getGanttStats(params)

  return sendSuccess(res, stats)
}))

export default router
