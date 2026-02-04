import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, requirePM, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 取得我的任務
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: req.user!.id },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
      },
      orderBy: { plannedEndDate: 'asc' },
    });

    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
});

// 取得專案的所有任務
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        milestone: { select: { id: true, name: true } },
      },
      orderBy: { plannedStartDate: 'asc' },
    });

    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
});

// 取得單一任務
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        milestone: { select: { id: true, name: true } },
        progressLogs: {
          include: {
            employee: { select: { id: true, name: true } },
          },
          orderBy: { reportedAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new HttpError('任務不存在', 404);
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

// 建立任務 (PM/Admin)
router.post('/', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const {
      projectId,
      name,
      description,
      assignedToId,
      collaborators,
      plannedStartDate,
      plannedEndDate,
      milestoneId,
      dependencies,
    } = req.body;

    if (!projectId || !name || !assignedToId || !plannedStartDate || !plannedEndDate) {
      throw new HttpError('缺少必要欄位', 400);
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpError('專案不存在', 404);
    }

    // Verify assignee exists
    const assignee = await prisma.employee.findUnique({ where: { id: assignedToId } });
    if (!assignee) {
      throw new HttpError('指定的負責人不存在', 404);
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        name,
        description,
        assignedToId,
        collaborators: collaborators || [],
        plannedStartDate: new Date(plannedStartDate),
        plannedEndDate: new Date(plannedEndDate),
        milestoneId,
        dependencies: dependencies || [],
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

// 更新任務 (PM/Admin)
router.put('/:id', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      assignedToId,
      collaborators,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      progressPercentage,
      status,
      milestoneId,
      dependencies,
    } = req.body;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('任務不存在', 404);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(assignedToId && { assignedToId }),
        ...(collaborators !== undefined && { collaborators }),
        ...(plannedStartDate && { plannedStartDate: new Date(plannedStartDate) }),
        ...(plannedEndDate && { plannedEndDate: new Date(plannedEndDate) }),
        ...(actualStartDate !== undefined && {
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
        }),
        ...(actualEndDate !== undefined && {
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
        }),
        ...(progressPercentage !== undefined && { progressPercentage }),
        ...(status && { status }),
        ...(milestoneId !== undefined && { milestoneId }),
        ...(dependencies !== undefined && { dependencies }),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

// 刪除任務 (PM/Admin)
router.delete('/:id', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('任務不存在', 404);
    }

    await prisma.task.delete({ where: { id } });

    res.json({ success: true, message: '任務已刪除' });
  } catch (error) {
    next(error);
  }
});

export default router;
