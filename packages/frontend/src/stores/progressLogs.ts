import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProgressLog, ActionResult } from 'shared/types'
import { mockProgressLogs } from '@/mocks/unified'

export const useProgressLogStore = defineStore('progressLogs', () => {
  const logs = ref<ProgressLog[]>([...mockProgressLogs])

  const byTaskId = (taskId: string) =>
    logs.value
      .filter(l => l.taskId === taskId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())

  const addLog = async (
    log: Omit<ProgressLog, 'id' | 'reportedAt'>,
  ): Promise<ActionResult<ProgressLog>> => {
    try {
      await new Promise(r => setTimeout(r, 200))
      const newLog: ProgressLog = {
        ...log,
        id: `log-${Date.now()}`,
        reportedAt: new Date().toISOString(),
      }
      logs.value = [...logs.value, newLog]
      return { success: true, data: newLog }
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '新增進度記錄失敗',
        },
      }
    }
  }

  return {
    logs,
    byTaskId,
    addLog,
  }
})
