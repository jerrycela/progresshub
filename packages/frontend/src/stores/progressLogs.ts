import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProgressLog, ActionResult } from 'shared/types'
import { createProgressService } from '@/services/progressService'

const service = createProgressService()

export const useProgressLogStore = defineStore('progressLogs', () => {
  const logs = ref<ProgressLog[]>([])

  const byTaskId = (taskId: string) =>
    logs.value
      .filter(l => l.taskId === taskId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())

  const fetchByTaskId = async (taskId: string): Promise<ActionResult<ProgressLog[]>> => {
    try {
      const data = await service.fetchByTaskId(taskId)
      const existingOtherLogs = logs.value.filter(l => l.taskId !== taskId)
      logs.value = [...existingOtherLogs, ...data]
      return { success: true, data }
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '載入進度記錄失敗',
        },
      }
    }
  }

  const addLog = async (
    log: Omit<ProgressLog, 'id' | 'reportedAt'>,
  ): Promise<ActionResult<ProgressLog>> => {
    try {
      const result = await service.addLog(log)
      if (result.success && result.data) {
        logs.value = [...logs.value, result.data]
      }
      return result
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
    fetchByTaskId,
    addLog,
  }
})
