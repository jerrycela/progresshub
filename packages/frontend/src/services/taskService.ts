import type { Task, PoolTask, TaskStatus, ActionResult, CreateTaskInput } from 'shared/types'
import { mockTasks, mockPoolTasks } from '@/mocks/unified'
import api from './api'

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
    await new Promise((r) => setTimeout(r, 300))
    return [...mockTasks]
  }

  async fetchPoolTasks(): Promise<PoolTask[]> {
    await new Promise((r) => setTimeout(r, 300))
    return [...mockPoolTasks]
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    return mockTasks.find((t) => t.id === id)
  }

  async getPoolTaskById(id: string): Promise<PoolTask | undefined> {
    return mockPoolTasks.find((t) => t.id === id)
  }

  async createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
    await new Promise((r) => setTimeout(r, 200))
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
    await new Promise((r) => setTimeout(r, 200))
    const task = mockTasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return { success: true, data: { ...task, status, updatedAt: new Date().toISOString() } }
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<ActionResult<Task>> {
    await new Promise((r) => setTimeout(r, 200))
    const task = mockTasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return { success: true, data: { ...task, progress, updatedAt: new Date().toISOString() } }
  }

  async claimTask(taskId: string, userId: string): Promise<ActionResult<Task>> {
    await new Promise((r) => setTimeout(r, 200))
    const task = mockTasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return { success: true, data: { ...task, status: 'CLAIMED' as TaskStatus, assigneeId: userId, updatedAt: new Date().toISOString() } }
  }

  async unclaimTask(taskId: string): Promise<ActionResult<Task>> {
    await new Promise((r) => setTimeout(r, 200))
    const task = mockTasks.find((t) => t.id === taskId)
    if (!task) {
      return { success: false, error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' } }
    }
    return { success: true, data: { ...task, status: 'UNCLAIMED' as TaskStatus, assigneeId: undefined, progress: 0, updatedAt: new Date().toISOString() } }
  }
}

class ApiTaskService implements TaskServiceInterface {
  async fetchTasks(): Promise<Task[]> {
    const { data } = await api.get<Task[]>('/tasks')
    return data
  }

  async fetchPoolTasks(): Promise<PoolTask[]> {
    const { data } = await api.get<PoolTask[]>('/tasks/pool')
    return data
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const { data } = await api.get<Task>(`/tasks/${id}`)
    return data
  }

  async getPoolTaskById(id: string): Promise<PoolTask | undefined> {
    const { data } = await api.get<PoolTask>(`/tasks/pool/${id}`)
    return data
  }

  async createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
    const { data } = await api.post<Task>('/tasks', input)
    return { success: true, data }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult<Task>> {
    const { data } = await api.patch<Task>(`/tasks/${taskId}/status`, { status })
    return { success: true, data }
  }

  async updateTaskProgress(taskId: string, progress: number, notes?: string): Promise<ActionResult<Task>> {
    const { data } = await api.patch<Task>(`/tasks/${taskId}/progress`, { progress, notes })
    return { success: true, data }
  }

  async claimTask(taskId: string, userId: string): Promise<ActionResult<Task>> {
    const { data } = await api.post<Task>(`/tasks/${taskId}/claim`, { userId })
    return { success: true, data }
  }

  async unclaimTask(taskId: string): Promise<ActionResult<Task>> {
    const { data } = await api.post<Task>(`/tasks/${taskId}/unclaim`)
    return { success: true, data }
  }
}

export const createTaskService = (): TaskServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockTaskService() : new ApiTaskService()
