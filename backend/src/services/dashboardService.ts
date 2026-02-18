import prisma from "../config/database";
import NodeCache from "node-cache";

// 快取：TTL 60 秒，避免每次請求都做聚合查詢
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  unclaimedTasks: number;
  overdueTasksCount: number;
}

export interface FunctionWorkload {
  functionType: string;
  totalTasks: number;
  unclaimedTasks: number;
  inProgressTasks: number;
  memberCount: number;
}

export class DashboardService {
  /**
   * 取得儀表板統計
   */
  async getStats(): Promise<DashboardStats> {
    const cached = cache.get<DashboardStats>("dashboard_stats");
    if (cached) return cached;

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      unclaimedTasks,
      overdueTasksCount,
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: "DONE" } }),
      prisma.task.count({
        where: { status: { in: ["CLAIMED", "IN_PROGRESS"] } },
      }),
      prisma.task.count({ where: { status: "UNCLAIMED" } }),
      prisma.task.count({
        where: {
          plannedEndDate: { lt: new Date() },
          status: { notIn: ["DONE"] },
        },
      }),
    ]);

    const stats = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      unclaimedTasks,
      overdueTasksCount,
    };
    cache.set("dashboard_stats", stats);
    return stats;
  }

  /**
   * 取得職能負載統計
   */
  async getWorkloads(): Promise<FunctionWorkload[]> {
    const cached = cache.get<FunctionWorkload[]>("dashboard_workloads");
    if (cached) return cached;

    const functionTypes = [
      "PLANNING",
      "PROGRAMMING",
      "ART",
      "ANIMATION",
      "SOUND",
      "VFX",
      "COMBAT",
    ];

    // 使用 $transaction 批次處理所有查詢，減少 DB round-trips
    const queries = functionTypes.flatMap((functionType) => [
      prisma.employee.count({
        where: { functionType, isActive: true },
      }),
      prisma.task.count({
        where: { functionTags: { has: functionType } },
      }),
      prisma.task.count({
        where: {
          functionTags: { has: functionType },
          status: "UNCLAIMED",
        },
      }),
      prisma.task.count({
        where: {
          functionTags: { has: functionType },
          status: { in: ["CLAIMED", "IN_PROGRESS"] },
        },
      }),
    ]);

    const results = await prisma.$transaction(queries);

    const workloads = functionTypes.map((functionType, i) => ({
      functionType,
      memberCount: results[i * 4] as number,
      totalTasks: results[i * 4 + 1] as number,
      unclaimedTasks: results[i * 4 + 2] as number,
      inProgressTasks: results[i * 4 + 3] as number,
    }));

    cache.set("dashboard_workloads", workloads);
    return workloads;
  }
}

export const dashboardService = new DashboardService();
