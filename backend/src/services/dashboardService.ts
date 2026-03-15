import prisma from "../config/database";
import { PermissionLevel } from "@prisma/client";
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
  /** Clear all dashboard caches (call after task state changes) */
  invalidateCache(): void {
    cache.flushAll();
  }

  /**
   * 取得儀表板統計
   */
  async getStats(
    userId?: string,
    permissionLevel?: PermissionLevel,
  ): Promise<DashboardStats> {
    const isGlobalRole = permissionLevel === PermissionLevel.ADMIN;
    const cacheKey = isGlobalRole
      ? "dashboard_stats"
      : `dashboard_stats_${userId || "global"}`;
    const cached = cache.get<DashboardStats>(cacheKey);
    if (cached) return cached;

    // Only ADMIN sees all tasks; non-ADMIN scoped to their own projects
    let userFilter: any = {};
    if (!isGlobalRole && userId) {
      // Non-ADMIN: scope to tasks in user's projects
      const memberProjects = await prisma.projectMember.findMany({
        where: { employeeId: userId },
        select: { projectId: true },
      });
      const projectIds = memberProjects.map((m) => m.projectId);
      userFilter = { projectId: { in: projectIds } };
    }

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      unclaimedTasks,
      overdueTasksCount,
    ] = await Promise.all([
      prisma.task.count({ where: { ...userFilter } }),
      prisma.task.count({ where: { status: "DONE", ...userFilter } }),
      prisma.task.count({
        where: { status: { in: ["CLAIMED", "IN_PROGRESS"] }, ...userFilter },
      }),
      prisma.task.count({ where: { status: "UNCLAIMED", ...userFilter } }),
      prisma.task.count({
        where: {
          plannedEndDate: { lt: new Date() },
          status: { notIn: ["DONE"] },
          ...userFilter,
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
    cache.set(cacheKey, stats);
    return stats;
  }

  /**
   * 取得職能負載統計
   * ADMIN sees global data; non-ADMIN sees only tasks from their projects.
   * Employee counts remain global (org capacity).
   */
  async getWorkloads(
    userId?: string,
    permissionLevel?: PermissionLevel,
  ): Promise<FunctionWorkload[]> {
    const isAdmin = !userId || permissionLevel === PermissionLevel.ADMIN;
    const cacheKey = isAdmin
      ? "dashboard_workloads"
      : `dashboard_workloads_${userId}`;
    const cached = cache.get<FunctionWorkload[]>(cacheKey);
    if (cached) return cached;

    // For non-ADMIN, scope task counts to user's projects
    let projectFilter: { projectId?: { in: string[] } } = {};
    if (!isAdmin && userId) {
      const memberProjects = await prisma.projectMember.findMany({
        where: { employeeId: userId },
        select: { projectId: true },
      });
      const projectIds = memberProjects.map((m) => m.projectId);
      projectFilter = { projectId: { in: projectIds } };
    }

    const functionTypes = [
      "PLANNING",
      "PROGRAMMING",
      "ART",
      "ANIMATION",
      "SOUND",
      "VFX",
      "COMBAT",
    ];

    // Single aggregation query instead of 28 individual COUNTs
    const projectCondition = projectFilter.projectId
      ? `AND t."project_id" = ANY($1::text[])`
      : "";
    const params: any[] = projectFilter.projectId
      ? [projectFilter.projectId.in]
      : [];

    const taskStatsQuery = `
      SELECT
        unnest(t."function_tags") AS function_type,
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE t."status" = 'UNCLAIMED') AS unclaimed_tasks,
        COUNT(*) FILTER (WHERE t."status" IN ('CLAIMED', 'IN_PROGRESS')) AS in_progress_tasks
      FROM "tasks" t
      WHERE TRUE ${projectCondition}
      GROUP BY function_type
    `;

    const employeeStatsQuery = `
      SELECT
        e."function_type",
        COUNT(*) AS member_count
      FROM "employees" e
      WHERE e."is_active" = true AND e."function_type" IS NOT NULL
      GROUP BY e."function_type"
    `;

    const [taskStats, employeeStats] = await Promise.all([
      prisma.$queryRawUnsafe(taskStatsQuery, ...params) as Promise<
        Array<{
          function_type: string;
          total_tasks: bigint;
          unclaimed_tasks: bigint;
          in_progress_tasks: bigint;
        }>
      >,
      prisma.$queryRawUnsafe(employeeStatsQuery) as Promise<
        Array<{ function_type: string; member_count: bigint }>
      >,
    ]);

    const taskMap = new Map(
      taskStats.map((r) => [
        r.function_type,
        {
          totalTasks: Number(r.total_tasks),
          unclaimedTasks: Number(r.unclaimed_tasks),
          inProgressTasks: Number(r.in_progress_tasks),
        },
      ]),
    );
    const empMap = new Map(
      employeeStats.map((r) => [r.function_type, Number(r.member_count)]),
    );

    const workloads = functionTypes.map((functionType) => ({
      functionType,
      memberCount: empMap.get(functionType) || 0,
      totalTasks: taskMap.get(functionType)?.totalTasks || 0,
      unclaimedTasks: taskMap.get(functionType)?.unclaimedTasks || 0,
      inProgressTasks: taskMap.get(functionType)?.inProgressTasks || 0,
    }));

    cache.set(cacheKey, workloads);
    return workloads;
  }
}

export const dashboardService = new DashboardService();
