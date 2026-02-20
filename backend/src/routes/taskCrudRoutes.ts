import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { taskService } from "../services/taskService";
import {
  authorize,
  AuthRequest,
  authorizeTaskAccess,
} from "../middleware/auth";
import { auditLog } from "../middleware/auditLog";
import { PermissionLevel } from "@prisma/client";
import logger from "../config/logger";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
} from "../utils/response";
import { toTaskDTO } from "../mappers";
import { AppError } from "../middleware/errorHandler";
import { ErrorCodes } from "shared/types/api";

const router = Router();

/**
 * GET /pool
 * 取得任務池（UNCLAIMED 任務）
 * 注意：此路由必須在 /:id 之前定義
 */
router.get("/pool", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await taskService.getPoolTasks();
    sendSuccess(
      res,
      tasks.map((t) => toTaskDTO(t)),
    );
  } catch (error) {
    logger.error("Get pool tasks error:", error);
    sendError(res, "TASK_FETCH_FAILED", "Failed to get pool tasks", 500);
  }
});

/**
 * GET /pool/:id
 * 取得任務池中單一任務
 */
router.get(
  "/pool/:id",
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
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
      const task = await taskService.getTaskById(req.params.id);
      if (!task) {
        sendError(res, ErrorCodes.TASK_NOT_FOUND, "Task not found", 404);
        return;
      }
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      logger.error("Get pool task error:", error);
      sendError(res, "TASK_FETCH_FAILED", "Failed to get task", 500);
    }
  },
);

/**
 * GET /my
 * 取得目前使用者的任務
 */
router.get("/my", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, ErrorCodes.AUTH_REQUIRED, "Not authenticated", 401);
      return;
    }

    const statusFilter = req.query.status as string | undefined;
    const tasks = await taskService.getTasksByEmployee(
      req.user.userId,
      statusFilter as import("@prisma/client").TaskStatus | undefined,
    );
    sendSuccess(
      res,
      tasks.map((t) => toTaskDTO(t)),
    );
  } catch (error) {
    logger.error("Get my tasks error:", error);
    sendError(res, "TASK_FETCH_FAILED", "Failed to get tasks", 500);
  }
});

/**
 * GET /
 * 取得任務列表（分頁）
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
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
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
      const { data, total } = await taskService.getTasks({
        projectId: req.query.projectId as string | undefined,
        assignedToId: req.query.assignedToId as string | undefined,
        status: req.query.status as
          | import("@prisma/client").TaskStatus
          | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
      });

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      sendPaginatedSuccess(
        res,
        data.map((t) => toTaskDTO(t)),
        { total, page, limit },
      );
    } catch (error) {
      logger.error("Get tasks error:", error);
      sendError(res, "TASK_FETCH_FAILED", "Failed to get tasks", 500);
    }
  },
);

/**
 * GET /:id
 * 取得單一任務
 */
router.get(
  "/:id",
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
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
      const task = await taskService.getTaskById(req.params.id);
      if (!task) {
        sendError(res, ErrorCodes.TASK_NOT_FOUND, "Task not found", 404);
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
 * POST /
 * 建立任務
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
    body("sourceType")
      .optional()
      .isIn(["SELF_CREATED", "ASSIGNED", "POOL"])
      .withMessage("sourceType must be SELF_CREATED, ASSIGNED, or POOL"),
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
        sourceType: req.body.sourceType,
      });
      sendSuccess(res, toTaskDTO(task), 201);
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.errorCode, error.message, error.statusCode);
        return;
      }
      logger.error("Create task error:", error);
      sendError(
        res,
        ErrorCodes.TASK_CREATE_FAILED,
        "Failed to create task",
        500,
      );
    }
  },
);

/**
 * PUT /:id
 * 更新任務（PM 和 Admin）
 */
router.put(
  "/:id",
  authorizeTaskAccess,
  auditLog("UPDATE_TASK"),
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
      const existing = await taskService.getTaskById(req.params.id);
      if (!existing) {
        sendError(res, ErrorCodes.TASK_NOT_FOUND, "Task not found", 404);
        return;
      }

      const task = await taskService.updateTask(req.params.id, req.body);
      sendSuccess(res, toTaskDTO(task));
    } catch (error) {
      if (error instanceof AppError) {
        sendError(res, error.errorCode, error.message, error.statusCode);
        return;
      }
      logger.error("Update task error:", error);
      sendError(
        res,
        ErrorCodes.TASK_UPDATE_FAILED,
        "Failed to update task",
        500,
      );
    }
  },
);

/**
 * DELETE /:id
 * 刪除任務（PM 和 Admin）
 */
router.delete(
  "/:id",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  auditLog("DELETE_TASK"),
  [param("id").isString().trim().notEmpty().withMessage("Invalid task ID")],
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
      await taskService.deleteTask(req.params.id);
      res.status(204).end();
    } catch (error) {
      if (error instanceof AppError) {
        sendError(
          res,
          error.errorCode || "TASK_DELETE_FAILED",
          error.message,
          error.statusCode,
        );
        return;
      }
      logger.error("Delete task error:", error);
      sendError(
        res,
        ErrorCodes.TASK_DELETE_FAILED,
        "Failed to delete task",
        500,
      );
    }
  },
);

export default router;
