import prisma from "../config/database";
import { Task, TaskStatus, Prisma } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";

// 合法的 functionTags 值（對齊前端 FunctionType）
const VALID_FUNCTION_TAGS = [
  "PLANNING",
  "PROGRAMMING",
  "ART",
  "ANIMATION",
  "SOUND",
  "VFX",
  "COMBAT",
] as const;

function validateFunctionTags(tags: string[]): void {
  const invalid = tags.filter(
    (t) =>
      !VALID_FUNCTION_TAGS.includes(t as (typeof VALID_FUNCTION_TAGS)[number]),
  );
  if (invalid.length > 0) {
    throw new AppError(
      400,
      `Invalid functionTags: ${invalid.join(", ")}`,
      "INVALID_FUNCTION_TAGS",
    );
  }
}

// 狀態轉換規則（對齊前端 TaskStatusTransitions）
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  UNCLAIMED: ["CLAIMED"],
  CLAIMED: ["UNCLAIMED", "IN_PROGRESS", "BLOCKED", "PAUSED"],
  IN_PROGRESS: ["CLAIMED", "PAUSED", "BLOCKED", "DONE"],
  PAUSED: ["IN_PROGRESS"],
  BLOCKED: ["IN_PROGRESS"],
  DONE: [],
};

// 查詢時包含的關聯（用於 toTaskDTO）
const TASK_INCLUDE = {
  project: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true, email: true } },
  milestone: { select: { id: true, name: true } },
  gitlabIssueMapping: { select: { gitlabIssueId: true, issueUrl: true } },
} as const;

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface CreateTaskDto {
  projectId: string;
  name: string;
  description?: string;
  priority?: string;
  assignedToId?: string;
  collaborators?: string[];
  functionTags?: string[];
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  dependencies?: string[];
  milestoneId?: string;
  estimatedHours?: number;
  creatorId?: string;
}

export interface UpdateTaskDto {
  name?: string;
  description?: string;
  priority?: string;
  assignedToId?: string;
  collaborators?: string[];
  functionTags?: string[];
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progressPercentage?: number;
  status?: TaskStatus;
  dependencies?: string[];
  milestoneId?: string;
  estimatedHours?: number;
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
  async getTasks(
    params: TaskListParams,
  ): Promise<{ data: Task[]; total: number }> {
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
        orderBy: { plannedStartDate: "asc" },
        include: TASK_INCLUDE,
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 取得任務池（UNCLAIMED 任務）
   */
  async getPoolTasks(): Promise<Task[]> {
    return prisma.task.findMany({
      where: { status: "UNCLAIMED" },
      orderBy: { createdAt: "desc" },
      include: {
        ...TASK_INCLUDE,
        taskNotes: { select: { id: true } },
      },
    });
  }

  /**
   * 取得單一任務
   */
  async getTaskById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        progressLogs: {
          orderBy: { reportedAt: "desc" },
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
  async getTasksByEmployee(
    employeeId: string,
    status?: TaskStatus,
  ): Promise<Task[]> {
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
      include: TASK_INCLUDE,
      orderBy: { plannedEndDate: "asc" },
    });
  }

