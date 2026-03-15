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

    // 使用 $transaction 批次處理所有查詢，減少 DB round-trips
    const queries = functionTypes.flatMap((functionType) => [
      // Employee counts remain global (org capacity)
      prisma.employee.count({
        where: { functionType, isActive: true },
      }),
      prisma.task.count({
        where: { functionTags: { has: functionType }, ...projectFilter },
      }),
      prisma.task.count({
        where: {
          functionTags: { has: functionType },
          status: "UNCLAIMED",
          ...projectFilter,
        },
      }),
      prisma.task.count({
        where: {
          functionTags: { has: functionType },
          status: { in: ["CLAIMED", "IN_PROGRESS"] },
          ...projectFilter,
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

    cache.set(cacheKey, workloads);
    return workloads;
  }
}

export const dashboardService = new DashboardService();
