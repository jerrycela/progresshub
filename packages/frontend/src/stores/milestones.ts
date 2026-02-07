import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MilestoneData, ActionResult } from 'shared/types'
import { mockMilestones } from '@/mocks/unified'

export const useMilestoneStore = defineStore('milestones', () => {
  const milestones = ref<MilestoneData[]>([...mockMilestones])

  const byProject = (projectId: string) =>
    milestones.value
      .filter((ms) => ms.projectId === projectId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const allSorted = () =>
    [...milestones.value].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

  const fetchMilestones = async (): Promise<ActionResult<MilestoneData[]>> => {
    try {
      await new Promise((r) => setTimeout(r, 200))
      milestones.value = [...mockMilestones]
      return { success: true, data: milestones.value }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入里程碑失敗' },
      }
    }
  }

  const addMilestone = (ms: MilestoneData) => {
    milestones.value = [...milestones.value, ms]
  }

  const removeMilestone = (id: string) => {
    milestones.value = milestones.value.filter((ms) => ms.id !== id)
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
