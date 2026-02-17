import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MilestoneData } from 'shared/types'
import { createMilestoneService } from '@/services/milestoneService'
import { storeAction } from '@/utils/storeHelpers'

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

  const fetchMilestones = () =>
    storeAction(async () => {
      milestones.value = await service.fetchMilestones()
      return milestones.value
    }, '載入里程碑失敗')

  const addMilestone = (ms: MilestoneData) =>
    storeAction(async () => {
      const result = await service.addMilestone(ms)
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '新增里程碑失敗')
      }
      milestones.value = [...milestones.value, result.data]
      return result.data
    }, '新增里程碑失敗')

  const removeMilestone = (id: string) =>
    storeAction(async () => {
      await service.removeMilestone(id)
      milestones.value = milestones.value.filter(ms => ms.id !== id)
    }, '刪除里程碑失敗')

  return {
    milestones,
    byProject,
    allSorted,
    fetchMilestones,
    addMilestone,
    removeMilestone,
  }
})
