import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { timeEntryService } from "../services/timeEntryService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel, TimeEntryStatus } from "@prisma/client";
import {
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
  getSafeErrorMessage,
} from "../utils/response";

const router = Router();

router.use(authenticate);

/**
 * GET /api/time-entries
 * 取得工時記錄列表
 */
router.get(
  "/",
  [
    query("employeeId").optional().isString().trim().notEmpty(),
    query("projectId").optional().isString().trim().notEmpty(),
    query("taskId").optional().isString().trim().notEmpty(),
    query("categoryId").optional().isString().trim().notEmpty(),
    query("status").optional().isIn(["PENDING", "APPROVED", "REJECTED"]),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
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
      // 一般員工只能看自己的工時
      let employeeId = req.query.employeeId as string;
      if (req.user?.permissionLevel === "EMPLOYEE") {
        employeeId = req.user.userId;
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      const result = await timeEntryService.getTimeEntries({
        employeeId,
        projectId: req.query.projectId as string,
        taskId: req.query.taskId as string,
        categoryId: req.query.categoryId as string,
        status: req.query.status as TimeEntryStatus,
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
        "TIME_ENTRIES_FETCH_FAILED",
        "Failed to get time entries",
        500,
      );
    }
  },
);

/**
 * GET /api/time-entries/my/today
 * 取得今日工時摘要
 */
router.get(
  "/my/today",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const summary = await timeEntryService.getTodaySummary(req.user.userId);
      sendSuccess(res, summary);
    } catch (error) {
      sendError(
        res,
        "TIME_ENTRY_TODAY_FAILED",
        "Failed to get today summary",
        500,
      );
    }
  },
);

/**
 * GET /api/time-entries/my/week
 * 取得週報資料
 */
router.get(
  "/my/week",
  [query("weekStart").optional().isISO8601()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      // 預設本週一
      let weekStart: Date;
      if (req.query.weekStart) {
        weekStart = new Date(req.query.weekStart as string);
      } else {
        weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
      }
      weekStart.setHours(0, 0, 0, 0);

      const timesheet = await timeEntryService.getWeeklyTimesheet(
        req.user.userId,
        weekStart,
      );
      sendSuccess(res, timesheet);
    } catch (error) {
      sendError(
        res,
        "TIME_ENTRY_WEEK_FAILED",
        "Failed to get weekly timesheet",
        500,
      );
    }
  },
);

/**
 * GET /api/time-entries/:id
 * 取得單一工時記錄
 */
router.get(
  "/:id",
  [param("id").isString().trim().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const entry = await timeEntryService.getTimeEntryById(req.params.id);
      if (!entry) {
        sendError(res, "TIME_ENTRY_NOT_FOUND", "Time entry not found", 404);
        return;
      }

      // 檢查權限
      if (
        req.user?.permissionLevel === "EMPLOYEE" &&
        entry.employeeId !== req.user.userId
      ) {
        sendError(res, "FORBIDDEN", "Access denied", 403);
        return;
      }

      sendSuccess(res, entry);
    } catch (error) {
      sendError(
        res,
        "TIME_ENTRY_FETCH_FAILED",
        "Failed to get time entry",
        500,
      );
    }
  },
);

/**
 * POST /api/time-entries
 * 建立工時記錄
 */
router.post(
  "/",
  [
    body("projectId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Valid project ID required"),
    body("taskId").optional().isString().trim().notEmpty(),
    body("categoryId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Valid category ID required"),
    body("date").isISO8601().withMessage("Valid date required"),
    body("hours")
      .isFloat({ min: 0.25, max: 12 })
      .withMessage("Hours must be 0.25-12"),
    body("description").optional().isString().trim().isLength({ max: 1000 }),
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

      const entry = await timeEntryService.createTimeEntry({
        employeeId: req.user.userId,
        ...req.body,
      });
      sendSuccess(res, entry, 201);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_ENTRY_CREATE_FAILED",
        getSafeErrorMessage(error, "Failed to create time entry"),
        400,
      );
    }
  },
);

/**
 * POST /api/time-entries/batch
 * 批次建立工時記錄（週報）
 */
