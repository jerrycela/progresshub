import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HttpError } from '../middleware/errorHandler';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 取得員工列表
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { department, role, permissionLevel, isActive } = req.query;

    const where: any = {};

    if (department) {
      where.department = department;
    }

    if (role) {
      where.role = role;
    }

    if (permissionLevel) {
      where.permissionLevel = permissionLevel;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        role: true,
        permissionLevel: true,
        isActive: true,
        _count: {
          select: { assignedTasks: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, employees });
  } catch (error) {
    next(error);
  }
});

// 取得單一員工
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        assignedTasks: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { progressLogs: true },
        },
      },
    });

    if (!employee) {
      throw new HttpError('員工不存在', 404);
    }

    res.json({ success: true, employee });
  } catch (error) {
    next(error);
  }
});

// 更新員工資訊 (Admin)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { name, department, role, permissionLevel, managedProjects, isActive } = req.body;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('員工不存在', 404);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(department !== undefined && { department }),
        ...(role !== undefined && { role }),
        ...(permissionLevel && { permissionLevel }),
        ...(managedProjects !== undefined && { managedProjects }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, employee });
  } catch (error) {
    next(error);
  }
});

// 停用員工 (Admin)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError('員工不存在', 404);
    }

    // Soft delete - just mark as inactive
    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: '員工已停用' });
  } catch (error) {
    next(error);
  }
});

// 取得部門列表
router.get('/meta/departments', authenticate, async (req, res, next) => {
  try {
    const departments = await prisma.employee.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });

    res.json({
      success: true,
      departments: departments.map((d) => d.department).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
});

// 取得職能列表
router.get('/meta/roles', authenticate, async (req, res, next) => {
  try {
    const roles = await prisma.employee.findMany({
      where: { role: { not: null } },
      select: { role: true },
      distinct: ['role'],
    });

    res.json({
      success: true,
      roles: roles.map((r) => r.role).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
