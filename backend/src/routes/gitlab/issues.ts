import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { gitLabIssueService } from '../../services/gitlab';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/gitlab/issues/mappings
 * 取得 Issue 對應列表
 */
router.get('/mappings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const mappings = await gitLabIssueService.getIssueMappings(req.user.userId);
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Get mappings error:', error);
    res.status(500).json({ error: 'Failed to get mappings' });
  }
});

/**
 * POST /api/gitlab/issues/mappings
 * 建立 Issue 與任務的對應
 */
router.post(
  '/mappings',
  [
    body('connectionId').isUUID().withMessage('Connection ID is required'),
    body('gitlabIssueId').isInt().withMessage('GitLab Issue ID is required'),
    body('gitlabIssueIid').isInt().withMessage('GitLab Issue IID is required'),
    body('projectPath').isString().notEmpty().withMessage('Project path is required'),
    body('taskId').isUUID().withMessage('Task ID is required'),
    body('syncDirection')
      .optional()
      .isIn(['GITLAB_TO_TASK', 'TASK_TO_GITLAB', 'BIDIRECTIONAL']),
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

      const mappingId = await gitLabIssueService.createIssueMapping(
        req.user.userId,
        req.body
      );

      res.status(201).json({ success: true, mappingId });
    } catch (error: unknown) {
      console.error('Create mapping error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create mapping';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * DELETE /api/gitlab/issues/mappings/:id
 * 刪除 Issue 對應
 */
router.delete(
  '/mappings/:id',
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

      await gitLabIssueService.deleteIssueMapping(req.params.id, req.user.userId);
      res.status(204).send();
    } catch (error: unknown) {
      console.error('Delete mapping error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete mapping';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/gitlab/issues/sync-from-gitlab/:mappingId
 * 從 GitLab 同步到任務
 */
router.post(
  '/sync-from-gitlab/:mappingId',
  [param('mappingId').isUUID()],
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

      await gitLabIssueService.syncFromGitLab(req.params.mappingId, req.user.userId);
      res.json({ success: true, message: 'Synced from GitLab to task' });
    } catch (error: unknown) {
      console.error('Sync from GitLab error:', error);
      const message = error instanceof Error ? error.message : 'Failed to sync';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/gitlab/issues/sync-to-gitlab/:mappingId
 * 從任務同步到 GitLab
 */
router.post(
  '/sync-to-gitlab/:mappingId',
  [param('mappingId').isUUID()],
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

      await gitLabIssueService.syncToGitLab(req.params.mappingId, req.user.userId);
      res.json({ success: true, message: 'Synced from task to GitLab' });
    } catch (error: unknown) {
      console.error('Sync to GitLab error:', error);
      const message = error instanceof Error ? error.message : 'Failed to sync';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * GET /api/gitlab/issues/search
 * 搜尋 GitLab Issues（用於建立對應）
 */
router.get(
  '/search',
  [
    query('connectionId').isUUID().withMessage('Connection ID is required'),
    query('projectPath').isString().notEmpty().withMessage('Project path is required'),
    query('query').isString().withMessage('Search query is required'),
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

      const issues = await gitLabIssueService.searchIssues(
        req.query.connectionId as string,
        req.query.projectPath as string,
        req.query.query as string,
        req.user.userId
      );

      res.json({ success: true, issues });
    } catch (error: unknown) {
      console.error('Search issues error:', error);
      const message = error instanceof Error ? error.message : 'Failed to search issues';
      res.status(400).json({ error: message });
    }
  }
);

/**
 * POST /api/gitlab/issues/create-from-task
 * 從任務建立 GitLab Issue
 */
router.post(
  '/create-from-task',
  [
    body('connectionId').isUUID().withMessage('Connection ID is required'),
    body('projectPath').isString().notEmpty().withMessage('Project path is required'),
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

      const mappingId = await gitLabIssueService.createIssueFromTask(
        req.body.connectionId,
        req.body.projectPath,
        req.body.taskId,
        req.user.userId
      );

      res.status(201).json({ success: true, mappingId });
    } catch (error: unknown) {
      console.error('Create issue from task error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create issue';
      res.status(400).json({ error: message });
    }
  }
);

export default router;
