import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import {
  CreateProgressLogDto,
  ProgressLogResponse,
  ProgressQueryParams,
  TaskProgressSummary,
  EmployeeProgressSummary,
  validateProgress,
  validateHours
} from '../types/progress'
import { AppError } from '../utils/AppError'

// ============================================
// Progress Service
// ============================================

export class ProgressService {
  // Create a progress log
  async createProgressLog(
    data: CreateProgressLogDto,
    employeeId: string
  ): Promise<ProgressLogResponse> {
    // Validate progress
    if (!validateProgress(data.progress)) {
      throw new AppError('VALIDATION_FAILED', '進度必須是 0-100 之間的整數', 400)
    }

    // Validate hours
    if (!validateHours(data.hoursSpent)) {
      throw new AppError('VALIDATION_FAILED', '工時不能為負數', 400)
    }

    // Validate content
    if (!data.content || !data.content.trim()) {
      throw new AppError('VALIDATION_REQUIRED', '進度說明為必填', 400)
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: {
        project: { select: { id: true, name: true } }
      }
    })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    // Check if user is the assignee
    if (task.assigneeId !== employeeId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以回報進度', 403)
    }

    // Create progress log and update task progress in a transaction
    const [progressLog] = await prisma.$transaction([
      prisma.progressLog.create({
        data: {
          content: data.content.trim(),
          progress: data.progress,
          hoursSpent: data.hoursSpent,
          taskId: data.taskId,
          employeeId
        },
        include: {
          task: {
            select: {
              title: true,
              projectId: true,
              project: { select: { name: true } }
            }
          },
          employee: { select: { name: true } }
        }
      }),
      prisma.task.update({
        where: { id: data.taskId },
        data: {
          progress: data.progress,
          actualHours: {
            increment: data.hoursSpent || 0
          }
        }
      })
    ])

    return this.mapToResponse(progressLog)
  }

  // Get progress logs by employee
  async getProgressLogsByEmployee(
    employeeId: string,
    params: ProgressQueryParams
  ): Promise<{ logs: ProgressLogResponse[]; total: number }> {
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit

    const where: Prisma.ProgressLogWhereInput = { employeeId }

    if (params.taskId) where.taskId = params.taskId

    if (params.startDate || params.endDate) {
      where.createdAt = {
        ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
        ...(params.endDate ? { lte: new Date(params.endDate) } : {})
      }
    }

    const [logs, total] = await Promise.all([
      prisma.progressLog.findMany({
        where,
        include: {
          task: {
            select: {
              title: true,
              projectId: true,
              project: { select: { name: true } }
            }
          },
          employee: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.progressLog.count({ where })
    ])

    return {
      logs: logs.map(log => this.mapToResponse(log)),
      total
    }
  }

  // Get progress logs by task
  async getProgressLogsByTask(taskId: string): Promise<ProgressLogResponse[]> {
    // Check if task exists
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    const logs = await prisma.progressLog.findMany({
      where: { taskId },
      include: {
        task: {
          select: {
            title: true,
            projectId: true,
            project: { select: { name: true } }
          }
        },
        employee: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return logs.map(log => this.mapToResponse(log))
  }

  // Get task progress summary
  async getTaskProgressSummary(taskId: string): Promise<TaskProgressSummary> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        progress: true
      }
    })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    const logs = await prisma.progressLog.findMany({
      where: { taskId },
      select: {
        hoursSpent: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const totalHoursSpent = logs.reduce((sum, log) => sum + (log.hoursSpent || 0), 0)

    return {
      taskId: task.id,
      taskTitle: task.title,
      currentProgress: task.progress,
      totalHoursSpent,
      logCount: logs.length,
      lastUpdate: logs.length > 0 ? logs[0].createdAt.toISOString() : null
    }
  }

  // Get employee progress summary
  async getEmployeeProgressSummary(employeeId: string): Promise<EmployeeProgressSummary> {
    const logs = await prisma.progressLog.findMany({
      where: { employeeId },
      include: {
        task: {
          select: {
            title: true,
            projectId: true,
            project: { select: { name: true } }
          }
        },
        employee: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const totalHoursSpent = logs.reduce((sum, log) => sum + (log.hoursSpent || 0), 0)
    const uniqueTasks = new Set(logs.map(log => log.taskId))
    const averageProgress = logs.length > 0
      ? Math.round(logs.reduce((sum, log) => sum + log.progress, 0) / logs.length)
      : 0

    return {
      totalLogs: logs.length,
      totalHoursSpent,
      tasksWorkedOn: uniqueTasks.size,
      averageProgress,
      recentLogs: logs.slice(0, 5).map(log => this.mapToResponse(log))
    }
  }

  // Helper to map database result to response
  private mapToResponse(log: any): ProgressLogResponse {
    return {
      id: log.id,
      content: log.content,
      progress: log.progress,
      hoursSpent: log.hoursSpent,
      taskId: log.taskId,
      taskTitle: log.task.title,
      projectId: log.task.projectId,
      projectName: log.task.project.name,
      employeeId: log.employeeId,
      employeeName: log.employee.name,
      createdAt: log.createdAt.toISOString()
    }
  }
}

export const progressService = new ProgressService()
export default progressService
