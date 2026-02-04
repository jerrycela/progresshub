import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, requirePM, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 取得專案列表
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, projects });
  } catch (error) {
    next(error);
  }
});

// 取得單一專案
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, role: true },
            },
            milestone: {
              select: { id: true, name: true },
            },
          },
        },
        milestones: true,
      },
    });

    if (!project) {
      throw new HttpError('專案不存在', 404);
    }

    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

// 建立專案 (PM/Admin)
router.post('/', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, description, startDate, endDate } = req.body;

    if (!name || !startDate) {
      throw new HttpError('專案名稱和開始日期為必填', 400);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

// 更新專案 (PM/Admin)
router.put('/:id', authenticate, requirePM, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, status } = req.body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('專案不存在', 404);
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
      },
    });

    res.json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

// 刪除專案 (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('專案不存在', 404);
    }

    await prisma.project.delete({ where: { id } });

    res.json({ success: true, message: '專案已刪除' });
  } catch (error) {
    next(error);
  }
});

export default router;