  /**
   * 建立任務
   */
  async createTask(data: CreateTaskDto): Promise<Task> {
    if (data.functionTags && data.functionTags.length > 0) {
      validateFunctionTags(data.functionTags);
    }

    if (data.dependencies && data.dependencies.length > 0) {
      const existingTasks = await prisma.task.count({
        where: { id: { in: data.dependencies } },
      });
      if (existingTasks !== data.dependencies.length) {
        throw new AppError(
          400,
          "One or more dependency task IDs do not exist",
          "INVALID_DEPENDENCIES",
        );
      }
    }

    return prisma.task.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        priority: data.priority || "MEDIUM",
        assignedToId: data.assignedToId,
        collaborators: data.collaborators || [],
        functionTags: data.functionTags || [],
        plannedStartDate: data.plannedStartDate
          ? new Date(data.plannedStartDate)
          : undefined,
        plannedEndDate: data.plannedEndDate
          ? new Date(data.plannedEndDate)
          : undefined,
        dependencies: data.dependencies || [],
        milestoneId: data.milestoneId,
        estimatedHours: data.estimatedHours,
        creatorId: data.creatorId,
        status: data.assignedToId ? "CLAIMED" : "UNCLAIMED",
      },
      include: TASK_INCLUDE,
    });
  }

  /**
   * 更新任務
   */
  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    if (data.functionTags && data.functionTags.length > 0) {
      validateFunctionTags(data.functionTags);
    }

    if (data.dependencies && data.dependencies.length > 0) {
      const existingTasks = await prisma.task.count({
        where: { id: { in: data.dependencies } },
      });
      if (existingTasks !== data.dependencies.length) {
        throw new AppError(
          400,
          "One or more dependency task IDs do not exist",
          "INVALID_DEPENDENCIES",
        );
      }
    }

    const updateData: Prisma.TaskUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assignedToId !== undefined) {
      updateData.assignedTo = data.assignedToId
        ? { connect: { id: data.assignedToId } }
        : { disconnect: true };
    }
    if (data.collaborators !== undefined)
      updateData.collaborators = data.collaborators;
    if (data.functionTags !== undefined)
      updateData.functionTags = data.functionTags;
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
    if (data.dependencies !== undefined)
      updateData.dependencies = data.dependencies;
    if (data.estimatedHours !== undefined)
      updateData.estimatedHours = data.estimatedHours;
    if (data.milestoneId !== undefined) {
      updateData.milestone = data.milestoneId
        ? { connect: { id: data.milestoneId } }
        : { disconnect: true };
    }

    return prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_INCLUDE,
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
   * 認領任務（原子操作，防止並發）
   */
  async claimTask(taskId: string, userId: string): Promise<Task> {
    return prisma.$transaction(async (tx: TransactionClient) => {
      // 原子更新：只有 UNCLAIMED 才能被認領
      const result = await tx.task.updateMany({
        where: { id: taskId, status: "UNCLAIMED" },
        data: {
          status: "CLAIMED",
          assignedToId: userId,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new AppError(
          409,
          "Task cannot be claimed — it may already be claimed or in progress",
          "TASK_NOT_CLAIMABLE",
        );
      }

      return tx.task.findUniqueOrThrow({
        where: { id: taskId },
        include: TASK_INCLUDE,
      });
    });
  }

  /**
   * 取消認領任務
   */
  async unclaimTask(taskId: string, userId: string): Promise<Task> {
    return prisma.$transaction(async (tx: TransactionClient) => {
      // 只有負責人可以取消認領，且狀態必須是 CLAIMED 或 IN_PROGRESS
      const result = await tx.task.updateMany({
        where: {
          id: taskId,
          assignedToId: userId,
          status: { in: ["CLAIMED", "IN_PROGRESS"] },
        },
        data: {
          status: "UNCLAIMED",
          assignedToId: null,
          progressPercentage: 0,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new AppError(
          409,
          "Task cannot be unclaimed — you may not be the assignee or the task status does not allow unclaiming",
          "TASK_NOT_UNCLAIMABLE",
        );
      }

      return tx.task.findUniqueOrThrow({
        where: { id: taskId },
        include: TASK_INCLUDE,
      });
    });
  }

  /**
   * 更新任務狀態（含狀態機驗證）
   */
  async updateStatus(
    taskId: string,
    newStatus: TaskStatus,
    payload?: {
      pauseReason?: string;
      pauseNote?: string;
      blockerReason?: string;
    },
  ): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError(404, "Task not found", "TASK_NOT_FOUND");
    }

    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        409,
        `Cannot transition task from ${task.status} to ${newStatus}`,
        "INVALID_TRANSITION",
      );
    }

    const updateData: Prisma.TaskUpdateInput = {
      status: newStatus,
    };

    // PAUSED 需要 pauseReason
    if (newStatus === "PAUSED") {
      if (!payload?.pauseReason) {
        throw new AppError(
          400,
          "Pause reason is required when pausing a task",
          "PAUSE_REASON_REQUIRED",
        );
      }
      updateData.pauseReason = payload.pauseReason;
      updateData.pauseNote = payload.pauseNote;
      updateData.pausedAt = new Date();
    }

    // BLOCKED 需要 blockerReason
    if (newStatus === "BLOCKED") {
      updateData.blockerReason = payload?.blockerReason;
    }

    // IN_PROGRESS 設定實際開始日期
    if (newStatus === "IN_PROGRESS" && !task.actualStartDate) {
      updateData.actualStartDate = new Date();
    }

    // 從 PAUSED/BLOCKED 恢復時清除原因
    if (
      newStatus === "IN_PROGRESS" &&
      (task.status === "PAUSED" || task.status === "BLOCKED")
    ) {
      updateData.pauseReason = null;
      updateData.pauseNote = null;
      updateData.pausedAt = null;
      updateData.blockerReason = null;
    }

    // DONE 設定實際結束日期和進度
    if (newStatus === "DONE") {
      updateData.actualEndDate = new Date();
      updateData.closedAt = new Date();
      updateData.progressPercentage = 100;
    }

    return prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: TASK_INCLUDE,
    });
  }

  /**
   * 更新任務進度（自動建立 ProgressLog）
   */
  async updateTaskProgress(
    taskId: string,
    employeeId: string,
    progressPercentage: number,
    notes?: string,
  ): Promise<Task> {
    return prisma.$transaction(async (tx: TransactionClient) => {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) {
        throw new AppError(404, "Task not found", "TASK_NOT_FOUND");
      }

      const progressDelta = progressPercentage - task.progressPercentage;

      // 建立進度記錄
      await tx.progressLog.create({
        data: {
          taskId,
          employeeId,
          progressPercentage,
          progressDelta,
          notes,
          reportType: progressPercentage === 100 ? "COMPLETE" : "PROGRESS",
        },
      });

      // 更新任務
      const newStatus: TaskStatus =
        progressPercentage === 100
          ? "DONE"
          : progressPercentage > 0 && task.status === "CLAIMED"
            ? "IN_PROGRESS"
            : task.status;

      return tx.task.update({
        where: { id: taskId },
        data: {
          progressPercentage,
          status: newStatus,
          actualStartDate:
            newStatus === "IN_PROGRESS" && !task.actualStartDate
              ? new Date()
              : undefined,
          actualEndDate: newStatus === "DONE" ? new Date() : undefined,
          closedAt: newStatus === "DONE" ? new Date() : undefined,
        },
        include: TASK_INCLUDE,
      });
    });
  }

  /**
   * 取得任務的進度記錄
   */
  async getTaskProgressLogs(taskId: string) {
    return prisma.progressLog.findMany({
      where: { taskId },
      orderBy: { reportedAt: "desc" },
      include: {
        employee: { select: { id: true, name: true } },
      },
    });
  }
}

export const taskService = new TaskService();
