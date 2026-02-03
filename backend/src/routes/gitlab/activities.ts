import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../../config/database';
import { gitLabActivityService } from '../../services/gitlab';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { GitLabActivityType } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * GET /api/gitlab/activities
 * 取得 GitLab 活動列表
 */
router.get(
  '/',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('type').optional().isIn(Object.values(GitLabActivityType)),
    query('projectPath').optional().isString(),
    query('converted').optional().isBoolean(),
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
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const options = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        type: req.query.type as GitLabActivityType | undefined,
        projectPath: req.query.projectPath as string | undefined,
        converted: req.query.converted === 'true' ? true : req.query.converted === 'false' ? false : undefined,
        page: (req.query.page as unknown as number) || 1,
        limit: (req.query.limit as unknown as number) || 50,
      };

      const result = await gitLabActivityService.getActivities(req.user.userId, options);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to get activities' });
    }
  }
);

/**
 * GET /api/gitlab/activities/summary
 * 取得活動統計摘要
 */
router.get(
  '/summary',
  [
    query('startDate').isISO8601().withMessage('Start date is required'),
    query('endDate').isISO8601().withMessage('End date is required'),
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

      const summary = await gitLabActivityService.getActivitySummary(
        req.user.userId,
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );

      res.json({ success: true, summary });
    } catch (error) {
      console.error('Get summary error:', error);
      res.status(500).json({ error: 'Failed to get summary' });
    }
  }
);

/**
 * GET /api/gitlab/activities/:id
 * 取得單一活動詳情
 */
router.get(
  '/:id',
  [param('id').isUUID()],
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

      const activity = await prisma.gitLabActivity.findUnique({
        where: { id: req.params.id },
        include: {
          connection: {
            select: {
              employeeId: true,
              gitlabUsername: true,
              instance: { select: { name: true, baseUrl: true } },
            },
          },
          task: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
          timeEntry: { select: { id: true, hours: true, status: true } },
        },
      });

      if (!activity || activity.connection.employeeId !== req.user.userId) {
        res.status(404).json({ error: 'Activity not found' });
        return;
      }

      res.json({ success: true, activity });
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: 'Failed to get activity' });
    }
  }
);

/**
 * POST /api/gitlab/activities/:id/convert
 * 將活動轉換為工時記錄
 */
router.post(
  '/:id/convert',
  [
    param('id').isUUID(),
    body('hours').isFloat({ min: 0.25, max: 12 }).withMessage('Hours must be between 0.25 and 12'),
    body('categoryId').isUUID().withMessage('Category ID is required'),
    body('description').optional().isString(),
    body('taskId').isUUID().withMessage('Task ID is required'),
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

      const timeEntryId = await gitLabActivityService.convertToTimeEntry(
        req.params.id,
        req.user.userId,
        req.body
      );

      res.json({ success: true, timeEntryId });
    } catch (error: unknown) {
      console.error('Convert activity error:', error);
      const message = error instanceof Error ? error.message : 'Failed to convert activity';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/gitlab/activities/batch-convert
 * 批次轉換活動為工時記錄
 */
router.post(
  '/batch-convert',
  [
    body('activityIds').isArray({ min: 1 }).withMessage('At least one activity ID is required'),
    body('activityIds.*').isUUID(),
    body('categoryId').isUUID().withMessage('Category ID is required'),
    body('useSuggestedHours').isBoolean().withMessage('useSuggestedHours is required'),
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

      const result = await gitLabActivityService.batchConvertToTimeEntries(
        req.user.userId,
        req.body
      );

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Batch convert error:', error);
      res.status(500).json({ error: 'Failed to batch convert activities' });
    }
  }
);

/**
 * PUT /api/gitlab/activities/:id/link-task
 * 將活動關聯到任務
 */
router.put(
  '/:id/link-task',
  [
    param('id').isUUID(),
    body('taskId').isUUID().withMessage('Task ID is required'),
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

      await gitLabActivityService.linkActivityToTask(
        req.params.id,
        req.user.userId,
        req.body.taskId
      );

      res.json({ success: true });
    } catch (error: unknown) {
      console.error('Link task error:', error);
      const message = error instanceof Error ? error.message : 'Failed to link task';
      res.status(400).json({ error: message });
    }
  }
);

export default router;
