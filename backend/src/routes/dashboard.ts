import { Router, Response } from "express";
import { dashboardService } from "../services/dashboardService";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { PermissionLevel } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/response";
import logger from "../config/logger";

const router = Router();

router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * 取得儀表板統計資料
 */
router.get(
  "/stats",
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      logger.error("Dashboard stats error:", error);
      sendError(
        res,
        "DASHBOARD_STATS_FAILED",
        "Failed to get dashboard stats",
        500,
      );
    }
  },
);

/**
 * GET /api/dashboard/workloads
 * 取得職能負載統計
 */
router.get(
  "/workloads",
  authorize(
    PermissionLevel.PM,
    PermissionLevel.PRODUCER,
    PermissionLevel.MANAGER,
    PermissionLevel.ADMIN,
  ),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const workloads = await dashboardService.getWorkloads();
      sendSuccess(res, workloads);
    } catch (error) {
      logger.error("Dashboard workloads error:", error);
      sendError(
        res,
        "DASHBOARD_WORKLOADS_FAILED",
        "Failed to get workloads",
        500,
      );
    }
  },
);

export default router;
