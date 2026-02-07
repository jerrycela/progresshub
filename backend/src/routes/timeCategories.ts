import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { timeCategoryService } from '../services/timeCategoryService';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { PermissionLevel } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * GET /api/time-categories
 * 取得工時類別列表
 */
router.get(
  '/',
  [query('includeInactive').optional().isBoolean().toBoolean()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // 只有管理員可以看到停用的類別
      let includeInactive = req.query.includeInactive as unknown as boolean;
      if (req.user?.permissionLevel !== 'ADMIN') {
        includeInactive = false;
      }

      const categories = await timeCategoryService.getCategories(includeInactive);
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  }
);

/**
 * GET /api/time-categories/:id
 * 取得單一工時類別
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
      const category = await timeCategoryService.getCategoryById(req.params.id);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      res.json(category);
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json({ error: 'Failed to get category' });
    }
  }
);

/**
 * POST /api/time-categories
 * 建立工時類別（僅限管理員）
 */
router.post(
  '/',
  authorize(PermissionLevel.ADMIN),
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
    body('billable').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const category = await timeCategoryService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(400).json({ error: error.message || 'Failed to create category' });
    }
  }
);

/**
 * PUT /api/time-categories/:id
 * 更新工時類別（僅限管理員）
 */
router.put(
  '/:id',
  authorize(PermissionLevel.ADMIN),
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('billable').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const category = await timeCategoryService.updateCategory(req.params.id, req.body);
      res.json(category);
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(400).json({ error: error.message || 'Failed to update category' });
    }
  }
);

/**
 * POST /api/time-categories/:id/deactivate
 * 停用工時類別（僅限管理員）
 */
router.post(
  '/:id/deactivate',
  authorize(PermissionLevel.ADMIN),
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const category = await timeCategoryService.deactivateCategory(req.params.id);
      res.json(category);
    } catch (error: any) {
      console.error('Deactivate category error:', error);
      res.status(400).json({ error: error.message || 'Failed to deactivate category' });
    }
  }
);

/**
 * POST /api/time-categories/:id/activate
 * 啟用工時類別（僅限管理員）
 */
router.post(
  '/:id/activate',
  authorize(PermissionLevel.ADMIN),
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const category = await timeCategoryService.activateCategory(req.params.id);
      res.json(category);
    } catch (error: any) {
      console.error('Activate category error:', error);
      res.status(400).json({ error: error.message || 'Failed to activate category' });
    }
  }
);

/**
 * DELETE /api/time-categories/:id
 * 刪除工時類別（僅限管理員，需無關聯資料）
 */
router.delete(
  '/:id',
  authorize(PermissionLevel.ADMIN),
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      await timeCategoryService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Delete category error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete category' });
    }
  }
);

/**
 * POST /api/time-categories/initialize
 * 初始化預設類別（僅限管理員）
 */
router.post(
  '/initialize',
  authorize(PermissionLevel.ADMIN),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const categories = await timeCategoryService.initializeDefaultCategories();
      res.json({ message: 'Default categories initialized', categories });
    } catch (error) {
      console.error('Initialize categories error:', error);
      res.status(500).json({ error: 'Failed to initialize categories' });
    }
  }
);

export default router;
