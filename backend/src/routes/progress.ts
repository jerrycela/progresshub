import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { progressService } from "../services/progressService";
import { taskService } from "../services/taskService";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
} from "../utils/response";

import { sanitizeBody } from "../middleware/sanitize";
import { ErrorCodes } from "shared/types/api";

const router = Router();

// 所有進度路由都需要認證
router.use(authenticate);
router.use(sanitizeBody);

/**
 * GET /api/progress
 * 取得進度記錄列表
 */
router.get(
  "/",
  [
    query("taskId").optional().isString().trim().notEmpty(),
    query("employeeId").optional().isString().trim().notEmpty(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await progressService.getProgressLogs({
        taskId: req.query.taskId as string,
        employeeId: req.query.employeeId as string,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        page,
        limit,
      });

      sendPaginatedSuccess(res, result.data, {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      sendError(
        res,
        "PROGRESS_FETCH_FAILED",
        "Failed to get progress logs",
        500,
      );
    }
  },
);

/**
 * GET /api/progress/today
 * 取得當前使用者今日進度回報狀態
 */
router.get("/today", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, ErrorCodes.AUTH_REQUIRED, "Not authenticated", 401);
      return;
    }

    const status = await progressService.getTodayProgressStatus(
      req.user.userId,
    );
    sendSuccess(res, status);
  } catch (error) {
    sendError(
      res,
      "PROGRESS_TODAY_FAILED",
      "Failed to get today progress status",
      500,
    );
  }
});

/**
 * GET /api/progress/project/:projectId/stats
 * 取得專案進度統計（近 N 天）
 */
router.get(
  "/project/:projectId/stats",
  [
    param("projectId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Invalid project ID"),
    query("days").optional().isInt({ min: 1, max: 90 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      const days = Number(req.query.days) || 7;
      const stats = await progressService.getProjectProgressStats(
        req.params.projectId,
        days,
      );
      sendSuccess(res, stats);
    } catch (error) {
      sendError(
        res,
        "PROGRESS_STATS_FAILED",
        "Failed to get project progress stats",
        500,
      );
    }
  },
);

/**
 * POST /api/progress
 * 回報進度
 */
router.post(
  "/",
  [
    body("taskId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Valid task ID is required"),
    body("progressPercentage")
      .isInt({ min: 0, max: 100 })
      .withMessage("Progress must be between 0 and 100"),
    body("notes").optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(
        res,
        ErrorCodes.VALIDATION_FAILED,
        "Invalid input",
        400,
        errors.array(),
      );
      return;
    }

    try {
      if (!req.user) {
        sendError(res, ErrorCodes.AUTH_REQUIRED, "Not authenticated", 401);
        return;
      }

      const { taskId, progressPercentage, notes } = req.body;

      // 驗證任務存在
      const task = await taskService.getTaskById(taskId);
      if (!task) {
        sendError(res, ErrorCodes.TASK_NOT_FOUND, "Task not found", 404);
        return;
      }

      // 驗證使用者是任務的負責人或協作者
      const isAssigned = task.assignedToId === req.user.userId;
      const isCollaborator = task.collaborators.includes(req.user.userId);

      if (!isAssigned && !isCollaborator) {
        sendError(res, "FORBIDDEN", "You are not assigned to this task", 403);
        return;
      }

      const progressLog = await progressService.createProgressLog({
        taskId,
        employeeId: req.user.userId,
        progressPercentage,
        notes,
      });

      sendSuccess(res, progressLog, 201);
    } catch (error) {
      sendError(
        res,
        "PROGRESS_CREATE_FAILED",
        "Failed to create progress log",
        500,
      );
    }
  },
);

export default router;
