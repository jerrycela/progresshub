import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardStats, FunctionWorkload, ActionResult } from 'shared/types'
import { mockDashboardStats, mockFunctionWorkloads } from '@/mocks/unified'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats>({ ...mockDashboardStats })
  const functionWorkloads = ref<FunctionWorkload[]>([...mockFunctionWorkloads])

  const fetchStats = async (): Promise<ActionResult<DashboardStats>> => {
    try {
      await new Promise(r => setTimeout(r, 200))
      stats.value = { ...mockDashboardStats }
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
      await new Promise(r => setTimeout(r, 200))
      functionWorkloads.value = [...mockFunctionWorkloads]
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
