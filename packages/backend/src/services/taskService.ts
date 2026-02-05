import { Task, Prisma, TaskStatus as PrismaTaskStatus } from '@prisma/client'
import prisma from '../lib/prisma'
import {
  TaskStatus,
  TaskAction,
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryParams,
  canTransition,
  getNextStatus
} from '../types/task'
import { AppError } from '../utils/AppError'

// ============================================
// Task Service
// ============================================

export class TaskService {
  // Create a new task
  async createTask(data: CreateTaskDto, createdById: string): Promise<Task> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        estimatedHours: data.estimatedHours,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: data.projectId,
        milestoneId: data.milestoneId,
        assigneeId: data.assigneeId,
        createdById,
        status: data.assigneeId ? 'CLAIMED' : 'UNCLAIMED'
      }
    })
  }

  // Get task by ID
  async getTaskById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        milestone: true,
        assignee: true,
        createdBy: true
      }
    })
  }

  // Update task
  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    return prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        estimatedHours: data.estimatedHours,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        milestoneId: data.milestoneId,
        assigneeId: data.assigneeId,
        progress: data.progress
      }
    })
  }

  // Delete task
  async deleteTask(id: string): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    await prisma.task.delete({ where: { id } })
  }

  // Get tasks with filtering and pagination
  async getTasks(params: TaskQueryParams): Promise<{ tasks: Task[]; total: number }> {
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit

    const where: Prisma.TaskWhereInput = {}

    if (params.projectId) where.projectId = params.projectId
    if (params.milestoneId) where.milestoneId = params.milestoneId
    if (params.assigneeId) where.assigneeId = params.assigneeId
    if (params.status) where.status = params.status as PrismaTaskStatus
    if (params.priority) where.priority = params.priority

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: true,
          milestone: true,
          assignee: true
        }
      }),
      prisma.task.count({ where })
    ])

    return { tasks, total }
  }

  // Get tasks by assignee (my tasks)
  async getTasksByAssignee(
    assigneeId: string,
    status?: TaskStatus
  ): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = { assigneeId }

    if (status) {
      where.status = status as PrismaTaskStatus
    }

    return prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: {
        project: true,
        milestone: true
      }
    })
  }

  // Change task status
  async changeTaskStatus(
    taskId: string,
    action: TaskAction,
    userId: string
  ): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    const currentStatus = task.status as TaskStatus

    if (!canTransition(currentStatus, action)) {
      throw new AppError(
        'VALIDATION_FAILED',
        `無法從 ${currentStatus} 狀態執行 ${action} 動作`,
        400
      )
    }

    const nextStatus = getNextStatus(currentStatus, action)

    if (!nextStatus) {
      throw new AppError('VALIDATION_FAILED', '狀態轉換失敗', 400)
    }

    const updateData: Prisma.TaskUpdateInput = {
      status: nextStatus as PrismaTaskStatus
    }

    // Set assignee when claiming
    if (action === 'claim') {
      updateData.assignee = { connect: { id: userId } }
    }

    // Clear assignee when unclaiming
    if (action === 'unclaim') {
      updateData.assignee = { disconnect: true }
    }

    // Set startedAt when starting
    if (action === 'start') {
      updateData.startedAt = new Date()
    }

    // Set completedAt and progress when completing
    if (action === 'complete') {
      updateData.completedAt = new Date()
      updateData.progress = 100
    }

    return prisma.task.update({
      where: { id: taskId },
      data: updateData
    })
  }

  // Claim task
  async claimTask(taskId: string, userId: string): Promise<Task> {
    return this.changeTaskStatus(taskId, 'claim', userId)
  }

  // Unclaim task
  async unclaimTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    // Only the assignee can unclaim
    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以取消認領', 403)
    }

    return this.changeTaskStatus(taskId, 'unclaim', userId)
  }

  // Start task
  async startTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    // Only the assignee can start
    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以開始任務', 403)
    }

    return this.changeTaskStatus(taskId, 'start', userId)
  }

  // Pause task
  async pauseTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以暫停任務', 403)
    }

    return this.changeTaskStatus(taskId, 'pause', userId)
  }

  // Resume task
  async resumeTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以恢復任務', 403)
    }

    return this.changeTaskStatus(taskId, 'resume', userId)
  }

  // Block task
  async blockTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以標記卡關', 403)
    }

    return this.changeTaskStatus(taskId, 'block', userId)
  }

  // Unblock task
  async unblockTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以解除卡關', 403)
    }

    return this.changeTaskStatus(taskId, 'unblock', userId)
  }

  // Complete task
  async completeTask(taskId: string, userId: string): Promise<Task> {
    const task = await prisma.task.findUnique({ where: { id: taskId } })

    if (!task) {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到指定的任務', 404)
    }

    if (task.assigneeId !== userId) {
      throw new AppError('PERM_DENIED', '只有被指派者可以完成任務', 403)
    }

    return this.changeTaskStatus(taskId, 'complete', userId)
  }
}

export const taskService = new TaskService()
export default taskService
