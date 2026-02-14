import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { taskService } from "../services/taskService";
import { taskNoteService } from "../services/taskNoteService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel, TaskStatus } from "@prisma/client";
import logger from "../config/logger";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
} from "../utils/response";
import { toTaskDTO } from "../mappers";
import { toProgressLogDTO } from "../mappers/progressLogMapper";

const router = Router();

// 所有任務路由都需要認證
router.use(authenticate);

/**
 * GET /api/tasks/pool
 * 取得任務池（UNCLAIMED 任務）
 * 注意：此路由必須在 /:id 之前定義
 */
router.get("/pool", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await taskService.getPoolTasks();
    sendSuccess(res, tasks.map(toTaskDTO));
  } catch (error) {
    logger.error("Get pool tasks error:", error);
    sendError(res, "POOL_TASKS_FETCH_FAILED", "Failed to get pool tasks", 500);
  }
});

/**
 * GET /api/tasks/pool/:id
 * 取得單一任務池任務
 */
router.get(
  "/pool/:id",
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const task = await taskService.getTaskById(req.params.id);
      if (!task || task.status !== "UNCLAIMED") {
        sendError(res, "POOL_TASK_NOT_FOUND", "Pool task not found", 404);
        return;
      }
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      logger.error("Get pool task error:", error);
      sendError(res, "POOL_TASK_FETCH_FAILED", "Failed to get pool task", 500);
    }
  },
);

/**
 * GET /api/tasks/my
 * 取得當前使用者的任務
 */
router.get(
  "/my",
  [
    query("status")
      .optional()
      .isIn([
        "UNCLAIMED",
        "CLAIMED",
        "IN_PROGRESS",
        "PAUSED",
        "DONE",
        "BLOCKED",
      ]),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const tasks = await taskService.getTasksByEmployee(
        req.user.userId,
        req.query.status as string as TaskStatus,
      );
      sendSuccess(res, tasks.map(toTaskDTO));
    } catch (error) {
      logger.error("Get my tasks error:", error);
      sendError(res, "TASKS_FETCH_FAILED", "Failed to get tasks", 500);
    }
  },
);

/**
 * GET /api/tasks
 * 取得任務列表
 */
router.get(
  "/",
  [
    query("projectId").optional().isString().trim().notEmpty(),
    query("assignedToId").optional().isString().trim().notEmpty(),
    query("status")
      .optional()
      .isIn([
        "UNCLAIMED",
        "CLAIMED",
        "IN_PROGRESS",
        "PAUSED",
        "DONE",
        "BLOCKED",
      ]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await taskService.getTasks({
        projectId: req.query.projectId as string,
        assignedToId: req.query.assignedToId as string,
        status: req.query.status as string as TaskStatus,
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
      });

      sendPaginatedSuccess(res, result.data.map(toTaskDTO), {
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      logger.error("Get tasks error:", error);
      sendError(res, "TASKS_FETCH_FAILED", "Failed to get tasks", 500);
    }
  },
);

/**
 * GET /api/tasks/:id
 * 取得單一任務
 */
router.get(
  "/:id",
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const task = await taskService.getTaskById(req.params.id);
      if (!task) {
        sendError(res, "TASK_NOT_FOUND", "Task not found", 404);
        return;
      }
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      logger.error("Get task error:", error);
      sendError(res, "TASK_FETCH_FAILED", "Failed to get task", 500);
    }
  },
);

/**
 * POST /api/tasks
 * 建立任務（接受前端 CreateTaskInput 格式）
 */
router.post(
  "/",
  [
    body("projectId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Valid project ID is required"),
    body("title")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Title is required"),
    body("description").optional().isString().trim(),
    body("priority").optional().isIn(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    body("assigneeId").optional().isString().trim().notEmpty(),
    body("functionTags").optional().isArray(),
    body("startDate").optional().isISO8601(),
    body("dueDate").optional().isISO8601(),
    body("estimatedHours").optional().isFloat({ min: 0 }),
    body("dependsOnTaskIds").optional().isArray(),
    body("dependsOnTaskIds.*").optional().isString().trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      // 前端欄位名 → 後端欄位名轉換
      const task = await taskService.createTask({
        projectId: req.body.projectId,
        name: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        assignedToId: req.body.assigneeId,
        functionTags: req.body.functionTags,
        plannedStartDate: req.body.startDate
          ? new Date(req.body.startDate)
          : undefined,
        plannedEndDate: req.body.dueDate
          ? new Date(req.body.dueDate)
          : undefined,
        estimatedHours: req.body.estimatedHours,
        dependencies: req.body.dependsOnTaskIds,
        creatorId: req.user?.userId,
      });
      sendSuccess(res, toTaskDTO(task), 201);
    } catch (error) {
      logger.error("Create task error:", error);
      sendError(res, "TASK_CREATE_FAILED", "Failed to create task", 500);
    }
  },
);

/**
 * PUT /api/tasks/:id
 * 更新任務（PM 和 Admin）
 */
router.put(
  "/:id",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    param("id").isString().trim().notEmpty().withMessage("Invalid task ID"),
    body("name").optional().isString().trim().isLength({ min: 1, max: 200 }),
    body("description").optional().isString().trim(),
    body("priority").optional().isIn(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    body("assignedToId").optional().isString().trim().notEmpty(),
    body("collaborators").optional().isArray(),
    body("functionTags").optional().isArray(),
    body("plannedStartDate").optional().isISO8601(),
    body("plannedEndDate").optional().isISO8601(),
    body("actualStartDate").optional().isISO8601(),
    body("actualEndDate").optional().isISO8601(),
    body("progressPercentage").optional().isInt({ min: 0, max: 100 }),
    body("estimatedHours").optional().isFloat({ min: 0 }),
    body("status")
      .optional()
      .isIn([
        "UNCLAIMED",
        "CLAIMED",
        "IN_PROGRESS",
        "PAUSED",
        "DONE",
        "BLOCKED",
      ]),
    body("dependencies").optional().isArray(),
    body("milestoneId").optional().isString().trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const existing = await taskService.getTaskById(req.params.id);
      if (!existing) {
        sendError(res, "TASK_NOT_FOUND", "Task not found", 404);
        return;
      }

      const task = await taskService.updateTask(req.params.id, req.body);
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      logger.error("Update task error:", error);
      sendError(res, "TASK_UPDATE_FAILED", "Failed to update task", 500);
    }
  },
);

/**
 * DELETE /api/tasks/:id
 * 刪除任務（PM 和 Admin）
 */
router.delete(
  "/:id",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const existing = await taskService.getTaskById(req.params.id);
      if (!existing) {
        sendError(res, "TASK_NOT_FOUND", "Task not found", 404);
        return;
      }

      await taskService.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error("Delete task error:", error);
      sendError(res, "TASK_DELETE_FAILED", "Failed to delete task", 500);
    }
  },
);

/**
 * PATCH /api/tasks/:id/status
 * 更新任務狀態（含狀態機驗證）
 */
router.patch(
  "/:id/status",
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
 * PATCH /api/tasks/:id/progress
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
 * POST /api/tasks/:id/claim
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
 * POST /api/tasks/:id/unclaim
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

/**
 * GET /api/tasks/:taskId/notes
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
 * POST /api/tasks/:taskId/notes
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
 * GET /api/tasks/:taskId/progress
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
 * POST /api/tasks/:taskId/progress
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
      const message =
        error instanceof Error ? error.message : "Failed to report progress";

      if (message === "TASK_NOT_FOUND") {
        sendError(res, "TASK_NOT_FOUND", "Task not found", 404);
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
