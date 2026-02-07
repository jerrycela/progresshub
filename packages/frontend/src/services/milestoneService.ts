import type { MilestoneData, ActionResult } from 'shared/types'
import { mockMilestones } from '@/mocks/unified'
import api from './api'

export interface MilestoneServiceInterface {
  fetchMilestones(): Promise<MilestoneData[]>
  addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>>
  removeMilestone(id: string): Promise<ActionResult<void>>
}

class MockMilestoneService implements MilestoneServiceInterface {
  async fetchMilestones(): Promise<MilestoneData[]> {
    await new Promise(r => setTimeout(r, 200))
    return [...mockMilestones]
  }

  async addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>> {
    await new Promise(r => setTimeout(r, 200))
    return { success: true, data: ms }
  }

  async removeMilestone(): Promise<ActionResult<void>> {
    await new Promise(r => setTimeout(r, 200))
    return { success: true }
  }
}

class ApiMilestoneService implements MilestoneServiceInterface {
  async fetchMilestones(): Promise<MilestoneData[]> {
    const { data } = await api.get<MilestoneData[]>('/milestones')
    return data
  }

  async addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>> {
    const { data } = await api.post<MilestoneData>('/milestones', ms)
    return { success: true, data }
  }

  async removeMilestone(id: string): Promise<ActionResult<void>> {
    await api.delete(`/milestones/${id}`)
    return { success: true }
  }
}

export const createMilestoneService = (): MilestoneServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockMilestoneService() : new ApiMilestoneService()
