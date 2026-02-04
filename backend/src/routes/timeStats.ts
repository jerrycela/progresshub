import { Router, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { timeStatsService } from '../services/timeStatsService';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { PermissionLevel } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * GET /api/time-stats/project/:projectId
 * 取得專案工時統計
 */
router.get(
  '/project/:projectId',
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    param('projectId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const dateRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const stats = await timeStatsService.getProjectStats(req.params.projectId, dateRange);
      res.json(stats);
    } catch (error: any) {
      console.error('Get project stats error:', error);
      res.status(400).json({ error: error.message || 'Failed to get project stats' });
    }
  }
);

/**
 * GET /api/time-stats/employee/:employeeId
 * 取得員工工時統計
 */
router.get(
  '/employee/:employeeId',
  [
    param('employeeId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      // 一般員工只能查看自己的統計
      if (
        req.user?.permissionLevel === 'EMPLOYEE' &&
        req.params.employeeId !== req.user.userId
      ) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const dateRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const stats = await timeStatsService.getEmployeeStats(req.params.employeeId, dateRange);
      res.json(stats);
    } catch (error: any) {
      console.error('Get employee stats error:', error);
      res.status(400).json({ error: error.message || 'Failed to get employee stats' });
    }
  }
);

/**
 * GET /api/time-stats/my
 * 取得當前用戶工時統計
 */
router.get(
  '/my',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const dateRange = req.query.startDate && req.query.endDate
        ? {
            startDate: new Date(req.query.startDate as string),
            endDate: new Date(req.query.endDate as string),
          }
        : undefined;

      const stats = await timeStatsService.getEmployeeStats(req.user.userId, dateRange);
      res.json(stats);
    } catch (error: any) {
      console.error('Get my stats error:', error);
      res.status(400).json({ error: error.message || 'Failed to get stats' });
    }
  }
);

/**
 * GET /api/time-stats/my/monthly
 * 取得當前用戶月度摘要
 */
router.get(
  '/my/monthly',
  [
    query('year').isInt({ min: 2020, max: 2100 }).toInt(),
    query('month').isInt({ min: 1, max: 12 }).toInt(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const summary = await timeStatsService.getMonthlySummary(
        req.user.userId,
        req.query.year as unknown as number,
        req.query.month as unknown as number
      );
      res.json(summary);
    } catch (error: any) {
      console.error('Get monthly summary error:', error);
      res.status(400).json({ error: error.message || 'Failed to get monthly summary' });
    }
  }
);

/**
 * GET /api/time-stats/dashboard
 * 取得團隊儀表板統計（PM/Admin）
 */
router.get(
  '/dashboard',
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const dashboard = await timeStatsService.getTeamDashboard({
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
      });
      res.json(dashboard);
    } catch (error: any) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
  }
);

/**
 * GET /api/time-stats/pending-approval
 * 取得待審核工時統計（PM/Admin）
 */
router.get(
  '/pending-approval',
  authorize(PermissionLevel.PM, PermissionLevel.ADMIN),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const stats = await timeStatsService.getPendingApprovalStats(req.user.userId);
      res.json(stats);
    } catch (error: any) {
      console.error('Get pending approval stats error:', error);
      res.status(500).json({ error: 'Failed to get pending approval stats' });
    }
  }
);

export default router;
