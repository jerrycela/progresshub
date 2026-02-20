import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProgressLog } from 'shared/types'
import { createProgressService } from '@/services/progressService'
import { storeAction } from '@/utils/storeHelpers'

const service = createProgressService()

export const useProgressLogStore = defineStore('progressLogs', () => {
  const logs = ref<ProgressLog[]>([])

  const loading = ref({
    fetch: false,
    add: false,
  })

  const byTaskId = (taskId: string) =>
    logs.value
      .filter(l => l.taskId === taskId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())

  const fetchByTaskId = (taskId: string) =>
    storeAction(
      async () => {
        const data = await service.fetchByTaskId(taskId)
        const existingOtherLogs = logs.value.filter(l => l.taskId !== taskId)
        logs.value = [...existingOtherLogs, ...data]
        return data
      },
      '載入進度記錄失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.fetch = isLoading
      },
    )

  const addLog = (log: Omit<ProgressLog, 'id' | 'reportedAt'>) =>
    storeAction(
      async () => {
        const result = await service.addLog(log)
        if (!result.success || !result.data) {
          throw new Error(result.error?.message || '新增進度記錄失敗')
        }
        logs.value = [...logs.value, result.data]
        return result.data
      },
      '新增進度記錄失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.add = isLoading
      },
    )

  return {
    logs,
    loading,
    byTaskId,
    fetchByTaskId,
    addLog,
  }
})
