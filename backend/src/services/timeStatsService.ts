import prisma from '../config/database';
import { Prisma, TimeEntryStatus } from '@prisma/client';

export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}

export interface ProjectTimeStats {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  approvedHours: number;
  pendingHours: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    hours: number;
    percentage: number;
  }>;
}

export interface EmployeeTimeStats {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  approvedHours: number;
  pendingHours: number;
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    hours: number;
    percentage: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    hours: number;
    percentage: number;
  }>;
}

export interface TeamDashboard {
  period: DateRangeParams;
  totalHours: number;
  billableHours: number;
  approvedHours: number;
  pendingHours: number;
  employeeCount: number;
  projectCount: number;
  topProjects: Array<{
    projectId: string;
    projectName: string;
    hours: number;
  }>;
  topEmployees: Array<{
    employeeId: string;
    employeeName: string;
    hours: number;
  }>;
  dailyTrend: Array<{
    date: string;
    hours: number;
  }>;
}

export class TimeStatsService {
  /**
   * 取得專案工時統計
   */
  async getProjectStats(projectId: string, dateRange?: DateRangeParams): Promise<ProjectTimeStats> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const where: Prisma.TimeEntryWhereInput = { projectId };
    if (dateRange) {
      where.date = { gte: dateRange.startDate, lte: dateRange.endDate };
    }

