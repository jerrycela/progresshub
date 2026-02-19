import type { Task, PoolTask, TaskStatus, ActionResult, CreateTaskInput } from 'shared/types'
import { mockTasks, mockPoolTasks } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiPatchUnwrap, apiPutUnwrap, apiDelete } from './api'
import { mockDelay } from '@/utils/mockDelay'

export interface StatusUpdatePayload {
  pauseReason?: string
  pauseNote?: string
  blockerReason?: string
}

export interface TaskServiceInterface {
  fetchTasks(): Promise<Task[]>
  fetchPoolTasks(): Promise<PoolTask[]>
  getTaskById(id: string): Promise<Task | undefined>
  getPoolTaskById(id: string): Promise<PoolTask | undefined>
  createTask(input: CreateTaskInput): Promise<ActionResult<Task>>
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    payload?: StatusUpdatePayload,
  ): Promise<ActionResult<Task>>
  updateTaskProgress(taskId: string, progress: number, notes?: string): Promise<ActionResult<Task>>
  deleteTask(taskId: string): Promise<ActionResult<void>>
  updateTask(taskId: string, input: Partial<Task>): Promise<ActionResult<Task>>
  claimTask(taskId: string, userId: string): Promise<ActionResult<Task>>
  unclaimTask(taskId: string): Promise<ActionResult<Task>>
}

class MockTaskService implements TaskServiceInterface {
  async fetchTasks(): Promise<Task[]> {
    await mockDelay(300)
    return [...mockTasks]
  }

  async fetchPoolTasks(): Promise<PoolTask[]> {
    await mockDelay(300)
    return [...mockPoolTasks]
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return mockTasks.find(t => t.id === id)
  }

  async getPoolTaskById(id: string): Promise<PoolTask | undefined> {
    return mockPoolTasks.find(t => t.id === id)
  }

  async createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
    await mockDelay()

    // 模擬後端邏輯：依 sourceType 決定初始狀態
    let status: TaskStatus = 'UNCLAIMED'
    let assigneeId: string | undefined = undefined
    if (input.sourceType === 'ASSIGNED' && input.assigneeId) {
      status = 'CLAIMED'
      assigneeId = input.assigneeId
    } else if (input.sourceType === 'SELF_CREATED' && input.createdBy) {
      status = 'CLAIMED'
      assigneeId = input.createdBy.id
    }

