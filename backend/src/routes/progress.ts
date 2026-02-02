import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { progressService } from '../services/progressService';
import { taskService } from '../services/taskService';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有進度路由都需要認證
router.use(authenticate);

/**
 * GET /api/progress
 * 取得進度記錄列表
 */
router.get(
  '/',
  [
    query('taskId').optional().isUUID(),
    query('employeeId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await progressService.getProgressLogs({
        taskId: req.query.taskId as string,
        employeeId: req.query.employeeId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
      });

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: Math.ceil(result.total / (Number(req.query.limit) || 20)),
        },
      });
    } catch (error) {
      console.error('Get progress logs error:', error);
      res.status(500).json({ error: 'Failed to get progress logs' });
    }
  }
);

/**
 * GET /api/progress/today
 * 取得當前使用者今日進度回報狀態
 */
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const status = await progressService.getTodayProgressStatus(req.user.userId);
    res.json(status);
  } catch (error) {
    console.error('Get today progress error:', error);
    res.status(500).json({ error: 'Failed to get today progress status' });
  }
});

/**
 * GET /api/progress/project/:projectId/stats
 * 取得專案進度統計（近 N 天）
 */
router.get(
  '/project/:projectId/stats',
  [
    param('projectId').isUUID().withMessage('Invalid project ID'),
    query('days').optional().isInt({ min: 1, max: 90 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const days = (req.query.days as unknown as number) || 7;
      const stats = await progressService.getProjectProgressStats(req.params.projectId, days);
      res.json(stats);
    } catch (error) {
      console.error('Get project progress stats error:', error);
      res.status(500).json({ error: 'Failed to get project progress stats' });
    }
  }
);

/**
 * POST /api/progress
 * 回報進度
 */
router.post(
  '/',
  [
    body('taskId').isUUID().withMessage('Valid task ID is required'),
    body('progressPercentage')
      .isInt({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100'),
    body('notes').optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { taskId, progressPercentage, notes } = req.body;

      // 驗證任務存在
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // 驗證使用者是任務的負責人或協作者
      const isAssigned = task.assignedToId === req.user.userId;
      const isCollaborator = task.collaborators.includes(req.user.userId);

      if (!isAssigned && !isCollaborator) {
        res.status(403).json({ error: 'You are not assigned to this task' });
        return;
      }

      const progressLog = await progressService.createProgressLog({
        taskId,
        employeeId: req.user.userId,
        progressPercentage,
        notes,
      });

      res.status(201).json(progressLog);
    } catch (error) {
      console.error('Create progress log error:', error);
      res.status(500).json({ error: 'Failed to create progress log' });
    }
  }
);

export default router;
