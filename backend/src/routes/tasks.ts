import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { taskService } from "../services/taskService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel, TaskStatus } from "@prisma/client";

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
    query("projectId").optional().isUUID(),
    query("assignedToId").optional().isUUID(),
    query("status")
      .optional()
      .isIn(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await taskService.getTasks({
        projectId: req.query.projectId as string,
        assignedToId: req.query.assignedToId as string,
        // express-validator 已驗證 status 為合法的 TaskStatus 值
        status: req.query.status as string as TaskStatus,
        page: req.query.page as unknown as number,
        limit: req.query.limit as unknown as number,
      });

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: Math.ceil(result.total / (Number(req.query.limit) || 20)),
        },
      });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
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
      .isIn(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      // express-validator 已驗證 status 為合法的 TaskStatus 值
      const tasks = await taskService.getTasksByEmployee(
        req.user.userId,
        req.query.status as string as TaskStatus,
      );
      res.json(tasks);
    } catch (error) {
      console.error("Get my tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  },
);

/**
 * GET /api/tasks/:id
 * 取得單一任務
 */
router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const task = await taskService.getTaskById(req.params.id);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json(task);
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "Failed to get task" });
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
    body("projectId").isUUID().withMessage("Valid project ID is required"),
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Name is required"),
    body("assignedToId").isUUID().withMessage("Valid assignee ID is required"),
    body("collaborators").optional().isArray(),
    body("collaborators.*").optional().isUUID(),
    body("plannedStartDate")
      .isISO8601()
      .withMessage("Valid start date is required"),
    body("plannedEndDate")
      .isISO8601()
      .withMessage("Valid end date is required"),
    body("dependencies").optional().isArray(),
    body("dependencies.*").optional().isUUID(),
    body("milestoneId").optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      // 驗證日期
      if (
        new Date(req.body.plannedEndDate) <= new Date(req.body.plannedStartDate)
      ) {
        res.status(400).json({ error: "End date must be after start date" });
        return;
      }

      const task = await taskService.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
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
    param("id").isUUID().withMessage("Invalid task ID"),
    body("name").optional().isString().trim().isLength({ min: 1, max: 200 }),
    body("assignedToId").optional().isUUID(),
    body("collaborators").optional().isArray(),
    body("plannedStartDate").optional().isISO8601(),
    body("plannedEndDate").optional().isISO8601(),
    body("actualStartDate").optional().isISO8601(),
    body("actualEndDate").optional().isISO8601(),
    body("progressPercentage").optional().isInt({ min: 0, max: 100 }),
    body("status").optional().isIn(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
    body("dependencies").optional().isArray(),
    body("milestoneId").optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existing = await taskService.getTaskById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      const task = await taskService.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
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
  [param("id").isUUID().withMessage("Invalid task ID")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existing = await taskService.getTaskById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      await taskService.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  },
);

export default router;
