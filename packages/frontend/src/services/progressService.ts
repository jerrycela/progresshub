import type { ProgressLog, ActionResult } from 'shared/types'
import { mockProgressLogs } from '@/mocks/unified'
import api from './api'

export interface ProgressServiceInterface {
  fetchByTaskId(taskId: string): Promise<ProgressLog[]>
  addLog(log: Omit<ProgressLog, 'id' | 'reportedAt'>): Promise<ActionResult<ProgressLog>>
}

class MockProgressService implements ProgressServiceInterface {
  async fetchByTaskId(taskId: string): Promise<ProgressLog[]> {
    await new Promise((r) => setTimeout(r, 200))
    return mockProgressLogs
      .filter((l) => l.taskId === taskId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
  }

  async addLog(log: Omit<ProgressLog, 'id' | 'reportedAt'>): Promise<ActionResult<ProgressLog>> {
    await new Promise((r) => setTimeout(r, 200))
    const newLog: ProgressLog = {
      ...log,
      id: `log-${Date.now()}`,
      reportedAt: new Date().toISOString(),
    }
    return { success: true, data: newLog }
  }
}

class ApiProgressService implements ProgressServiceInterface {
  async fetchByTaskId(taskId: string): Promise<ProgressLog[]> {
    const { data } = await api.get<ProgressLog[]>(`/tasks/${taskId}/progress`)
    return data
  }

  async addLog(log: Omit<ProgressLog, 'id' | 'reportedAt'>): Promise<ActionResult<ProgressLog>> {
    const { data } = await api.post<ProgressLog>(`/tasks/${log.taskId}/progress`, log)
    return { success: true, data }
  }
}

export const createProgressService = (): ProgressServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockProgressService() : new ApiProgressService()
