import { Router, Response } from "express";
import { param, query, validationResult } from "express-validator";
import { timeStatsService } from "../services/timeStatsService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel } from "@prisma/client";
import { sendSuccess, sendError, getSafeErrorMessage } from "../utils/response";

const router = Router();

router.use(authenticate);

/**
 * GET /api/time-stats/project/:projectId
 * 取得專案工時統計
 */
router.get(
  "/project/:projectId",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    param("projectId").isString().trim().notEmpty(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const dateRange =
        req.query.startDate && req.query.endDate
          ? {
              startDate: new Date(req.query.startDate as string),
              endDate: new Date(req.query.endDate as string),
            }
          : undefined;

      const stats = await timeStatsService.getProjectStats(
        req.params.projectId,
        dateRange,
      );
      sendSuccess(res, stats);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_STATS_PROJECT_FAILED",
        getSafeErrorMessage(error, "Failed to get project stats"),
        400,
      );
    }
  },
);

/**
 * GET /api/time-stats/employee/:employeeId
 * 取得員工工時統計
 */
router.get(
  "/employee/:employeeId",
  [
    param("employeeId").isString().trim().notEmpty(),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      // 一般員工只能查看自己的統計
      if (
        req.user?.permissionLevel === "EMPLOYEE" &&
        req.params.employeeId !== req.user.userId
      ) {
        sendError(res, "FORBIDDEN", "Access denied", 403);
        return;
      }

      const dateRange =
        req.query.startDate && req.query.endDate
          ? {
              startDate: new Date(req.query.startDate as string),
              endDate: new Date(req.query.endDate as string),
            }
          : undefined;

      const stats = await timeStatsService.getEmployeeStats(
        req.params.employeeId,
        dateRange,
      );
      sendSuccess(res, stats);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_STATS_EMPLOYEE_FAILED",
        getSafeErrorMessage(error, "Failed to get employee stats"),
        400,
      );
    }
  },
);

/**
 * GET /api/time-stats/my
 * 取得當前用戶工時統計
 */
router.get(
  "/my",
  [
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const dateRange =
        req.query.startDate && req.query.endDate
          ? {
              startDate: new Date(req.query.startDate as string),
              endDate: new Date(req.query.endDate as string),
            }
          : undefined;

      const stats = await timeStatsService.getEmployeeStats(
        req.user.userId,
        dateRange,
      );
      sendSuccess(res, stats);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_STATS_MY_FAILED",
        getSafeErrorMessage(error, "Failed to get stats"),
        400,
      );
    }
  },
);

/**
 * GET /api/time-stats/my/monthly
 * 取得當前用戶月度摘要
 */
router.get(
  "/my/monthly",
  [
    query("year").isInt({ min: 2020, max: 2100 }).toInt(),
    query("month").isInt({ min: 1, max: 12 }).toInt(),
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

      const summary = await timeStatsService.getMonthlySummary(
        req.user.userId,
        Number(req.query.year),
        Number(req.query.month),
      );
      sendSuccess(res, summary);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_STATS_MONTHLY_FAILED",
        getSafeErrorMessage(error, "Failed to get monthly summary"),
        400,
      );
    }
  },
);

/**
 * GET /api/time-stats/dashboard
 * 取得團隊儀表板統計（PM/Admin）
 */
router.get(
  "/dashboard",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [query("startDate").isISO8601(), query("endDate").isISO8601()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "VALIDATION_ERROR", "Invalid input", 400, errors.array());
      return;
    }

    try {
      const dashboard = await timeStatsService.getTeamDashboard({
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
      });
      sendSuccess(res, dashboard);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_STATS_DASHBOARD_FAILED",
        getSafeErrorMessage(error, "Failed to get dashboard stats"),
        500,
      );
    }
  },
);

/**
 * GET /api/time-stats/pending-approval
 * 取得待審核工時統計（PM/Admin）
 */
router.get(
  "/pending-approval",
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Not authenticated", 401);
        return;
      }

      const stats = await timeStatsService.getPendingApprovalStats(
        req.user.userId,
      );
      sendSuccess(res, stats);
    } catch (error: unknown) {
      sendError(
        res,
        "TIME_STATS_PENDING_FAILED",
        getSafeErrorMessage(error, "Failed to get pending approval stats"),
        500,
      );
    }
  },
);

export default router;
