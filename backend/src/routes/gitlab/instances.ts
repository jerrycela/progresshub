import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { gitLabInstanceService } from '../../services/gitlab';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { PermissionLevel } from '@prisma/client';

const router = Router();

// 所有實例管理路由都需要管理員權限
router.use(authenticate);
router.use(authorize(PermissionLevel.ADMIN));

/**
 * GET /api/gitlab/instances
 * 取得所有 GitLab 實例列表
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const instances = await gitLabInstanceService.getAllInstances(includeInactive);
    res.json({ success: true, instances });
  } catch (error) {
    console.error('Get instances error:', error);
    res.status(500).json({ error: 'Failed to get instances' });
  }
});

/**
 * GET /api/gitlab/instances/:id
 * 取得單一 GitLab 實例
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
      const instance = await gitLabInstanceService.getInstanceById(req.params.id);
      if (!instance) {
        res.status(404).json({ error: 'Instance not found' });
        return;
      }
      res.json({ success: true, instance });
    } catch (error) {
      console.error('Get instance error:', error);
      res.status(500).json({ error: 'Failed to get instance' });
    }
  }
);

/**
 * POST /api/gitlab/instances
 * 新增 GitLab 實例
 */
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('baseUrl').isURL().withMessage('Valid URL is required'),
    body('clientId').isString().trim().notEmpty().withMessage('Client ID is required'),
    body('clientSecret').isString().trim().notEmpty().withMessage('Client Secret is required'),
    body('webhookSecret').optional().isString(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const instance = await gitLabInstanceService.createInstance(req.body);
      res.status(201).json({ success: true, instance });
    } catch (error: unknown) {
      console.error('Create instance error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create instance';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * PUT /api/gitlab/instances/:id
 * 更新 GitLab 實例
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().notEmpty(),
    body('clientId').optional().isString().trim().notEmpty(),
    body('clientSecret').optional().isString().trim().notEmpty(),
    body('webhookSecret').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const instance = await gitLabInstanceService.updateInstance(req.params.id, req.body);
      res.json({ success: true, instance });
    } catch (error: unknown) {
      console.error('Update instance error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update instance';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/gitlab/instances/:id
 * 刪除 GitLab 實例
 */
router.delete(
  '/:id',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      await gitLabInstanceService.deleteInstance(req.params.id);
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Delete instance error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete instance';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/gitlab/instances/:id/test
 * 測試 GitLab 實例連線
 */
router.post(
  '/:id/test',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await gitLabInstanceService.testConnection(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({ error: 'Failed to test connection' });
    }
  }
);

/**
 * POST /api/gitlab/instances/:id/regenerate-webhook-secret
 * 重新生成 Webhook Secret
 */
router.post(
  '/:id/regenerate-webhook-secret',
  [param('id').isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const webhookSecret = await gitLabInstanceService.regenerateWebhookSecret(req.params.id);
      res.json({ success: true, webhookSecret });
    } catch (error) {
      console.error('Regenerate webhook secret error:', error);
      res.status(500).json({ error: 'Failed to regenerate webhook secret' });
    }
  }
);

export default router;
