import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardStats, FunctionWorkload } from 'shared/types'
import { createDashboardService } from '@/services/dashboardService'
import { storeAction } from '@/utils/storeHelpers'

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

  const loading = ref({
    fetchStats: false,
    fetchWorkloads: false,
  })

  const fetchStats = () =>
    storeAction(
      async () => {
        stats.value = await service.fetchStats()
        return stats.value
      },
      '載入統計失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.fetchStats = isLoading
      },
    )

  const fetchWorkloads = () =>
    storeAction(
      async () => {
        functionWorkloads.value = await service.fetchWorkloads()
        return functionWorkloads.value
      },
      '載入負載統計失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.fetchWorkloads = isLoading
      },
    )

  return {
    stats,
    functionWorkloads,
    loading,
    fetchStats,
    fetchWorkloads,
  }
})
