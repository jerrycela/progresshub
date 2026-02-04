import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, requirePM, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 取得專案的里程碑
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;

    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { targetDate: 'asc' },
    });

    res.json({ success: true, milestones });
  } catch (error) {
    next(error);
  }
});

// 取得單一里程碑
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!milestone) {
      throw new HttpError('里程碑不存在', 404);
    }

    res.json({ success: true, milestone });
  } catch (error) {
    next(error);
  }
});

// 建立里程碑 (PM/Admin)
router.post('/', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId, name, description, targetDate } = req.body;

    if (!projectId || !name || !targetDate) {
      throw new HttpError('專案ID、名稱和目標日期為必填', 400);
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new HttpError('專案不存在', 404);
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name,
        description,
        targetDate: new Date(targetDate),
      },
    });

    res.status(201).json({ success: true, milestone });
  } catch (error) {
    next(error);
  }
});

// 更新里程碑 (PM/Admin)
router.put('/:id', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { name, description, targetDate, status } = req.body;

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('里程碑不存在', 404);
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(targetDate && { targetDate: new Date(targetDate) }),
        ...(status && { status }),
      },
    });

    res.json({ success: true, milestone });
  } catch (error) {
    next(error);
  }
});

// 刪除里程碑 (PM/Admin)
router.delete('/:id', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('里程碑不存在', 404);
    }

    await prisma.milestone.delete({ where: { id } });

    res.json({ success: true, message: '里程碑已刪除' });
  } catch (error) {
    next(error);
  }
});

export default router;