    // 取得所有工時記錄
    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, billable: true } },
      },
    });

    // 計算統計數據
    let totalHours = 0;
    let billableHours = 0;
    let approvedHours = 0;
    let pendingHours = 0;
    const categoryMap = new Map<string, { name: string; hours: number }>();

    for (const entry of entries) {
      const hours = Number(entry.hours);
      totalHours += hours;

      if (entry.category.billable) {
        billableHours += hours;
      }

      if (entry.status === 'APPROVED') {
        approvedHours += hours;
      } else if (entry.status === 'PENDING') {
        pendingHours += hours;
      }

      const catKey = entry.categoryId;
      const existing = categoryMap.get(catKey);
      if (existing) {
        existing.hours += hours;
      } else {
        categoryMap.set(catKey, { name: entry.category.name, hours });
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      hours: data.hours,
      percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
    }));

    return {
      projectId: project.id,
      projectName: project.name,
      totalHours,
      billableHours,
      approvedHours,
      pendingHours,
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.hours - a.hours),
    };
  }

  /**
   * 取得員工工時統計
   */
  async getEmployeeStats(employeeId: string, dateRange?: DateRangeParams): Promise<EmployeeTimeStats> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const where: Prisma.TimeEntryWhereInput = { employeeId };
    if (dateRange) {
      where.date = { gte: dateRange.startDate, lte: dateRange.endDate };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    let totalHours = 0;
    let approvedHours = 0;
    let pendingHours = 0;
    const projectMap = new Map<string, { name: string; hours: number }>();
    const categoryMap = new Map<string, { name: string; hours: number }>();

    for (const entry of entries) {
      const hours = Number(entry.hours);
      totalHours += hours;

      if (entry.status === 'APPROVED') {
        approvedHours += hours;
      } else if (entry.status === 'PENDING') {
        pendingHours += hours;
      }

      // Project breakdown
      const projKey = entry.projectId;
      const existingProj = projectMap.get(projKey);
      if (existingProj) {
        existingProj.hours += hours;
      } else {
        projectMap.set(projKey, { name: entry.project.name, hours });
      }

      // Category breakdown
      const catKey = entry.categoryId;
      const existingCat = categoryMap.get(catKey);
      if (existingCat) {
        existingCat.hours += hours;
      } else {
        categoryMap.set(catKey, { name: entry.category.name, hours });
      }
    }

    const projectBreakdown = Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.name,
      hours: data.hours,
      percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
    }));

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      hours: data.hours,
      percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 100) : 0,
    }));

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      totalHours,
      approvedHours,
      pendingHours,
      projectBreakdown: projectBreakdown.sort((a, b) => b.hours - a.hours),
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.hours - a.hours),
    };
  }

  /**
   * 取得團隊儀表板統計
   */
  async getTeamDashboard(dateRange: DateRangeParams): Promise<TeamDashboard> {
    const entries = await prisma.timeEntry.findMany({
      where: {
        date: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      include: {
        project: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
        category: { select: { billable: true } },
      },
    });

    let totalHours = 0;
    let billableHours = 0;
    let approvedHours = 0;
    let pendingHours = 0;
    const employeeSet = new Set<string>();
    const projectSet = new Set<string>();
    const projectMap = new Map<string, { name: string; hours: number }>();
    const employeeMap = new Map<string, { name: string; hours: number }>();
    const dailyMap = new Map<string, number>();

    for (const entry of entries) {
      const hours = Number(entry.hours);
      totalHours += hours;

      if (entry.category.billable) billableHours += hours;
      if (entry.status === 'APPROVED') approvedHours += hours;
      if (entry.status === 'PENDING') pendingHours += hours;

      employeeSet.add(entry.employeeId);
      projectSet.add(entry.projectId);

      // Project aggregation
      const existingProj = projectMap.get(entry.projectId);
      if (existingProj) {
        existingProj.hours += hours;
      } else {
        projectMap.set(entry.projectId, { name: entry.project.name, hours });
      }

      // Employee aggregation
      const existingEmp = employeeMap.get(entry.employeeId);
      if (existingEmp) {
        existingEmp.hours += hours;
      } else {
        employeeMap.set(entry.employeeId, { name: entry.employee.name, hours });
      }

      // Daily trend
      const dateKey = entry.date.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + hours);
    }

    // Top 5 projects
    const topProjects = Array.from(projectMap.entries())
      .map(([projectId, data]) => ({ projectId, projectName: data.name, hours: data.hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Top 5 employees
    const topEmployees = Array.from(employeeMap.entries())
      .map(([employeeId, data]) => ({ employeeId, employeeName: data.name, hours: data.hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Daily trend (sorted by date)
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: dateRange,
      totalHours,
      billableHours,
      approvedHours,
      pendingHours,
      employeeCount: employeeSet.size,
      projectCount: projectSet.size,
      topProjects,
      topEmployees,
      dailyTrend,
    };
  }

  /**
   * 取得月度工時摘要
   */
  async getMonthlySummary(employeeId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        project: { select: { name: true } },
        category: { select: { name: true, billable: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Group by week
    const weeks: Array<{
      weekNumber: number;
      startDate: Date;
      endDate: Date;
      totalHours: number;
      billableHours: number;
    }> = [];

    let currentWeek: typeof weeks[0] | null = null;
    let weekNumber = 1;

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      const dayOfWeek = entryDate.getDay();
      const weekStart = new Date(entryDate);
      weekStart.setDate(entryDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      weekStart.setHours(0, 0, 0, 0);

      if (!currentWeek || weekStart.getTime() !== currentWeek.startDate.getTime()) {
        if (currentWeek) weeks.push(currentWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        currentWeek = {
          weekNumber: weekNumber++,
          startDate: weekStart,
          endDate: weekEnd,
          totalHours: 0,
          billableHours: 0,
        };
      }

      const hours = Number(entry.hours);
      currentWeek.totalHours += hours;
      if (entry.category.billable) {
        currentWeek.billableHours += hours;
      }
    }

    if (currentWeek) weeks.push(currentWeek);

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const billableHours = entries
      .filter(e => e.category.billable)
      .reduce((sum, e) => sum + Number(e.hours), 0);

    return {
      year,
      month,
      totalHours,
      billableHours,
      weeks,
      workingDays: new Set(entries.map(e => e.date.toISOString().split('T')[0])).size,
    };
  }

  /**
   * 取得待審核工時統計（PM 使用）
   */
  async getPendingApprovalStats(approverId: string) {
    // 取得 PM 管理的專案
    const approver = await prisma.employee.findUnique({
      where: { id: approverId },
      select: { managedProjects: true, permissionLevel: true },
    });

    if (!approver) {
      throw new Error('Approver not found');
    }

    let projectFilter: Prisma.TimeEntryWhereInput['projectId'];
    if (approver.permissionLevel === 'ADMIN') {
      // Admin 可以看到所有待審核
      projectFilter = undefined;
    } else if (approver.managedProjects.length > 0) {
      projectFilter = { in: approver.managedProjects };
    } else {
      return { totalPending: 0, byEmployee: [], byProject: [] };
    }

    const pendingEntries = await prisma.timeEntry.findMany({
      where: {
        status: 'PENDING',
        ...(projectFilter && { projectId: projectFilter }),
      },
      include: {
        employee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const employeeMap = new Map<string, { name: string; count: number; hours: number }>();
    const projectMap = new Map<string, { name: string; count: number; hours: number }>();

    for (const entry of pendingEntries) {
      const hours = Number(entry.hours);

      // By employee
      const emp = employeeMap.get(entry.employeeId);
      if (emp) {
        emp.count++;
        emp.hours += hours;
      } else {
        employeeMap.set(entry.employeeId, { name: entry.employee.name, count: 1, hours });
      }

      // By project
      const proj = projectMap.get(entry.projectId);
      if (proj) {
        proj.count++;
        proj.hours += hours;
      } else {
        projectMap.set(entry.projectId, { name: entry.project.name, count: 1, hours });
      }
    }

    return {
      totalPending: pendingEntries.length,
      totalPendingHours: pendingEntries.reduce((sum, e) => sum + Number(e.hours), 0),
      byEmployee: Array.from(employeeMap.entries()).map(([id, data]) => ({
        employeeId: id,
        employeeName: data.name,
        pendingCount: data.count,
        pendingHours: data.hours,
      })),
      byProject: Array.from(projectMap.entries()).map(([id, data]) => ({
        projectId: id,
        projectName: data.name,
        pendingCount: data.count,
        pendingHours: data.hours,
      })),
    };
  }
}

export const timeStatsService = new TimeStatsService();
