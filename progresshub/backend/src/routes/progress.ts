import { Router, Response } from 'express';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 提交進度回報
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { taskId, progressPercentage, notes } = req.body;

    if (!taskId || progressPercentage === undefined) {
      throw new HttpError('任務ID和進度百分比為必填', 400);
    }

    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new HttpError('進度百分比必須在 0-100 之間', 400);
    }

    // Verify task exists and user is assigned
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpError('任務不存在', 404);
    }

    // Check if user is assigned to this task or is a collaborator
    const isAssigned = task.assignedToId === req.user!.id;
    const isCollaborator = task.collaborators.includes(req.user!.id);

    if (!isAssigned && !isCollaborator && req.user!.permissionLevel === 'EMPLOYEE') {
      throw new HttpError('您沒有權限回報此任務的進度', 403);
    }

    // Create progress log
    const progressLog = await prisma.progressLog.create({
      data: {
        taskId,
        employeeId: req.user!.id,
        progressPercentage,
        notes,
      },
    });

    // Update task progress and status
    let newStatus: TaskStatus = task.status;
    if (progressPercentage === 100) {
      newStatus = TaskStatus.COMPLETED;
    } else if (progressPercentage > 0 && task.status === TaskStatus.NOT_STARTED) {
      newStatus = TaskStatus.IN_PROGRESS;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        progressPercentage,
        status: newStatus,
        ...(progressPercentage > 0 && !task.actualStartDate && {
          actualStartDate: new Date(),
        }),
        ...(progressPercentage === 100 && {
          actualEndDate: new Date(),
        }),
      },
    });

    res.status(201).json({ success: true, progressLog });
  } catch (error) {
    next(error);
  }
});

// 查詢進度記錄
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { taskId, employeeId, date, startDate, endDate } = req.query;

    const where: any = {};

    if (taskId) {
      where.taskId = taskId;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      const queryDate = new Date(date as string);
      const nextDay = new Date(queryDate);
      nextDay.setDate(nextDay.getDate() + 1);

      where.reportedAt = {
        gte: queryDate,
        lt: nextDay,
      };
    } else if (startDate || endDate) {
      where.reportedAt = {};
      if (startDate) {
        where.reportedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.reportedAt.lte = new Date(endDate as string);
      }
    }

    const logs = await prisma.progressLog.findMany({
      where,
      include: {
        task: {
          select: { id: true, name: true, projectId: true },
        },
        employee: {
          select: { id: true, name: true },
        },
      },
      orderBy: { reportedAt: 'desc' },
    });

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
});

// 我的回報記錄
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { limit = 20 } = req.query;

    const logs = await prisma.progressLog.findMany({
      where: { employeeId: req.user!.id },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { reportedAt: 'desc' },
      take: Number(limit),
    });

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
});

// 檢查今日是否已回報
router.get('/today-status', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 取得今日已回報的任務
    const todayLogs = await prisma.progressLog.findMany({
      where: {
        employeeId: req.user!.id,
        reportedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        taskId: true,
      },
    });

    const reportedTaskIds = todayLogs.map((log) => log.taskId);

    // 取得所有待回報的任務
    const pendingTasks = await prisma.task.findMany({
      where: {
        assignedToId: req.user!.id,
        status: { not: TaskStatus.COMPLETED },
        id: { notIn: reportedTaskIds },
      },
      select: {
        id: true,
        name: true,
        project: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      reportedCount: reportedTaskIds.length,
      pendingTasks,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