router.post(
  "/batch",
  [
    body("entries").isArray({ min: 1 }).withMessage("Entries array required"),
    body("entries.*.projectId").isString().trim().notEmpty(),
    body("entries.*.categoryId").isString().trim().notEmpty(),
    body("entries.*.date").isISO8601(),
    body("entries.*.hours").isFloat({ min: 0.25, max: 12 }),
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

      const entries = req.body.entries.map((e: Record<string, unknown>) => ({
        ...e,
        employeeId: req.user?.userId ?? "",
      }));

      const created = await timeEntryService.createBatchTimeEntries(entries);
      sendSuccess(res, { created: created.length, entries: created }, 201);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_ENTRY_BATCH_FAILED",
        getSafeErrorMessage(error, "Failed to create time entries"),
        400,
      );
    }
  },
);

/**
 * PUT /api/time-entries/:id
 * 更新工時記錄
 */
router.put(
  "/:id",
  [
    param("id").isString().trim().notEmpty(),
    body("projectId").optional().isString().trim().notEmpty(),
    body("taskId").optional().isString().trim().notEmpty(),
    body("categoryId").optional().isString().trim().notEmpty(),
    body("date").optional().isISO8601(),
    body("hours").optional().isFloat({ min: 0.25, max: 12 }),
    body("description").optional().isString().trim().isLength({ max: 1000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const existing = await timeEntryService.getTimeEntryById(req.params.id);
      if (!existing) {
        sendError(res, "TIME_ENTRY_NOT_FOUND", "Time entry not found", 404);
        return;
      }

      // ADMIN/PM 可修改任何人的記錄，一般員工只能修改自己的
      const isPrivileged =
        req.user?.permissionLevel === "ADMIN" ||
        req.user?.permissionLevel === "PM";
      if (!isPrivileged && existing.employeeId !== req.user?.userId) {
        sendError(res, "FORBIDDEN", "Access denied", 403);
        return;
      }

      const updated = await timeEntryService.updateTimeEntry(
        req.params.id,
        req.body,
      );
      sendSuccess(res, updated);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_ENTRY_UPDATE_FAILED",
        getSafeErrorMessage(error, "Failed to update time entry"),
        400,
      );
    }
  },
);

/**
 * DELETE /api/time-entries/:id
 * 刪除工時記錄
 */
router.delete(
  "/:id",
  [param("id").isString().trim().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const existing = await timeEntryService.getTimeEntryById(req.params.id);
      if (!existing) {
        sendError(res, "TIME_ENTRY_NOT_FOUND", "Time entry not found", 404);
        return;
      }

      const isPrivileged =
        req.user?.permissionLevel === "ADMIN" ||
        req.user?.permissionLevel === "PM";
      if (!isPrivileged && existing.employeeId !== req.user?.userId) {
        sendError(res, "FORBIDDEN", "Access denied", 403);
        return;
      }

      await timeEntryService.deleteTimeEntry(req.params.id);
      res.status(204).send();
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_ENTRY_DELETE_FAILED",
        getSafeErrorMessage(error, "Failed to delete time entry"),
        400,
      );
    }
  },
);

/**
 * POST /api/time-entries/:id/approve
 * 審核通過
 */
router.post(
  "/:id/approve",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [param("id").isString().trim().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const updated = await timeEntryService.approveTimeEntry(
        req.params.id,
        req.user?.userId ?? "",
      );
      sendSuccess(res, updated);
    } catch (error) {
      sendError(
        res,
        "TIME_ENTRY_APPROVE_FAILED",
        "Failed to approve time entry",
        500,
      );
    }
  },
);

/**
 * POST /api/time-entries/:id/reject
 * 駁回
 */
router.post(
  "/:id/reject",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    param("id").isString().trim().notEmpty(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Rejection reason required"),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const updated = await timeEntryService.rejectTimeEntry(
        req.params.id,
        req.user?.userId ?? "",
        req.body.reason,
      );
      sendSuccess(res, updated);
    } catch (error) {
      sendError(
        res,
        "TIME_ENTRY_REJECT_FAILED",
        "Failed to reject time entry",
        500,
      );
    }
  },
);

/**
 * POST /api/time-entries/batch-approve
 * 批次審核
 */
router.post(
  "/batch-approve",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [body("ids").isArray({ min: 1 }).withMessage("IDs array required")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const result = await timeEntryService.batchApprove(
        req.body.ids,
        req.user?.userId ?? "",
      );
      sendSuccess(res, { approved: result.count });
    } catch (error) {
      sendError(
        res,
        "TIME_ENTRY_BATCH_APPROVE_FAILED",
        "Failed to batch approve",
        500,
      );
    }
  },
);

export default router;
