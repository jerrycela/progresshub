import type { ProgressLog, ActionResult } from 'shared/types'
import { mockProgressLogs } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap } from './api'
import { mockDelay } from '@/utils/mockDelay'

export interface ProgressServiceInterface {
  fetchByTaskId(taskId: string): Promise<ProgressLog[]>
  addLog(log: Omit<ProgressLog, 'id' | 'reportedAt'>): Promise<ActionResult<ProgressLog>>
}

class MockProgressService implements ProgressServiceInterface {
  async fetchByTaskId(taskId: string): Promise<ProgressLog[]> {
    await mockDelay()
    return mockProgressLogs
      .filter(l => l.taskId === taskId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
  }

  async addLog(log: Omit<ProgressLog, 'id' | 'reportedAt'>): Promise<ActionResult<ProgressLog>> {
    await mockDelay()
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
    return apiGetUnwrap<ProgressLog[]>(`/tasks/${taskId}/progress`)
  }

  async addLog(log: Omit<ProgressLog, 'id' | 'reportedAt'>): Promise<ActionResult<ProgressLog>> {
    const data = await apiPostUnwrap<ProgressLog>(`/tasks/${log.taskId}/progress`, log)
    return { success: true, data }
  }
}

export const createProgressService = (): ProgressServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockProgressService() : new ApiProgressService()
