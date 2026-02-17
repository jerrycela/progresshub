import type { MilestoneData, ActionResult } from 'shared/types'
import { mockMilestones } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiDelete } from './api'
import { mockDelay } from '@/utils/mockDelay'

export interface MilestoneServiceInterface {
  fetchMilestones(): Promise<MilestoneData[]>
  addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>>
  removeMilestone(id: string): Promise<ActionResult<void>>
}

class MockMilestoneService implements MilestoneServiceInterface {
  async fetchMilestones(): Promise<MilestoneData[]> {
    await mockDelay()
    return [...mockMilestones]
  }

  async addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>> {
    await mockDelay()
    return { success: true, data: ms }
  }

  async removeMilestone(): Promise<ActionResult<void>> {
    await mockDelay()
    return { success: true }
  }
}

class ApiMilestoneService implements MilestoneServiceInterface {
  async fetchMilestones(): Promise<MilestoneData[]> {
    return apiGetUnwrap<MilestoneData[]>('/milestones')
  }

  async addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>> {
    const data = await apiPostUnwrap<MilestoneData>('/milestones', ms)
    return { success: true, data }
  }

  async removeMilestone(id: string): Promise<ActionResult<void>> {
    await apiDelete(`/milestones/${id}`)
    return { success: true }
  }
}

export const createMilestoneService = (): MilestoneServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockMilestoneService() : new ApiMilestoneService()
