import { Router, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { taskService } from "../services/taskService";
import { taskNoteService } from "../services/taskNoteService";
import { AuthRequest } from "../middleware/auth";
import logger from "../config/logger";
import { sendSuccess, sendError } from "../utils/response";
import { toTaskDTO } from "../mappers";
import { toProgressLogDTO } from "../mappers/progressLogMapper";
import { AppError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /:taskId/notes
 * 取得任務的註記列表
 */
router.get(
  "/:taskId/notes",
  [param("taskId").isString().trim().notEmpty().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const notes = await taskNoteService.getNotesByTaskId(req.params.taskId);
      sendSuccess(res, notes);
    } catch (error) {
      logger.error("Get task notes error:", error);
      sendError(
        res,
        "TASK_NOTES_FETCH_FAILED",
        "Failed to get task notes",
        500,
      );
    }
  },
);

/**
 * POST /:taskId/notes
 * 新增任務註記
 */
router.post(
  "/:taskId/notes",
  [
    param("taskId").isString().trim().notEmpty().withMessage("Invalid task ID"),
    body("content")
      .isString()
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage("Content is required"),
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

      const note = await taskNoteService.createNote({
        taskId: req.params.taskId,
        content: req.body.content,
        authorId: req.user.userId,
        authorName: req.user.name || "Unknown",
        authorRole: req.user.permissionLevel,
      });
      sendSuccess(res, note, 201);
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.errorCode, error.message, error.statusCode);
        return;
      }
      logger.error("Create task note error:", error);
      sendError(
        res,
        "TASK_NOTE_CREATE_FAILED",
        "Failed to create task note",
        500,
      );
    }
  },
);

/**
 * GET /:taskId/progress
 * 取得任務的進度記錄
 */
router.get(
  "/:taskId/progress",
  [param("taskId").isString().trim().notEmpty().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const logs = await taskService.getTaskProgressLogs(req.params.taskId);
      sendSuccess(res, logs.map(toProgressLogDTO));
    } catch (error) {
      logger.error("Get task progress logs error:", error);
      sendError(
        res,
        "TASK_PROGRESS_FETCH_FAILED",
        "Failed to get task progress logs",
        500,
      );
    }
  },
);

/**
 * POST /:taskId/progress
 * 回報任務進度（嵌套路徑版）
 */
router.post(
  "/:taskId/progress",
  [
    param("taskId").isString().trim().notEmpty().withMessage("Invalid task ID"),
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
        req.params.taskId,
        req.user.userId,
        req.body.progress,
        req.body.notes,
      );
      sendSuccess(res, toTaskDTO(task), 201);
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.errorCode, error.message, error.statusCode);
        return;
      }
      logger.error("Report task progress error:", error);
      sendError(
        res,
        "TASK_PROGRESS_CREATE_FAILED",
        "Failed to report task progress",
        500,
      );
    }
  },
);

export default router;
