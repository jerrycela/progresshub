import { Router, Response, Request } from "express";
import { body, param, validationResult } from "express-validator";
import prisma from "../../config/database";
import {
  gitLabInstanceService,
  gitLabOAuthService,
  gitLabActivityService,
} from "../../services/gitlab";
import { authenticate, AuthRequest } from "../../middleware/auth";
import {
  sendSuccess,
  sendError,
  getSafeErrorMessage,
} from "../../utils/response";

const router = Router();

/**
 * GET /api/gitlab/connections
 * 取得當前使用者的 GitLab 連結
 */
router.get(
  "/",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
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
        orderBy: { connectedAt: "desc" },
      });

      sendSuccess(
        res,
        connections.map((c) => ({
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
      );
    } catch (error) {
      sendError(
        res,
        "GITLAB_CONNECTIONS_FETCH_FAILED",
        "Failed to get connections",
        500,
      );
    }
  },
);

/**
 * GET /api/gitlab/connections/available-instances
 * 取得可連結的 GitLab 實例列表
 */
router.get(
  "/available-instances",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
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
      const availableInstances = instances.filter(
        (i) => !connectedIds.has(i.id),
      );

      sendSuccess(res, availableInstances);
    } catch (error) {
      sendError(
        res,
        "GITLAB_INSTANCES_FETCH_FAILED",
        "Failed to get available instances",
        500,
      );
    }
  },
);

/**
 * GET /api/gitlab/connections/oauth/:instanceId
 * 取得 OAuth 授權 URL
 */
router.get(
  "/oauth/:instanceId",
  authenticate,
  [param("instanceId").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const { authUrl, state } = await gitLabOAuthService.generateAuthUrl(
        req.params.instanceId,
        req.user.userId,
      );

      sendSuccess(res, { authUrl, state });
    } catch (error: unknown) {
      sendError(
        res,
        "GITLAB_OAUTH_URL_FAILED",
        getSafeErrorMessage(error, "Failed to generate auth URL"),
        400,
      );
    }
  },
);

/**
 * GET /api/gitlab/connections/oauth/callback
 * OAuth 回調處理（重導向流程，不使用標準 API 回應格式）
 */
router.get(
  "/oauth/callback",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error: oauthError, error_description } = req.query;

      if (oauthError) {
        res.redirect(
          `/gitlab/connect/error?message=${encodeURIComponent(String(error_description || oauthError))}`,
        );
        return;
      }

      if (!code || !state) {
        res.redirect(
          "/gitlab/connect/error?message=Missing code or state parameter",
        );
        return;
      }

      // 驗證 state
      const stateData = gitLabOAuthService.verifyState(String(state));
      if (!stateData) {
        res.redirect("/gitlab/connect/error?message=Invalid or expired state");
        return;
      }

      // 換取 tokens
      const tokens = await gitLabOAuthService.exchangeCodeForTokens(
        stateData.instanceId,
        String(code),
      );

      // 建立連結
      const connectionId = await gitLabOAuthService.createConnection(
        stateData.employeeId,
        stateData.instanceId,
        tokens,
      );

      // 重導向到前端成功頁面
      res.redirect(`/gitlab/connect/success?connectionId=${connectionId}`);
    } catch (error: unknown) {
      const message = getSafeErrorMessage(error, "Failed to complete OAuth");
      res.redirect(
        `/gitlab/connect/error?message=${encodeURIComponent(message)}`,
      );
    }
  },
);

/**
 * PUT /api/gitlab/connections/:id/settings
 * 更新連結設定
 */
router.put(
  "/:id/settings",
  authenticate,
  [
    param("id").isUUID(),
    body("autoConvertTime").optional().isBoolean(),
    body("syncCommits").optional().isBoolean(),
    body("syncMRs").optional().isBoolean(),
    body("syncIssues").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      // 驗證連結所有權
      const connection = await prisma.gitLabConnection.findUnique({
        where: { id: req.params.id },
      });

      if (!connection || connection.employeeId !== req.user.userId) {
        sendError(
          res,
          "GITLAB_CONNECTION_NOT_FOUND",
          "Connection not found",
          404,
        );
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

      sendSuccess(res, {
        autoConvertTime: updated.autoConvertTime,
        syncCommits: updated.syncCommits,
        syncMRs: updated.syncMRs,
        syncIssues: updated.syncIssues,
      });
    } catch (error) {
      sendError(
        res,
        "GITLAB_SETTINGS_UPDATE_FAILED",
        "Failed to update settings",
        500,
      );
    }
  },
);

/**
 * DELETE /api/gitlab/connections/:id
 * 斷開 GitLab 連結
 */
router.delete(
  "/:id",
  authenticate,
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      // 驗證連結所有權
      const connection = await prisma.gitLabConnection.findUnique({
        where: { id: req.params.id },
      });

      if (!connection || connection.employeeId !== req.user.userId) {
        sendError(
          res,
          "GITLAB_CONNECTION_NOT_FOUND",
          "Connection not found",
          404,
        );
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
      sendError(
        res,
        "GITLAB_CONNECTION_DELETE_FAILED",
        "Failed to delete connection",
        500,
      );
    }
  },
);

/**
 * POST /api/gitlab/connections/:id/sync
 * 手動觸發同步
 */
router.post(
  "/:id/sync",
  authenticate,
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      // 驗證連結所有權
      const connection = await prisma.gitLabConnection.findUnique({
        where: { id: req.params.id },
      });

      if (!connection || connection.employeeId !== req.user.userId) {
        sendError(
          res,
          "GITLAB_CONNECTION_NOT_FOUND",
          "Connection not found",
          404,
        );
        return;
      }

      if (!connection.isActive) {
        sendError(
          res,
          "GITLAB_CONNECTION_INACTIVE",
          "Connection is not active",
          400,
        );
        return;
      }

      // 同步最近 7 天的活動
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const syncedCount = await gitLabActivityService.syncActivities(
        req.params.id,
        since,
      );

      sendSuccess(res, { syncedCount });
    } catch (error: unknown) {
      sendError(
        res,
        "GITLAB_SYNC_FAILED",
        getSafeErrorMessage(error, "Failed to sync"),
        500,
      );
    }
  },
);

export default router;
