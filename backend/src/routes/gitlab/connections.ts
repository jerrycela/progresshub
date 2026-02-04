import { Router, Response, Request } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../../config/database';
import { gitLabInstanceService, gitLabOAuthService, gitLabActivityService } from '../../services/gitlab';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/gitlab/connections
 * 取得當前使用者的 GitLab 連結
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const connections = await prisma.gitLabConnection.findMany({
      where: { employeeId: req.user.userId },
      include: {
        instance: {
          select: { id: true, name: true, baseUrl: true },
        },
        _count: {
          select: { activities: true, issueMappings: true },
        },
      },
      orderBy: { connectedAt: 'desc' },
    });

    res.json({
      success: true,
      connections: connections.map((c) => ({
        id: c.id,
        gitlabUsername: c.gitlabUsername,
        instance: c.instance,
        autoConvertTime: c.autoConvertTime,
        syncCommits: c.syncCommits,
        syncMRs: c.syncMRs,
        syncIssues: c.syncIssues,
        connectedAt: c.connectedAt,
        lastSyncAt: c.lastSyncAt,
        isActive: c.isActive,
        activityCount: c._count.activities,
        issueMappingCount: c._count.issueMappings,
      })),
    });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

/**
 * GET /api/gitlab/connections/available-instances
 * 取得可連結的 GitLab 實例列表
 */
router.get('/available-instances', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // 取得所有活躍實例
    const instances = await gitLabInstanceService.getAllInstances(false);

    // 取得使用者已連結的實例 IDs
    const connectedInstances = await prisma.gitLabConnection.findMany({
      where: { employeeId: req.user.userId, isActive: true },
      select: { instanceId: true },
    });
    const connectedIds = new Set(connectedInstances.map((c) => c.instanceId));

    // 過濾出尚未連結的實例
    const availableInstances = instances.filter((i) => !connectedIds.has(i.id));

    res.json({ success: true, instances: availableInstances });
  } catch (error) {
    console.error('Get available instances error:', error);
    res.status(500).json({ error: 'Failed to get available instances' });
  }
});

/**
 * GET /api/gitlab/connections/oauth/:instanceId
 * 取得 OAuth 授權 URL
 */
router.get(
  '/oauth/:instanceId',
  authenticate,
  [param('instanceId').isUUID()],
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

      const { authUrl, state } = await gitLabOAuthService.generateAuthUrl(
        req.params.instanceId,
        req.user.userId
      );

      res.json({ success: true, authUrl, state });
    } catch (error: unknown) {
      console.error('Generate auth URL error:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate auth URL';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * GET /api/gitlab/connections/oauth/callback
 * OAuth 回調處理
 */
router.get('/oauth/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      // 重導向到前端錯誤頁面
      res.redirect(
        `/gitlab/connect/error?message=${encodeURIComponent(String(error_description || oauthError))}`
      );
      return;
    }

    if (!code || !state) {
      res.redirect('/gitlab/connect/error?message=Missing code or state parameter');
      return;
    }

    // 驗證 state
    const stateData = gitLabOAuthService.verifyState(String(state));
    if (!stateData) {
      res.redirect('/gitlab/connect/error?message=Invalid or expired state');
      return;
    }

    // 換取 tokens
    const tokens = await gitLabOAuthService.exchangeCodeForTokens(
      stateData.instanceId,
      String(code)
    );

    // 建立連結
    const connectionId = await gitLabOAuthService.createConnection(
      stateData.employeeId,
      stateData.instanceId,
      tokens
    );

    // 重導向到前端成功頁面
    res.redirect(`/gitlab/connect/success?connectionId=${connectionId}`);
  } catch (error: unknown) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Failed to complete OAuth';
    res.redirect(`/gitlab/connect/error?message=${encodeURIComponent(message)}`);
  }
});

/**
 * PUT /api/gitlab/connections/:id/settings
 * 更新連結設定
 */
router.put(
  '/:id/settings',
  authenticate,
  [
    param('id').isUUID(),
    body('autoConvertTime').optional().isBoolean(),
    body('syncCommits').optional().isBoolean(),
    body('syncMRs').optional().isBoolean(),
    body('syncIssues').optional().isBoolean(),
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

      // 驗證連結所有權
      const connection = await prisma.gitLabConnection.findUnique({
        where: { id: req.params.id },
      });

      if (!connection || connection.employeeId !== req.user.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      const { autoConvertTime, syncCommits, syncMRs, syncIssues } = req.body;

      const updated = await prisma.gitLabConnection.update({
        where: { id: req.params.id },
        data: {
          ...(autoConvertTime !== undefined && { autoConvertTime }),
          ...(syncCommits !== undefined && { syncCommits }),
          ...(syncMRs !== undefined && { syncMRs }),
          ...(syncIssues !== undefined && { syncIssues }),
        },
      });

      res.json({
        success: true,
        settings: {
          autoConvertTime: updated.autoConvertTime,
          syncCommits: updated.syncCommits,
          syncMRs: updated.syncMRs,
          syncIssues: updated.syncIssues,
        },
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

/**
 * DELETE /api/gitlab/connections/:id
 * 斷開 GitLab 連結
 */
router.delete(
  '/:id',
  authenticate,
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

      // 驗證連結所有權
      const connection = await prisma.gitLabConnection.findUnique({
        where: { id: req.params.id },
      });

      if (!connection || connection.employeeId !== req.user.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      // 撤銷 OAuth token
      try {
        await gitLabOAuthService.revokeToken(req.params.id);
      } catch {
        // 忽略撤銷失敗
      }

      // 停用連結（保留歷史記錄）
      await prisma.gitLabConnection.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Delete connection error:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  }
);

/**
 * POST /api/gitlab/connections/:id/sync
 * 手動觸發同步
 */
router.post(
  '/:id/sync',
  authenticate,
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

      // 驗證連結所有權
      const connection = await prisma.gitLabConnection.findUnique({
        where: { id: req.params.id },
      });

      if (!connection || connection.employeeId !== req.user.userId) {
        res.status(404).json({ error: 'Connection not found' });
        return;
      }

      if (!connection.isActive) {
        res.status(400).json({ error: 'Connection is not active' });
        return;
      }

      // 同步最近 7 天的活動
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const syncedCount = await gitLabActivityService.syncActivities(req.params.id, since);

      res.json({ success: true, syncedCount });
    } catch (error: unknown) {
      console.error('Sync error:', error);
      const message = error instanceof Error ? error.message : 'Failed to sync';
      res.status(500).json({ error: message });
    }
  }
);

export default router;
