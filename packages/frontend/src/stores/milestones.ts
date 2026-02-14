import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MilestoneData, ActionResult } from 'shared/types'
import { createMilestoneService } from '@/services/milestoneService'

// ============================================
// Milestones Store - Service Layer 重構
// 透過 MilestoneService 抽象層處理里程碑邏輯
// ============================================

const service = createMilestoneService()

export const useMilestoneStore = defineStore('milestones', () => {
  // State - 初始為空，透過 fetchMilestones() 載入
  const milestones = ref<MilestoneData[]>([])

  const byProject = (projectId: string) =>
    milestones.value
      .filter(ms => ms.projectId === projectId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const allSorted = () =>
    [...milestones.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const fetchMilestones = async (): Promise<ActionResult<MilestoneData[]>> => {
    try {
      const data = await service.fetchMilestones()
      milestones.value = data
      return { success: true, data: milestones.value }
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '載入里程碑失敗',
        },
      }
    }
  }

  const addMilestone = async (ms: MilestoneData): Promise<ActionResult<MilestoneData>> => {
    try {
      const result = await service.addMilestone(ms)
      if (result.success && result.data) {
        milestones.value = [...milestones.value, result.data]
        return { success: true, data: result.data }
      }
      return {
        success: false,
        error: result.error || { code: 'UNKNOWN_ERROR', message: '新增里程碑失敗' },
      }
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '新增里程碑失敗',
        },
      }
    }
  }

  const removeMilestone = async (id: string): Promise<ActionResult<void>> => {
    try {
      const result = await service.removeMilestone(id)
      if (result.success) {
        milestones.value = milestones.value.filter(ms => ms.id !== id)
      }
      return result
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '刪除里程碑失敗',
        },
      }
    }
  }

  return {
    milestones,
    byProject,
    allSorted,
    fetchMilestones,
    addMilestone,
    removeMilestone,
  }
})
