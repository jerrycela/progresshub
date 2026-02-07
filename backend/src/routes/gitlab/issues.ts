import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { gitLabIssueService } from "../../services/gitlab";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { sendSuccess, sendError } from "../../utils/response";

const router = Router();

router.use(authenticate);

/**
 * GET /api/gitlab/issues/mappings
 * 取得 Issue 對應列表
 */
router.get(
  "/mappings",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const mappings = await gitLabIssueService.getIssueMappings(
        req.user.userId,
      );
      sendSuccess(res, mappings);
    } catch (error) {
      sendError(
        res,
        "GITLAB_MAPPINGS_FETCH_FAILED",
        "Failed to get mappings",
        500,
      );
    }
  },
);

/**
 * POST /api/gitlab/issues/mappings
 * 建立 Issue 與任務的對應
 */
router.post(
  "/mappings",
  [
    body("connectionId").isUUID().withMessage("Connection ID is required"),
    body("gitlabIssueId").isInt().withMessage("GitLab Issue ID is required"),
    body("gitlabIssueIid").isInt().withMessage("GitLab Issue IID is required"),
    body("projectPath")
      .isString()
      .notEmpty()
      .withMessage("Project path is required"),
    body("taskId").isUUID().withMessage("Task ID is required"),
    body("syncDirection")
      .optional()
      .isIn(["GITLAB_TO_TASK", "TASK_TO_GITLAB", "BIDIRECTIONAL"]),
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

      const mappingId = await gitLabIssueService.createIssueMapping(
        req.user.userId,
        req.body,
      );

      sendSuccess(res, { mappingId }, 201);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create mapping";
      sendError(res, "GITLAB_MAPPING_CREATE_FAILED", message, 400);
    }
  },
);

/**
 * DELETE /api/gitlab/issues/mappings/:id
 * 刪除 Issue 對應
 */
router.delete(
  "/mappings/:id",
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

      await gitLabIssueService.deleteIssueMapping(
        req.params.id,
        req.user.userId,
      );
      res.status(204).send();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete mapping";
      sendError(res, "GITLAB_MAPPING_DELETE_FAILED", message, 400);
    }
  },
);

/**
 * POST /api/gitlab/issues/sync-from-gitlab/:mappingId
 * 從 GitLab 同步到任務
 */
router.post(
  "/sync-from-gitlab/:mappingId",
  [param("mappingId").isUUID()],
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

      await gitLabIssueService.syncFromGitLab(
        req.params.mappingId,
        req.user.userId,
      );
      sendSuccess(res, { message: "Synced from GitLab to task" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sync";
      sendError(res, "GITLAB_SYNC_FROM_FAILED", message, 400);
    }
  },
);

/**
 * POST /api/gitlab/issues/sync-to-gitlab/:mappingId
 * 從任務同步到 GitLab
 */
router.post(
  "/sync-to-gitlab/:mappingId",
  [param("mappingId").isUUID()],
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

      await gitLabIssueService.syncToGitLab(
        req.params.mappingId,
        req.user.userId,
      );
      sendSuccess(res, { message: "Synced from task to GitLab" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sync";
      sendError(res, "GITLAB_SYNC_TO_FAILED", message, 400);
    }
  },
);

/**
 * GET /api/gitlab/issues/search
 * 搜尋 GitLab Issues（用於建立對應）
 */
router.get(
  "/search",
  [
    query("connectionId").isUUID().withMessage("Connection ID is required"),
    query("projectPath")
      .isString()
      .notEmpty()
      .withMessage("Project path is required"),
    query("query").isString().withMessage("Search query is required"),
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

      const issues = await gitLabIssueService.searchIssues(
        req.query.connectionId as string,
        req.query.projectPath as string,
        req.query.query as string,
        req.user.userId,
      );

      sendSuccess(res, issues);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to search issues";
      sendError(res, "GITLAB_ISSUE_SEARCH_FAILED", message, 400);
    }
  },
);

/**
 * POST /api/gitlab/issues/create-from-task
 * 從任務建立 GitLab Issue
 */
router.post(
  "/create-from-task",
  [
    body("connectionId").isUUID().withMessage("Connection ID is required"),
    body("projectPath")
      .isString()
      .notEmpty()
      .withMessage("Project path is required"),
    body("taskId").isUUID().withMessage("Task ID is required"),
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

      const mappingId = await gitLabIssueService.createIssueFromTask(
        req.body.connectionId,
        req.body.projectPath,
        req.body.taskId,
        req.user.userId,
      );

      sendSuccess(res, { mappingId }, 201);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create issue";
      sendError(res, "GITLAB_ISSUE_CREATE_FAILED", message, 400);
    }
  },
);

export default router;
