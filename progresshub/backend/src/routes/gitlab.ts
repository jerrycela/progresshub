/**
 * GitLab 整合路由
 * 處理 OAuth 授權、同步、活動查詢等功能
 */

import { Router, Response } from 'express';
import { PrismaClient, GitLabActivityType } from '@prisma/client';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { gitlabOAuth, GitLabSyncService } from '../services/gitlab';

const router = Router();
const prisma = new PrismaClient();
const syncService = new GitLabSyncService(prisma);

// 存儲 state 以防 CSRF（簡單實現，生產環境建議用 Redis）
const pendingStates = new Map<string, { userId: string; createdAt: number }>();

// 清理過期的 state（5 分鐘過期）
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingStates.entries()) {
    if (now - data.createdAt > 5 * 60 * 1000) {
      pendingStates.delete(state);
    }
  }
}, 60 * 1000);

/**
 * GET /api/auth/gitlab
 * 導向 GitLab OAuth 授權頁面
 */
router.get('/auth', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!gitlabOAuth.isConfigured()) {
      throw new HttpError('GitLab OAuth 未配置', 500);
    }

    const { url, state } = gitlabOAuth.generateAuthUrl(req.user!.id);

    // 儲存 state 用於 callback 驗證
    pendingStates.set(state, {
      userId: req.user!.id,
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      authUrl: url,
      state,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/gitlab/callback
 * 處理 GitLab OAuth 回調
 */
router.get('/auth/callback', async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      throw new HttpError(`GitLab 授權失敗: ${error_description || error}`, 400);
    }

    if (!code || !state) {
      throw new HttpError('缺少必要參數', 400);
    }

    // 驗證 state
    const stateData = pendingStates.get(state as string);
    if (!stateData) {
      throw new HttpError('無效或過期的授權請求', 400);
    }
    pendingStates.delete(state as string);

    const userId = stateData.userId;

    // 交換 token
    const tokenResponse = await gitlabOAuth.exchangeCodeForToken(code as string);

    // 取得 GitLab 用戶資訊
    const gitlabUser = await gitlabOAuth.getCurrentUser(tokenResponse.access_token);

    // 計算 token 過期時間
    const tokenExpiresAt = gitlabOAuth.calculateTokenExpiry(
      tokenResponse.expires_in,
      tokenResponse.created_at
    );

    // 更新員工的 GitLab 連結資訊
    await prisma.employee.update({
      where: { id: userId },
      data: {
        gitlabId: gitlabUser.id,
        gitlabUsername: gitlabUser.username,
        gitlabAccessToken: tokenResponse.access_token,
        gitlabRefreshToken: tokenResponse.refresh_token,
        gitlabTokenExpiresAt: tokenExpiresAt,
        gitlabConnectedAt: new Date(),
      },
    });

    // 重導向到前端設定頁（帶成功參數）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?gitlab=connected`);
  } catch (error) {
    // 重導向到前端設定頁（帶錯誤參數）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorMessage = error instanceof Error ? error.message : '授權失敗';
    res.redirect(`${frontendUrl}/settings?gitlab=error&message=${encodeURIComponent(errorMessage)}`);
  }
});

/**
 * DELETE /api/auth/gitlab
 * 取消 GitLab 連結
 */
router.delete('/auth', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      select: { gitlabAccessToken: true },
    });

    // 嘗試撤銷 token
    if (employee?.gitlabAccessToken) {
      try {
        await gitlabOAuth.revokeToken(employee.gitlabAccessToken);
      } catch (error) {
        console.warn('Failed to revoke GitLab token:', error);
      }
    }

    // 清除 GitLab 連結資訊
    await prisma.employee.update({
      where: { id: req.user!.id },
      data: {
        gitlabId: null,
        gitlabUsername: null,
        gitlabAccessToken: null,
        gitlabRefreshToken: null,
        gitlabTokenExpiresAt: null,
        gitlabConnectedAt: null,
        gitlabLastSyncAt: null,
      },
    });

    // 刪除該用戶的 GitLab 活動記錄
    await prisma.gitLabActivity.deleteMany({
      where: { employeeId: req.user!.id },
    });

    res.json({
      success: true,
      message: 'GitLab 連結已取消',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gitlab/status
 * 取得 GitLab 連結狀態
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      select: {
        gitlabId: true,
        gitlabUsername: true,
        gitlabConnectedAt: true,
        gitlabLastSyncAt: true,
        _count: {
          select: { gitlabActivities: true },
        },
      },
    });

    const isConnected = !!employee?.gitlabId;

    res.json({
      success: true,
      connected: isConnected,
      ...(isConnected && {
        gitlabId: employee!.gitlabId,
        gitlabUsername: employee!.gitlabUsername,
        connectedAt: employee!.gitlabConnectedAt,
        lastSyncAt: employee!.gitlabLastSyncAt,
        activitiesCount: employee!._count.gitlabActivities,
      }),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gitlab/sync
 * 手動觸發同步
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { days = 7 } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id: req.user!.id },
      select: { gitlabId: true },
    });

    if (!employee?.gitlabId) {
      throw new HttpError('GitLab 帳號未連結', 400);
    }

    const result = await syncService.syncUserActivities(req.user!.id, days);

    res.json({
      success: result.success,
      commitsCount: result.commitsCount,
      issuesCount: result.issuesCount,
      message: result.success
        ? `同步完成：${result.commitsCount} 筆 commits, ${result.issuesCount} 筆 issues`
        : result.errors.join(', '),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gitlab/activities
 * 取得同步的 GitLab 活動
 */
router.get('/activities', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { type, limit = '50', offset = '0' } = req.query;

    const activityType = type
      ? (type as string).toUpperCase() as GitLabActivityType
      : undefined;

    const { activities, total } = await syncService.getUserActivities(req.user!.id, {
      type: activityType,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });

    res.json({
      success: true,
      activities,
      total,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/gitlab/activities/:id/link
 * 關聯 GitLab 活動到 Task
 */
router.post('/activities/:id/link', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { taskId } = req.body;

    if (!taskId) {
      throw new HttpError('缺少 taskId', 400);
    }

    // 驗證活動屬於當前用戶
    const activity = await prisma.gitLabActivity.findFirst({
      where: { id, employeeId: req.user!.id },
    });

    if (!activity) {
      throw new HttpError('活動不存在', 404);
    }

    // 驗證 Task 存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new HttpError('Task 不存在', 404);
    }

    await syncService.linkActivityToTask(id, taskId);

    res.json({
      success: true,
      message: '已關聯至任務',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/gitlab/activities/:id/link
 * 取消關聯 GitLab 活動
 */
router.delete('/activities/:id/link', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    // 驗證活動屬於當前用戶
    const activity = await prisma.gitLabActivity.findFirst({
      where: { id, employeeId: req.user!.id },
    });

    if (!activity) {
      throw new HttpError('活動不存在', 404);
    }

    await syncService.unlinkActivityFromTask(id);

    res.json({
      success: true,
      message: '已取消關聯',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gitlab/config
 * 取得 GitLab 配置狀態（是否已配置）
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configured: gitlabOAuth.isConfigured(),
    gitlabUrl: process.env.GITLAB_URL || null,
  });
});

export default router;
