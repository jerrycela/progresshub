import { Router, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { taskService } from "../services/taskService";
import { AuthRequest } from "../middleware/auth";
import { auditLog } from "../middleware/auditLog";
import { TaskStatus } from "@prisma/client";
import logger from "../config/logger";
import { sendSuccess, sendError } from "../utils/response";
import { toTaskDTO } from "../mappers";

const router = Router();

/**
 * PATCH /:id/status
 * 更新任務狀態（含狀態機驗證）
 */
router.patch(
  "/:id/status",
  auditLog("UPDATE_TASK_STATUS"),
  [
    param("id").isString().trim().notEmpty().withMessage("Invalid task ID"),
    body("status")
      .isIn([
        "UNCLAIMED",
        "CLAIMED",
        "IN_PROGRESS",
        "PAUSED",
        "DONE",
        "BLOCKED",
      ])
      .withMessage("Valid status is required"),
    body("pauseReason").optional().isString().trim(),
    body("pauseNote").optional().isString().trim(),
    body("blockerReason").optional().isString().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const task = await taskService.updateStatus(
        req.params.id,
        req.body.status as TaskStatus,
        {
          pauseReason: req.body.pauseReason,
          pauseNote: req.body.pauseNote,
          blockerReason: req.body.blockerReason,
        },
      );
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";

      if (message === "TASK_NOT_FOUND") {
        sendError(res, "TASK_NOT_FOUND", "Task not found", 404);
        return;
      }
      if (message.startsWith("INVALID_TRANSITION")) {
        sendError(res, "INVALID_TRANSITION", message, 400);
        return;
      }
      if (message === "PAUSE_REASON_REQUIRED") {
        sendError(
          res,
          "PAUSE_REASON_REQUIRED",
          "Pause reason is required when pausing a task",
          400,
        );
        return;
      }

      logger.error("Update task status error:", error);
      sendError(
        res,
        "TASK_STATUS_UPDATE_FAILED",
        "Failed to update task status",
        500,
      );
    }
  },
);

/**
 * PATCH /:id/progress
 * 更新任務進度（自動建立 ProgressLog）
 */
router.patch(
  "/:id/progress",
  [
    param("id").isString().trim().notEmpty().withMessage("Invalid task ID"),
    body("progress")
      .isInt({ min: 0, max: 100 })
      .withMessage("Progress must be between 0 and 100"),
    body("notes").optional().isString().trim().isLength({ max: 1000 }),
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

      const task = await taskService.updateTaskProgress(
        req.params.id,
        req.user.userId,
        req.body.progress,
        req.body.notes,
      );
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update progress";

      if (message === "TASK_NOT_FOUND") {
        sendError(res, "TASK_NOT_FOUND", "Task not found", 404);
        return;
      }

      logger.error("Update task progress error:", error);
      sendError(
        res,
        "TASK_PROGRESS_UPDATE_FAILED",
        "Failed to update task progress",
        500,
      );
    }
  },
);

/**
 * POST /:id/claim
 * 認領任務
 */
router.post(
  "/:id/claim",
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
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

      const task = await taskService.claimTask(req.params.id, req.user.userId);
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to claim task";

      if (message === "TASK_NOT_CLAIMABLE") {
        sendError(
          res,
          "TASK_NOT_CLAIMABLE",
          "Task is not available for claiming",
          409,
        );
        return;
      }

      logger.error("Claim task error:", error);
      sendError(res, "TASK_CLAIM_FAILED", "Failed to claim task", 500);
    }
  },
);

/**
 * POST /:id/unclaim
 * 取消認領任務
 */
router.post(
  "/:id/unclaim",
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
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

      const task = await taskService.unclaimTask(
        req.params.id,
        req.user.userId,
      );
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to unclaim task";

      if (message === "TASK_NOT_UNCLAIMABLE") {
        sendError(res, "TASK_NOT_UNCLAIMABLE", "Task cannot be unclaimed", 409);
        return;
      }

      logger.error("Unclaim task error:", error);
      sendError(res, "TASK_UNCLAIM_FAILED", "Failed to unclaim task", 500);
    }
  },
);

export default router;