    const newTask: Task = {
      id: String(Date.now()),
      title: input.title.trim(),
      description: input.description,
      status,
      priority: input.priority || 'MEDIUM',
      progress: 0,
      projectId: input.projectId,
      assigneeId,
      functionTags: input.functionTags || [],
      startDate: input.startDate,
      dueDate: input.dueDate,
      estimatedHours: input.estimatedHours,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return { success: true, data: newTask }
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    _payload?: StatusUpdatePayload,
  ): Promise<ActionResult<Task>> {
    await mockDelay()
    const task = mockTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    const now = new Date().toISOString()
    const updates: Partial<Task> = { status, updatedAt: now }
    if (status === 'DONE') {
      updates.progress = 100
      updates.closedAt = now
    }
    return { success: true, data: { ...task, ...updates } }
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<ActionResult<Task>> {
    await mockDelay()
    const task = mockTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    const now = new Date().toISOString()
    let status = task.status
    if (progress > 0 && task.status === 'CLAIMED') {
      status = 'IN_PROGRESS'
    }
    if (progress >= 100) {
      status = 'DONE'
    }
    return { success: true, data: { ...task, progress, status, updatedAt: now } }
  }

  async claimTask(taskId: string, userId: string): Promise<ActionResult<Task>> {
    await mockDelay()
    const task = mockTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return {
      success: true,
      data: {
        ...task,
        status: 'CLAIMED' as TaskStatus,
        assigneeId: userId,
        updatedAt: new Date().toISOString(),
      },
    }
  }

  async unclaimTask(taskId: string): Promise<ActionResult<Task>> {
    await mockDelay()
    const task = mockTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return {
      success: true,
      data: {
        ...task,
        status: 'UNCLAIMED' as TaskStatus,
        assigneeId: undefined,
        progress: 0,
        updatedAt: new Date().toISOString(),
      },
    }
  }

  async deleteTask(taskId: string): Promise<ActionResult<void>> {
    await mockDelay()
    const task = mockTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return { success: true }
  }

  async updateTask(taskId: string, input: Partial<Task>): Promise<ActionResult<Task>> {
    await mockDelay()
    const task = mockTasks.find(t => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    const now = new Date().toISOString()
    return { success: true, data: { ...task, ...input, updatedAt: now } }
  }
}

class ApiTaskService implements TaskServiceInterface {
  private toPoolTask(task: Task): PoolTask {
    // 推導 sourceType：creatorId === assigneeId 為自建；有 assigneeId 為指派；否則為任務池
    const sourceType: import('shared/types').TaskSourceType =
      task.creatorId && task.assigneeId && task.creatorId === task.assigneeId
        ? 'SELF_CREATED'
        : task.assigneeId
          ? 'ASSIGNED'
          : 'POOL'

    return {
      ...task,
      sourceType,
      createdBy: task.creator
        ? { id: task.creator.id, name: task.creator.name }
        : { id: '', name: '未知' },
      department: undefined,
      canEdit: true,
      // 只有任務建立者或 PM/ADMIN 可刪除；前端 service 無角色資訊，保守設為 false
      canDelete: false,
      collaboratorNames: [],
    }
  }

  async fetchTasks(): Promise<Task[]> {
    return apiGetUnwrap<Task[]>('/tasks')
  }

  async fetchPoolTasks(): Promise<PoolTask[]> {
    const tasks = await apiGetUnwrap<Task[]>('/tasks/pool')
    return tasks.map(t => this.toPoolTask(t))
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return apiGetUnwrap<Task>(`/tasks/${id}`)
  }

  async getPoolTaskById(id: string): Promise<PoolTask | undefined> {
    const task = await apiGetUnwrap<Task>(`/tasks/pool/${id}`)
    return this.toPoolTask(task)
  }

  async createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
    const data = await apiPostUnwrap<Task>('/tasks', input)
    return { success: true, data }
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    payload?: StatusUpdatePayload,
  ): Promise<ActionResult<Task>> {
    const data = await apiPatchUnwrap<Task>(`/tasks/${taskId}/status`, { status, ...payload })
    return { success: true, data }
  }

  async updateTaskProgress(
    taskId: string,
    progress: number,
    notes?: string,
  ): Promise<ActionResult<Task>> {
    const data = await apiPatchUnwrap<Task>(`/tasks/${taskId}/progress`, { progress, notes })
    return { success: true, data }
  }

  async claimTask(taskId: string, userId: string): Promise<ActionResult<Task>> {
    const data = await apiPostUnwrap<Task>(`/tasks/${taskId}/claim`, { userId })
    return { success: true, data }
  }

  async unclaimTask(taskId: string): Promise<ActionResult<Task>> {
    const data = await apiPostUnwrap<Task>(`/tasks/${taskId}/unclaim`)
    return { success: true, data }
  }

  async deleteTask(taskId: string): Promise<ActionResult<void>> {
    await apiDelete(`/tasks/${taskId}`)
    return { success: true }
  }

  async updateTask(taskId: string, input: Partial<Task>): Promise<ActionResult<Task>> {
    // 前端欄位名 → 後端欄位名轉換
    const backendPayload: Record<string, unknown> = {}
    if (input.title !== undefined) backendPayload.name = input.title
    if (input.description !== undefined) backendPayload.description = input.description
    if (input.priority !== undefined) backendPayload.priority = input.priority
    if (input.assigneeId !== undefined) backendPayload.assignedToId = input.assigneeId
    if (input.functionTags !== undefined) backendPayload.functionTags = input.functionTags
    if (input.startDate !== undefined) backendPayload.plannedStartDate = input.startDate
    if (input.dueDate !== undefined) backendPayload.plannedEndDate = input.dueDate
    if (input.estimatedHours !== undefined) backendPayload.estimatedHours = input.estimatedHours
    if (input.progress !== undefined) backendPayload.progressPercentage = input.progress
    if (input.status !== undefined) backendPayload.status = input.status

    const data = await apiPutUnwrap<Task>(`/tasks/${taskId}`, backendPayload)
    return { success: true, data }
  }
}

export const createTaskService = (): TaskServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockTaskService() : new ApiTaskService()
