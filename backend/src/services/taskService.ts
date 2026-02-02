import prisma from '../config/database';
import { Task, TaskStatus, Prisma } from '@prisma/client';

export interface CreateTaskDto {
  projectId: string;
  name: string;
  assignedToId: string;
  collaborators?: string[];
  plannedStartDate: Date;
  plannedEndDate: Date;
  dependencies?: string[];
  milestoneId?: string;
}

export interface UpdateTaskDto {
  name?: string;
  assignedToId?: string;
  collaborators?: string[];
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progressPercentage?: number;
  status?: TaskStatus;
  dependencies?: string[];
  milestoneId?: string;
}

export interface TaskListParams {
  projectId?: string;
  assignedToId?: string;
  status?: TaskStatus;
  page?: number;
  limit?: number;
}

export class TaskService {
  /**
   * 取得任務列表（分頁）
   */
  async getTasks(params: TaskListParams): Promise<{ data: Task[]; total: number }> {
    const { projectId, assignedToId, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    }
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { plannedStartDate: 'asc' },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          milestone: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 取得單一任務
   */
  async getTaskById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignedTo: true,
        milestone: true,
        progressLogs: {
          orderBy: { reportedAt: 'desc' },
          take: 10,
          include: {
            employee: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * 取得使用者的任務
   */
  async getTasksByEmployee(employeeId: string, status?: TaskStatus): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {
      OR: [
        { assignedToId: employeeId },
        { collaborators: { has: employeeId } },
      ],
    };

    if (status) {
      where.status = status;
    }

    return prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { plannedEndDate: 'asc' },
    });
  }

  /**
   * 建立任務
   */
  async createTask(data: CreateTaskDto): Promise<Task> {
    return prisma.task.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        assignedToId: data.assignedToId,
        collaborators: data.collaborators || [],
        plannedStartDate: new Date(data.plannedStartDate),
        plannedEndDate: new Date(data.plannedEndDate),
        dependencies: data.dependencies || [],
        milestoneId: data.milestoneId,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 更新任務
   */
  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    const updateData: Prisma.TaskUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.assignedToId !== undefined) {
      updateData.assignedTo = { connect: { id: data.assignedToId } };
    }
    if (data.collaborators !== undefined) updateData.collaborators = data.collaborators;
    if (data.plannedStartDate !== undefined) {
      updateData.plannedStartDate = new Date(data.plannedStartDate);
    }
    if (data.plannedEndDate !== undefined) {
      updateData.plannedEndDate = new Date(data.plannedEndDate);
    }
    if (data.actualStartDate !== undefined) {
      updateData.actualStartDate = new Date(data.actualStartDate);
    }
    if (data.actualEndDate !== undefined) {
      updateData.actualEndDate = new Date(data.actualEndDate);
    }
    if (data.progressPercentage !== undefined) {
      updateData.progressPercentage = data.progressPercentage;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dependencies !== undefined) updateData.dependencies = data.dependencies;
    if (data.milestoneId !== undefined) {
      updateData.milestone = data.milestoneId
        ? { connect: { id: data.milestoneId } }
        : { disconnect: true };
    }

    return prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 刪除任務
   */
  async deleteTask(id: string): Promise<void> {
    await prisma.task.delete({
      where: { id },
    });
  }

  /**
   * 更新任務進度
   */
  async updateProgress(
    taskId: string,
    employeeId: string,
    progressPercentage: number,
    notes?: string
  ): Promise<Task> {
    // 建立進度記錄
    await prisma.progressLog.create({
      data: {
        taskId,
        employeeId,
        progressPercentage,
        notes,
      },
    });

    // 更新任務進度和狀態
    const status: TaskStatus =
      progressPercentage === 100
        ? 'COMPLETED'
        : progressPercentage > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED';

    return prisma.task.update({
      where: { id: taskId },
      data: {
        progressPercentage,
        status,
        actualStartDate:
          status === 'IN_PROGRESS'
            ? { set: new Date() }
            : undefined,
        actualEndDate:
          status === 'COMPLETED'
            ? { set: new Date() }
            : undefined,
      },
    });
  }
}

export const taskService = new TaskService();
