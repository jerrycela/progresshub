import type { MilestoneData, ActionResult } from 'shared/types'
import { mockMilestones } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap, apiPutUnwrap, apiDelete } from './api'
import { mockDelay } from '@/utils/mockDelay'

export interface MilestoneServiceInterface {
  fetchMilestones(): Promise<MilestoneData[]>
  addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>>
  updateMilestone(id: string, data: Partial<MilestoneData>): Promise<ActionResult<MilestoneData>>
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

  async updateMilestone(
    id: string,
    data: Partial<MilestoneData>,
  ): Promise<ActionResult<MilestoneData>> {
    await mockDelay()
    const existing = mockMilestones.find(ms => ms.id === id)
    if (!existing) return { success: false }
    return { success: true, data: { ...existing, ...data } }
  }

  async removeMilestone(_id: string): Promise<ActionResult<void>> {
    await mockDelay()
    return { success: true }
  }
}

class ApiMilestoneService implements MilestoneServiceInterface {
  async fetchMilestones(): Promise<MilestoneData[]> {
    return apiGetUnwrap<MilestoneData[]>('/milestones')
  }

  async addMilestone(ms: MilestoneData): Promise<ActionResult<MilestoneData>> {
    try {
      const data = await apiPostUnwrap<MilestoneData>('/milestones', ms)
      return { success: true, data }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失敗'
      return { success: false, error: { code: 'MILESTONE_CREATE_FAILED', message } }
    }
  }

  async updateMilestone(
    id: string,
    data: Partial<MilestoneData>,
  ): Promise<ActionResult<MilestoneData>> {
    try {
      const updated = await apiPutUnwrap<MilestoneData>(`/milestones/${id}`, data)
      return { success: true, data: updated }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失敗'
      return { success: false, error: { code: 'MILESTONE_UPDATE_FAILED', message } }
    }
  }

  async removeMilestone(id: string): Promise<ActionResult<void>> {
    try {
      await apiDelete(`/milestones/${id}`)
      return { success: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : '操作失敗'
      return { success: false, error: { code: 'MILESTONE_DELETE_FAILED', message } }
    }
  }
}

export const createMilestoneService = (): MilestoneServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockMilestoneService() : new ApiMilestoneService()
