import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 取得甘特圖資料
router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId, employeeId, role, startDate, endDate } = req.query;

    // Build task filter
    const taskWhere: any = {};

    if (projectId) {
      taskWhere.projectId = projectId;
    }

    if (employeeId) {
      taskWhere.assignedToId = employeeId;
    }

    if (role) {
      taskWhere.assignedTo = { role };
    }

    if (startDate || endDate) {
      taskWhere.OR = [];

      if (startDate && endDate) {
        // Tasks that overlap with the date range
        taskWhere.OR.push({
          AND: [
            { plannedStartDate: { lte: new Date(endDate as string) } },
            { plannedEndDate: { gte: new Date(startDate as string) } },
          ],
        });
      } else if (startDate) {
        taskWhere.plannedEndDate = { gte: new Date(startDate as string) };
      } else if (endDate) {
        taskWhere.plannedStartDate = { lte: new Date(endDate as string) };
      }
    }

    // Fetch tasks with related data
    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        milestone: { select: { id: true, name: true, targetDate: true } },
      },
      orderBy: [{ projectId: 'asc' }, { plannedStartDate: 'asc' }],
    });

    // Fetch milestones for the projects
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const milestones = await prisma.milestone.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: 'asc' },
    });

    // Format data for Frappe Gantt
    const ganttTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.plannedStartDate.toISOString().split('T')[0],
      end: task.plannedEndDate.toISOString().split('T')[0],
      progress: task.progressPercentage,
      dependencies: task.dependencies.join(', '),
      custom_class: getTaskClass(task.status, task.progressPercentage),
      // Additional data for UI
      projectId: task.projectId,
      projectName: task.project.name,
      assigneeId: task.assignedTo.id,
      assigneeName: task.assignedTo.name,
      assigneeRole: task.assignedTo.role,
      status: task.status,
      actualStart: task.actualStartDate?.toISOString().split('T')[0],
      actualEnd: task.actualEndDate?.toISOString().split('T')[0],
      milestoneId: task.milestoneId,
      milestoneName: task.milestone?.name,
    }));

    // Format milestones for Gantt
    const ganttMilestones = milestones.map((ms) => ({
      id: `milestone-${ms.id}`,
      name: `[${ms.name}]`,
      start: ms.targetDate.toISOString().split('T')[0],
      end: ms.targetDate.toISOString().split('T')[0],
      progress: ms.status === 'ACHIEVED' ? 100 : 0,
      dependencies: '',
      custom_class: ms.status === 'ACHIEVED' ? 'milestone-achieved' : 'milestone-pending',
      isMilestone: true,
      projectId: ms.projectId,
      projectName: ms.project.name,
      status: ms.status,
    }));

    res.json({
      success: true,
      tasks: ganttTasks,
      milestones: ganttMilestones,
      // Combined for Frappe Gantt
      ganttData: [...ganttTasks, ...ganttMilestones].sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to get task CSS class
function getTaskClass(status: string, progress: number): string {
  if (status === 'COMPLETED') return 'task-completed';
  if (progress > 80) return 'task-almost-done';
  if (progress > 50) return 'task-in-progress';
  if (progress > 0) return 'task-started';
  return 'task-not-started';
}

// 取得甘特圖統計數據
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.query;

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const [totalTasks, completedTasks, inProgressTasks, notStartedTasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...where, status: 'NOT_STARTED' } }),
    ]);

    // Calculate average progress
    const avgProgress = await prisma.task.aggregate({
      where,
      _avg: { progressPercentage: true },
    });

    res.json({
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        averageProgress: Math.round(avgProgress._avg.progressPercentage || 0),
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
