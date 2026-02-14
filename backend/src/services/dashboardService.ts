import prisma from "../config/database";

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

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      unclaimedTasks,
      overdueTasksCount,
    };
  }

  /**
   * 取得職能負載統計
   */
  async getWorkloads(): Promise<FunctionWorkload[]> {
    const functionTypes = [
      "PLANNING",
      "PROGRAMMING",
      "ART",
      "ANIMATION",
      "SOUND",
      "VFX",
      "COMBAT",
    ];

    const workloads = await Promise.all(
      functionTypes.map(async (functionType) => {
        const [memberCount, totalTasks, unclaimedTasks, inProgressTasks] =
          await Promise.all([
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

        return {
          functionType,
          totalTasks,
          unclaimedTasks,
          inProgressTasks,
          memberCount,
        };
      }),
    );

    return workloads;
  }
}

export const dashboardService = new DashboardService();
