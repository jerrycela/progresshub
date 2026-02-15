import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { Prisma } from "@prisma/client";
import { userSettingsService } from "../services/userSettingsService";
import { authenticate, AuthRequest } from "../middleware/auth";
import { sendSuccess, sendError, getSafeErrorMessage } from "../utils/response";
import logger from "../config/logger";

const router = Router();

router.use(authenticate);

/**
 * GET /api/user/settings
 * 取得當前使用者的設定
 */
router.get(
  "/settings",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const settings = await userSettingsService.getSettings(req.user.userId);
      if (!settings) {
        sendError(res, "USER_NOT_FOUND", "User not found", 404);
        return;
      }

      sendSuccess(res, settings);
    } catch (error) {
      logger.error("Get user settings error:", error);
      sendError(
        res,
        "USER_SETTINGS_FETCH_FAILED",
        "Failed to get user settings",
        500,
      );
    }
  },
);

/**
 * PATCH /api/user/settings
 * 更新使用者基本設定
 */
router.patch(
  "/settings",
  [
    body("name").optional().isString().trim().isLength({ min: 1, max: 100 }),
    body("email").optional().isEmail().normalizeEmail(),
    body("avatar").optional().isString().trim(),
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

      const settings = await userSettingsService.updateSettings(
        req.user.userId,
        req.body,
      );
      sendSuccess(res, settings);
    } catch (error) {
      logger.error("Update user settings error:", error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        sendError(res, "EMAIL_ALREADY_EXISTS", "此 Email 已被使用", 409);
      } else {
        sendError(
          res,
          "USER_SETTINGS_UPDATE_FAILED",
          getSafeErrorMessage(error, "Failed to update settings"),
          500,
        );
      }
    }
  },
);

/**
 * POST /api/user/integrations/gitlab
 * 連結 GitLab 帳號
 */
router.post(
  "/integrations/gitlab",
  [
    body("username")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("GitLab username is required"),
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

      const settings = await userSettingsService.linkGitLab(
        req.user.userId,
        req.body.username,
      );
      sendSuccess(res, settings);
    } catch (error) {
      logger.error("Link GitLab error:", error);
      sendError(
        res,
        "GITLAB_LINK_FAILED",
        getSafeErrorMessage(error, "Failed to link GitLab"),
        400,
      );
    }
  },
);

/**
 * DELETE /api/user/integrations/gitlab
 * 解除 GitLab 連結
 */
router.delete(
  "/integrations/gitlab",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const settings = await userSettingsService.unlinkGitLab(req.user.userId);
      sendSuccess(res, settings);
    } catch (error) {
      logger.error("Unlink GitLab error:", error);
      sendError(res, "GITLAB_UNLINK_FAILED", "Failed to unlink GitLab", 500);
    }
  },
);

/**
 * POST /api/user/integrations/slack
 * 連結 Slack 帳號
 */
router.post(
  "/integrations/slack",
  [
    body("username")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Slack username is required"),
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

      const settings = await userSettingsService.linkSlack(
        req.user.userId,
        req.body.username,
      );
      sendSuccess(res, settings);
    } catch (error) {
      logger.error("Link Slack error:", error);
      sendError(
        res,
        "SLACK_LINK_FAILED",
        getSafeErrorMessage(error, "Failed to link Slack"),
        400,
      );
    }
  },
);

/**
 * DELETE /api/user/integrations/slack
 * 解除 Slack 連結
 */
router.delete(
  "/integrations/slack",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const settings = await userSettingsService.unlinkSlack(req.user.userId);
      sendSuccess(res, settings);
    } catch (error) {
      logger.error("Unlink Slack error:", error);
      sendError(res, "SLACK_UNLINK_FAILED", "Failed to unlink Slack", 500);
    }
  },
);

export default router;
