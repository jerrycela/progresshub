import { Prisma, TaskStatus as PrismaTaskStatus } from '@prisma/client'
import prisma from '../lib/prisma'
import { TaskStatus } from '../types/task'
import {
  GanttQueryParams,
  GanttTask,
  GanttMilestone,
  GanttProject,
  GanttStats,
  GanttResponse,
  isTaskOverdue,
  getProgressBucket
} from '../types/gantt'

// ============================================
// Gantt Service
// ============================================

export class GanttService {
  // Get full Gantt data
  async getGanttData(params: GanttQueryParams): Promise<GanttResponse> {
    const taskWhere = this.buildTaskWhere(params)
    const milestoneWhere = this.buildMilestoneWhere(params)
    const projectWhere = this.buildProjectWhere(params)

    // Fetch all data in parallel
    const [tasks, milestones, projects] = await Promise.all([
      this.fetchTasks(taskWhere),
      this.fetchMilestones(milestoneWhere),
      this.fetchProjects(projectWhere)
    ])

    // Calculate date range
    const dateRange = this.calculateDateRange(tasks, milestones)

    return {
      projects,
      milestones,
      tasks,
      dateRange
    }
  }

  // Get statistics
  async getGanttStats(params: GanttQueryParams): Promise<GanttStats> {
    const where = this.buildTaskWhere(params)

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        status: true,
        progress: true,
        priority: true,
        dueDate: true
      }
    })

    // Initialize stats
    const stats: GanttStats = {
      total: tasks.length,
      unclaimed: 0,
      claimed: 0,
      inProgress: 0,
      paused: 0,
      blocked: 0,
      completed: 0,
      overdue: 0,
      progressDistribution: {
        notStarted: 0,
        early: 0,
        midway: 0,
        advanced: 0,
        nearComplete: 0,
        complete: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    }

    // Calculate stats
    tasks.forEach(task => {
      // Status counts
      switch (task.status) {
        case 'UNCLAIMED':
          stats.unclaimed++
          break
        case 'CLAIMED':
          stats.claimed++
          break
        case 'IN_PROGRESS':
          stats.inProgress++
          break
        case 'PAUSED':
          stats.paused++
          break
        case 'BLOCKED':
          stats.blocked++
          break
        case 'DONE':
          stats.completed++
          break
      }

      // Overdue count
      if (isTaskOverdue(task.dueDate, task.status as TaskStatus)) {
        stats.overdue++
      }

      // Progress distribution
      const bucket = getProgressBucket(task.progress)
      stats.progressDistribution[bucket]++

      // Priority counts
      switch (task.priority) {
        case 'LOW':
          stats.byPriority.low++
          break
        case 'MEDIUM':
          stats.byPriority.medium++
          break
        case 'HIGH':
          stats.byPriority.high++
          break
        case 'URGENT':
          stats.byPriority.urgent++
          break
      }
    })

    return stats
  }

  // Private helpers

  private buildTaskWhere(params: GanttQueryParams): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {}

    if (params.projectId) where.projectId = params.projectId
    if (params.milestoneId) where.milestoneId = params.milestoneId
    if (params.assigneeId) where.assigneeId = params.assigneeId
    if (params.status) where.status = params.status as PrismaTaskStatus

    // Date range filter
    if (params.startDate || params.endDate) {
      where.OR = [
        // Tasks that overlap with the date range
        {
          AND: [
            params.startDate ? { dueDate: { gte: new Date(params.startDate) } } : {},
            params.endDate ? { startedAt: { lte: new Date(params.endDate) } } : {}
          ]
        },
        // Tasks with dueDate in range
        {
          dueDate: {
            ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
            ...(params.endDate ? { lte: new Date(params.endDate) } : {})
          }
        }
      ]
    }

    return where
  }

  private buildMilestoneWhere(params: GanttQueryParams): Prisma.MilestoneWhereInput {
    const where: Prisma.MilestoneWhereInput = {}

    if (params.projectId) where.projectId = params.projectId
    if (params.milestoneId) where.id = params.milestoneId

    // Date range filter
    if (params.startDate || params.endDate) {
      where.dueDate = {
        ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
        ...(params.endDate ? { lte: new Date(params.endDate) } : {})
      }
    }

    return where
  }

  private buildProjectWhere(params: GanttQueryParams): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {}

    if (params.projectId) where.id = params.projectId

    return where
  }

  private async fetchTasks(where: Prisma.TaskWhereInput): Promise<GanttTask[]> {
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { name: true } },
        milestone: { select: { name: true } },
        assignee: { select: { name: true } }
      },
      orderBy: [{ startedAt: 'asc' }, { dueDate: 'asc' }]
    })

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as any,
      progress: task.progress,
      startDate: task.startedAt?.toISOString() || null,
      dueDate: task.dueDate?.toISOString() || null,
      projectId: task.projectId,
      projectName: task.project.name,
      milestoneId: task.milestoneId,
      milestoneName: task.milestone?.name || null,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee?.name || null,
      isOverdue: isTaskOverdue(task.dueDate, task.status as TaskStatus)
    }))
  }

  private async fetchMilestones(where: Prisma.MilestoneWhereInput): Promise<GanttMilestone[]> {
    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        project: { select: { name: true } },
        tasks: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    return milestones.map(ms => ({
      id: ms.id,
      name: ms.name,
      description: ms.description,
      date: ms.dueDate.toISOString(),
      projectId: ms.projectId,
      projectName: ms.project.name,
      taskCount: ms.tasks.length,
      completedTaskCount: ms.tasks.filter(t => t.status === 'DONE').length
    }))
  }

  private async fetchProjects(where: Prisma.ProjectWhereInput): Promise<GanttProject[]> {
    const projects = await prisma.project.findMany({
      where,
      include: {
        tasks: {
          select: {
            progress: true
          }
        },
        milestones: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return projects.map(project => {
      const avgProgress = project.tasks.length > 0
        ? Math.round(project.tasks.reduce((sum, t) => sum + t.progress, 0) / project.tasks.length)
        : 0

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate?.toISOString() || null,
        endDate: project.endDate?.toISOString() || null,
        taskCount: project.tasks.length,
        milestoneCount: project.milestones.length,
        progress: avgProgress
      }
    })
  }

  private calculateDateRange(
    tasks: GanttTask[],
    milestones: GanttMilestone[]
  ): { start: string; end: string } {
    const today = new Date()
    const msPerDay = 24 * 60 * 60 * 1000

    // Default range: ±35 days from today
    let start = new Date(today.getTime() - 35 * msPerDay)
    let end = new Date(today.getTime() + 35 * msPerDay)

    // Collect all dates
    const dates: Date[] = []

    tasks.forEach(task => {
      if (task.startDate) dates.push(new Date(task.startDate))
      if (task.dueDate) dates.push(new Date(task.dueDate))
    })

    milestones.forEach(ms => {
      dates.push(new Date(ms.date))
    })

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

      // Extend to include data with buffer
      start = new Date(Math.min(start.getTime(), minDate.getTime() - 7 * msPerDay))
      end = new Date(Math.max(end.getTime(), maxDate.getTime() + 7 * msPerDay))
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    }
  }
}

export const ganttService = new GanttService()
export default ganttService
