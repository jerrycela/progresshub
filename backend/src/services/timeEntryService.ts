import prisma from "../config/database";
import { Prisma, TimeEntryStatus } from "@prisma/client";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface CreateTimeEntryDto {
  employeeId: string;
  projectId: string;
  taskId?: string;
  categoryId: string;
  date: Date;
  hours: number;
  description?: string;
}

export interface UpdateTimeEntryDto {
  projectId?: string;
  taskId?: string;
  categoryId?: string;
  date?: Date;
  hours?: number;
  description?: string;
}

export interface TimeEntryListParams {
  employeeId?: string;
  projectId?: string;
  taskId?: string;
  categoryId?: string;
  status?: TimeEntryStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface WeeklyTimesheet {
  weekStart: Date;
  weekEnd: Date;
  entries: Array<{
    projectId: string;
    projectName: string;
    taskId?: string;
    taskName?: string;
    dailyHours: Record<string, number>;
    totalHours: number;
  }>;
  dailyTotals: Record<string, number>;
  weeklyTotal: number;
}

export class TimeEntryService {
  /**
   * 取得工時記錄列表
   */
  async getTimeEntries(params: TimeEntryListParams) {
    const {
      employeeId,
      projectId,
      taskId,
      categoryId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.TimeEntryWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [data, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          project: { select: { id: true, name: true } },
          task: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } },
          employee: { select: { id: true, name: true } },
        },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 取得單一工時記錄
   */
  async getTimeEntryById(id: string) {
    return prisma.timeEntry.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        category: true,
        employee: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 建立工時記錄
   */
  async createTimeEntry(data: CreateTimeEntryDto) {
    // 驗證業務規則
    await this.validateTimeEntry(data);

    return prisma.timeEntry.create({
      data: {
        employeeId: data.employeeId,
        projectId: data.projectId,
        taskId: data.taskId,
        categoryId: data.categoryId,
        date: new Date(data.date),
        hours: data.hours,
        description: data.description,
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
  }

  /**
   * 批次建立工時記錄（週報）
   */
  async createBatchTimeEntries(entries: CreateTimeEntryDto[]) {
    return prisma.$transaction(async (tx) => {
      const results = [];
      for (const entry of entries) {
        await this.validateTimeEntry(entry, tx);
        const created = await tx.timeEntry.create({
          data: {
            employeeId: entry.employeeId,
            projectId: entry.projectId,
            taskId: entry.taskId,
            categoryId: entry.categoryId,
            date: new Date(entry.date),
            hours: entry.hours,
            description: entry.description,
          },
        });
        results.push(created);
      }
      return results;
    });
  }

  /**
   * 更新工時記錄
   */
  async updateTimeEntry(id: string, data: UpdateTimeEntryDto) {
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) throw new Error("Time entry not found");
    if (existing.status === "APPROVED") {
      throw new Error("Cannot modify approved time entry");
    }

    return prisma.timeEntry.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        status: "PENDING", // 修改後重設為待審核
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
  }

  /**
   * 刪除工時記錄
   */
  async deleteTimeEntry(id: string) {
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) throw new Error("Time entry not found");
    if (existing.status === "APPROVED") {
      throw new Error("Cannot delete approved time entry");
    }

    await prisma.timeEntry.delete({ where: { id } });
  }

  /**
   * 審核工時記錄
   */
  async approveTimeEntry(id: string, approverId: string) {
    return prisma.timeEntry.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * 駁回工時記錄
   */
  async rejectTimeEntry(id: string, approverId: string, reason: string) {
    return prisma.timeEntry.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });
  }

  /**
   * 批次審核
   */
  async batchApprove(ids: string[], approverId: string) {
    return prisma.timeEntry.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: {
        status: "APPROVED",
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * 取得週報資料
   */
  async getWeeklyTimesheet(
    employeeId: string,
    weekStart: Date,
  ): Promise<WeeklyTimesheet> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        date: { gte: weekStart, lte: weekEnd },
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    // 按專案/任務分組
    const grouped = new Map<
      string,
      {
        projectId: string;
        projectName: string;
        taskId?: string;
        taskName?: string;
        dailyHours: Record<string, number>;
        totalHours: number;
      }
    >();

    const dailyTotals: Record<string, number> = {};
    let weeklyTotal = 0;

    for (const entry of entries) {
      const key = entry.taskId
        ? `${entry.projectId}-${entry.taskId}`
        : entry.projectId;
      const dateKey = entry.date.toISOString().split("T")[0];
      const hours = Number(entry.hours);

      if (!grouped.has(key)) {
        grouped.set(key, {
          projectId: entry.projectId,
          projectName: entry.project.name,
          taskId: entry.taskId || undefined,
          taskName: entry.task?.name || undefined,
          dailyHours: {},
          totalHours: 0,
        });
      }

      const row = grouped.get(key)!;
      row.dailyHours[dateKey] = (row.dailyHours[dateKey] || 0) + hours;
      row.totalHours += hours;

      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + hours;
      weeklyTotal += hours;
    }

    return {
      weekStart,
      weekEnd,
      entries: Array.from(grouped.values()),
      dailyTotals,
      weeklyTotal,
    };
  }

  /**
   * 取得今日工時摘要
   */
  async getTodaySummary(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        date: today,
      },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
      },
    });

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

    return {
      date: today,
      entries,
      totalHours,
    };
  }

  /**
   * 驗證工時記錄
   */
  private async validateTimeEntry(
    data: CreateTimeEntryDto,
    tx?: TransactionClient,
  ) {
    const db = tx ?? prisma;

    // BR-01: 最小單位 0.25 小時
    if (data.hours % 0.25 !== 0) {
      throw new Error("Hours must be in increments of 0.25");
    }

    // BR-02: 單筆上限 12 小時
    if (data.hours > 12) {
      throw new Error("Single entry cannot exceed 12 hours");
    }

    // BR-03: 單日總工時上限 16 小時
    const existingTotal = await db.timeEntry.aggregate({
      where: {
        employeeId: data.employeeId,
        date: new Date(data.date),
      },
      _sum: { hours: true },
    });

    const currentTotal = Number(existingTotal._sum.hours || 0);
    if (currentTotal + data.hours > 16) {
      throw new Error("Daily total cannot exceed 16 hours");
    }

    // BR-04: 只能登記過去 7 天內的工時，且不允許未來日期
    const entryDate = new Date(data.date);
    entryDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (entryDate > today) {
      throw new Error("Cannot log time entries for future dates");
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (entryDate < sevenDaysAgo) {
      throw new Error("Cannot log time entries older than 7 days");
    }
  }
}

export const timeEntryService = new TimeEntryService();
