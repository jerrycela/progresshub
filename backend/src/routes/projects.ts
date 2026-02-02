import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { projectService } from '../services/projectService';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { PermissionLevel } from '@prisma/client';

const router = Router();

// 所有專案路由都需要認證
router.use(authenticate);

/**
 * GET /api/projects
 * 取得專案列表
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['ACTIVE', 'COMPLETED', 'PAUSED']),
    query('search').optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await projectService.getProjects({
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
        status: req.query.status as any,
        search: req.query.search as string,
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
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Failed to get projects' });
    }
  }
);

/**
 * GET /api/projects/:id
 * 取得單一專案
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid project ID')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const project = await projectService.getProjectById(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json(project);
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  }
);

/**
 * GET /api/projects/:id/stats
 * 取得專案統計資訊
 */
router.get(
  '/:id/stats',
  [param('id').isUUID().withMessage('Invalid project ID')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const stats = await projectService.getProjectStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ error: 'Failed to get project stats' });
    }
  }
);

/**
 * GET /api/projects/:id/gantt
 * 取得甘特圖資料
 */
router.get(
  '/:id/gantt',
  [param('id').isUUID().withMessage('Invalid project ID')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const ganttData = await projectService.getGanttData(req.params.id);
      res.json(ganttData);
    } catch (error) {
      console.error('Get gantt data error:', error);
      res.status(500).json({ error: 'Failed to get gantt data' });
    }
  }
);

/**
 * POST /api/projects
 * 建立專案（PM 和 Admin）
 */
router.post(
  '/',
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    body('name').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Name is required (max 200 chars)'),
    body('description').optional().isString().trim(),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      // 驗證結束日期必須在開始日期之後
      if (new Date(req.body.endDate) <= new Date(req.body.startDate)) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }

      const project = await projectService.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

/**
 * PUT /api/projects/:id
 * 更新專案（PM 和 Admin）
 */
router.put(
  '/:id',
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    param('id').isUUID().withMessage('Invalid project ID'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().trim(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('status').optional().isIn(['ACTIVE', 'COMPLETED', 'PAUSED']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existing = await projectService.getProjectById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // 驗證日期（如果有更新）
      const startDate = req.body.startDate ? new Date(req.body.startDate) : existing.startDate;
      const endDate = req.body.endDate ? new Date(req.body.endDate) : existing.endDate;

      if (endDate <= startDate) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }

      const project = await projectService.updateProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

/**
 * DELETE /api/projects/:id
 * 刪除專案（僅 Admin）
 */
router.delete(
  '/:id',
  authorize(PermissionLevel.ADMIN),
  [param('id').isUUID().withMessage('Invalid project ID')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existing = await projectService.getProjectById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      await projectService.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

export default router;
