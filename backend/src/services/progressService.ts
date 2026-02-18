import prisma from "../config/database";
import { Prisma } from "@prisma/client";

// 使用 Prisma 生成的類型（需要先執行 prisma generate）
type ProgressLog = Prisma.ProgressLogGetPayload<object>;
type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface CreateProgressLogDto {
  taskId: string;
  employeeId: string;
  progressPercentage: number;
  notes?: string;
}

export interface ProgressListParams {
  taskId?: string;
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class ProgressService {
  /**
   * 取得進度記錄列表
   */
  async getProgressLogs(
    params: ProgressListParams,
  ): Promise<{ data: ProgressLog[]; total: number }> {
    const {
      taskId,
      employeeId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProgressLogWhereInput = {};

    if (taskId) {
      where.taskId = taskId;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (startDate || endDate) {
      where.reportedAt = {};
      if (startDate) {
        where.reportedAt.gte = startDate;
      }
      if (endDate) {
        where.reportedAt.lte = endDate;
      }
    }

    const [data, total] = await Promise.all([
      prisma.progressLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reportedAt: "desc" },
        include: {
          task: { select: { id: true, name: true, projectId: true } },
          employee: { select: { id: true, name: true } },
        },
      }),
      prisma.progressLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 建立進度回報（並更新任務進度）
   */
  async createProgressLog(data: CreateProgressLogDto): Promise<ProgressLog> {
    return prisma.$transaction(async (tx: TransactionClient) => {
      // 建立進度記錄
      const progressLog = await tx.progressLog.create({
        data: {
          taskId: data.taskId,
          employeeId: data.employeeId,
          progressPercentage: data.progressPercentage,
          notes: data.notes,
        },
        include: {
          task: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } },
        },
      });

      // 更新任務進度和狀態
      const task = await tx.task.findUnique({
        where: { id: data.taskId },
      });

      let status = task?.status;
      if (data.progressPercentage === 100) {
        status = "DONE";
      } else if (data.progressPercentage > 0 && task?.status === "UNCLAIMED") {
        status = "IN_PROGRESS";
      }
      // progressPercentage === 0 時保留原狀態，不強制轉為 UNCLAIMED

      await tx.task.update({
        where: { id: data.taskId },
        data: {
          progressPercentage: data.progressPercentage,
          status,
          // 如果是第一次進入進行中狀態，設定實際開始日期
          actualStartDate:
            status === "IN_PROGRESS" && !task?.actualStartDate
              ? new Date()
              : undefined,
          // 如果完成，設定實際結束日期
          actualEndDate: status === "DONE" ? new Date() : undefined,
        },
      });

      return progressLog;
    });
  }

  /**
   * 取得員工今日進度回報狀態
   */
  async getTodayProgressStatus(employeeId: string): Promise<{
    hasReported: boolean;
    tasksReported: number;
    totalInProgressTasks: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 取得今日回報數量
    const todayLogs = await prisma.progressLog.findMany({
      where: {
        employeeId,
        reportedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: { taskId: true },
    });

    // 取得進行中的任務數量
    const inProgressTasks = await prisma.task.count({
      where: {
        OR: [
          { assignedToId: employeeId },
          { collaborators: { has: employeeId } },
        ],
        status: "IN_PROGRESS",
      },
    });

    const uniqueTasksReported = new Set(todayLogs.map((log) => log.taskId))
      .size;

    return {
      hasReported: todayLogs.length > 0,
      tasksReported: uniqueTasksReported,
      totalInProgressTasks: inProgressTasks,
    };
  }

  /**
   * 取得專案進度統計
   */
  async getProjectProgressStats(
    projectId: string,
    days: number = 7,
  ): Promise<
    Array<{
      date: string;
      averageProgress: number;
      logsCount: number;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.progressLog.findMany({
      where: {
        task: { projectId },
        reportedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        progressPercentage: true,
        reportedAt: true,
      },
      orderBy: { reportedAt: "asc" },
    });

    // 按日期分組
    const groupedByDate = logs.reduce(
      (acc, log) => {
        const date = log.reportedAt.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { total: 0, count: 0 };
        }
        acc[date].total += log.progressPercentage;
        acc[date].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>,
    );

    // 轉換為陣列
    return Object.entries(groupedByDate).map(([date, stats]) => ({
      date,
      averageProgress: Math.round(stats.total / stats.count),
      logsCount: stats.count,
    }));
  }
}

export const progressService = new ProgressService();
