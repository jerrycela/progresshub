import type { Task, PoolTask, TaskStatus, ActionResult, CreateTaskInput } from 'shared/types'
import { mockTasks, mockPoolTasks } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiPatchUnwrap } from './api'

export interface TaskServiceInterface {
  fetchTasks(): Promise<Task[]>
  fetchPoolTasks(): Promise<PoolTask[]>
  getTaskById(id: string): Promise<Task | undefined>
  getPoolTaskById(id: string): Promise<PoolTask | undefined>
  createTask(input: CreateTaskInput): Promise<ActionResult<Task>>
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult<Task>>
  updateTaskProgress(taskId: string, progress: number, notes?: string): Promise<ActionResult<Task>>
  claimTask(taskId: string, userId: string): Promise<ActionResult<Task>>
  unclaimTask(taskId: string): Promise<ActionResult<Task>>
}

class MockTaskService implements TaskServiceInterface {
  async fetchTasks(): Promise<Task[]> {
    await new Promise(r => setTimeout(r, 300))
    return [...mockTasks]
  }

  async fetchPoolTasks(): Promise<PoolTask[]> {
    await new Promise(r => setTimeout(r, 300))
    return [...mockPoolTasks]
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return mockTasks.find(t => t.id === id)
  }

  async getPoolTaskById(id: string): Promise<PoolTask | undefined> {
    return mockPoolTasks.find(t => t.id === id)
  }

  async createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
    await new Promise(r => setTimeout(r, 200))
    const newTask: Task = {
      id: String(Date.now()),
      title: input.title.trim(),
      description: input.description,
      status: 'UNCLAIMED',
      priority: input.priority || 'MEDIUM',
      progress: 0,
      projectId: input.projectId,
      functionTags: input.functionTags || [],
      startDate: input.startDate,
      dueDate: input.dueDate,
      estimatedHours: input.estimatedHours,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return { success: true, data: newTask }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult<Task>> {
    await new Promise(r => setTimeout(r, 200))
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
    await new Promise(r => setTimeout(r, 200))
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
    await new Promise(r => setTimeout(r, 200))
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
    await new Promise(r => setTimeout(r, 200))
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
}

class ApiTaskService implements TaskServiceInterface {
  async fetchTasks(): Promise<Task[]> {
    return apiGetUnwrap<Task[]>('/tasks')
  }

  async fetchPoolTasks(): Promise<PoolTask[]> {
    return apiGetUnwrap<PoolTask[]>('/tasks/pool')
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return apiGetUnwrap<Task>(`/tasks/${id}`)
  }

  async getPoolTaskById(id: string): Promise<PoolTask | undefined> {
    return apiGetUnwrap<PoolTask>(`/tasks/pool/${id}`)
  }

  async createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
    const data = await apiPostUnwrap<Task>('/tasks', input)
    return { success: true, data }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult<Task>> {
    const data = await apiPatchUnwrap<Task>(`/tasks/${taskId}/status`, { status })
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
}

export const createTaskService = (): TaskServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockTaskService() : new ApiTaskService()
