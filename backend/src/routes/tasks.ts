import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { taskService } from "../services/taskService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel, TaskStatus } from "@prisma/client";
import logger from "../config/logger";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
} from "../utils/response";

const router = Router();

// 所有任務路由都需要認證
router.use(authenticate);

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
        // express-validator 已驗證 status 為合法的 TaskStatus 值
        status: req.query.status as string as TaskStatus,
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
      });

      sendPaginatedSuccess(res, result.data, {
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

      // express-validator 已驗證 status 為合法的 TaskStatus 值
      const tasks = await taskService.getTasksByEmployee(
        req.user.userId,
        req.query.status as string as TaskStatus,
      );
      sendSuccess(res, tasks);
    } catch (error) {
      logger.error("Get my tasks error:", error);
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
      sendSuccess(res, task);
    } catch (error) {
      logger.error("Get task error:", error);
      sendError(res, "TASK_FETCH_FAILED", "Failed to get task", 500);
    }
  },
);

/**
 * POST /api/tasks
 * 建立任務（所有已認證用戶皆可建立）
 */
router.post(
  "/",
  [
    body("projectId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Valid project ID is required"),
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Name is required"),
    body("assignedToId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Valid assignee ID is required"),
    body("collaborators").optional().isArray(),
    body("collaborators.*").optional().isString().trim().notEmpty(),
    body("plannedStartDate")
      .isISO8601()
      .withMessage("Valid start date is required"),
    body("plannedEndDate")
      .isISO8601()
      .withMessage("Valid end date is required"),
    body("dependencies").optional().isArray(),
    body("dependencies.*").optional().isString().trim().notEmpty(),
    body("milestoneId").optional().isString().trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      // 驗證日期
      if (
        new Date(req.body.plannedEndDate) <= new Date(req.body.plannedStartDate)
      ) {
        sendError(
          res,
          "INVALID_DATE_RANGE",
          "End date must be after start date",
          400,
        );
        return;
      }

      const task = await taskService.createTask(req.body);
      sendSuccess(res, task, 201);
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
    body("assignedToId").optional().isString().trim().notEmpty(),
    body("collaborators").optional().isArray(),
    body("plannedStartDate").optional().isISO8601(),
    body("plannedEndDate").optional().isISO8601(),
    body("actualStartDate").optional().isISO8601(),
    body("actualEndDate").optional().isISO8601(),
    body("progressPercentage").optional().isInt({ min: 0, max: 100 }),
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
      sendSuccess(res, task);
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

export default router;
