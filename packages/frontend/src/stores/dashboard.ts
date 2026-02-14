import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardStats, FunctionWorkload, ActionResult } from 'shared/types'
import { createDashboardService } from '@/services/dashboardService'

const service = createDashboardService()

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    unclaimedTasks: 0,
    overdueTasksCount: 0,
  })
  const functionWorkloads = ref<FunctionWorkload[]>([])

  const fetchStats = async (): Promise<ActionResult<DashboardStats>> => {
    try {
      const data = await service.fetchStats()
      stats.value = data
      return { success: true, data: stats.value }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入統計失敗' },
      }
    }
  }

  const fetchWorkloads = async (): Promise<ActionResult<FunctionWorkload[]>> => {
    try {
      const data = await service.fetchWorkloads()
      functionWorkloads.value = data
      return { success: true, data: functionWorkloads.value }
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '載入負載統計失敗',
        },
      }
    }
  }

  return {
    stats,
    functionWorkloads,
    fetchStats,
    fetchWorkloads,
  }
})
