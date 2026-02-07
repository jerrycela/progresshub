import { Router, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { gitLabInstanceService } from "../../services/gitlab";
import { authenticate, authorize, AuthRequest } from "../../middleware/auth";
import { PermissionLevel } from "@prisma/client";
import {
  sendSuccess,
  sendError,
  getSafeErrorMessage,
} from "../../utils/response";

const router = Router();

// 所有實例管理路由都需要管理員權限
router.use(authenticate);
router.use(authorize(PermissionLevel.ADMIN));

/**
 * GET /api/gitlab/instances
 * 取得所有 GitLab 實例列表
 */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const instances =
      await gitLabInstanceService.getAllInstances(includeInactive);
    sendSuccess(res, instances);
  } catch (error) {
    sendError(
      res,
      "GITLAB_INSTANCES_FETCH_FAILED",
      "Failed to get instances",
      500,
    );
  }
});

/**
 * GET /api/gitlab/instances/:id
 * 取得單一 GitLab 實例
 */
router.get(
  "/:id",
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const instance = await gitLabInstanceService.getInstanceById(
        req.params.id,
      );
      if (!instance) {
        sendError(res, "GITLAB_INSTANCE_NOT_FOUND", "Instance not found", 404);
        return;
      }
      sendSuccess(res, instance);
    } catch (error) {
      sendError(
        res,
        "GITLAB_INSTANCE_FETCH_FAILED",
        "Failed to get instance",
        500,
      );
    }
  },
);

/**
 * POST /api/gitlab/instances
 * 新增 GitLab 實例
 */
router.post(
  "/",
  [
    body("name").isString().trim().notEmpty().withMessage("Name is required"),
    body("baseUrl").isURL().withMessage("Valid URL is required"),
    body("clientId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Client ID is required"),
    body("clientSecret")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Client Secret is required"),
    body("webhookSecret").optional().isString(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const instance = await gitLabInstanceService.createInstance(req.body);
      sendSuccess(res, instance, 201);
    } catch (error: unknown) {
      sendError(
        res,
        "GITLAB_INSTANCE_CREATE_FAILED",
        getSafeErrorMessage(error, "Failed to create instance"),
        400,
      );
    }
  },
);

/**
 * PUT /api/gitlab/instances/:id
 * 更新 GitLab 實例
 */
router.put(
  "/:id",
  [
    param("id").isUUID(),
    body("name").optional().isString().trim().notEmpty(),
    body("clientId").optional().isString().trim().notEmpty(),
    body("clientSecret").optional().isString().trim().notEmpty(),
    body("webhookSecret").optional().isString(),
    body("isActive").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const instance = await gitLabInstanceService.updateInstance(
        req.params.id,
        req.body,
      );
      sendSuccess(res, instance);
    } catch (error: unknown) {
      sendError(
        res,
        "GITLAB_INSTANCE_UPDATE_FAILED",
        getSafeErrorMessage(error, "Failed to update instance"),
        400,
      );
    }
  },
);

/**
 * DELETE /api/gitlab/instances/:id
 * 刪除 GitLab 實例
 */
router.delete(
  "/:id",
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      await gitLabInstanceService.deleteInstance(req.params.id);
      res.status(204).send();
    } catch (error: unknown) {
      sendError(
        res,
        "GITLAB_INSTANCE_DELETE_FAILED",
        getSafeErrorMessage(error, "Failed to delete instance"),
        400,
      );
    }
  },
);

/**
 * POST /api/gitlab/instances/:id/test
 * 測試 GitLab 實例連線
 */
router.post(
  "/:id/test",
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const result = await gitLabInstanceService.testConnection(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, "GITLAB_TEST_FAILED", "Failed to test connection", 500);
    }
  },
);

/**
 * POST /api/gitlab/instances/:id/regenerate-webhook-secret
 * 重新生成 Webhook Secret
 */
router.post(
  "/:id/regenerate-webhook-secret",
  [param("id").isUUID()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const webhookSecret = await gitLabInstanceService.regenerateWebhookSecret(
        req.params.id,
      );
      sendSuccess(res, { webhookSecret });
    } catch (error) {
      sendError(
        res,
        "GITLAB_WEBHOOK_REGEN_FAILED",
        "Failed to regenerate webhook secret",
        500,
      );
    }
  },
);

export default router;
