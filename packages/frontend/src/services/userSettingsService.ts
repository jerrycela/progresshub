import type { ActionResult } from 'shared/types'
import { mockCurrentUserSettings, type UserSettings } from '@/mocks/userSettings'
import { apiGetUnwrap, apiPostUnwrap, apiPatchUnwrap, apiDeleteUnwrap } from './api'
import { mockDelay } from '@/utils/mockDelay'

export type { UserSettings }

export interface UserSettingsServiceInterface {
  fetchSettings(): Promise<UserSettings>
  updateSettings(updates: Partial<UserSettings>): Promise<ActionResult<UserSettings>>
  linkGitLab(username: string): Promise<ActionResult<UserSettings>>
  unlinkGitLab(): Promise<ActionResult<UserSettings>>
  linkSlack(username: string): Promise<ActionResult<UserSettings>>
  unlinkSlack(): Promise<ActionResult<UserSettings>>
}

class MockUserSettingsService implements UserSettingsServiceInterface {
  async fetchSettings(): Promise<UserSettings> {
    await mockDelay()
    return { ...mockCurrentUserSettings }
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<ActionResult<UserSettings>> {
    await mockDelay(500)
    Object.assign(mockCurrentUserSettings, updates)
    return { success: true, data: { ...mockCurrentUserSettings } }
  }

  async linkGitLab(username: string): Promise<ActionResult<UserSettings>> {
    await mockDelay()
    mockCurrentUserSettings.gitlabId = `GL${Date.now()}`
    mockCurrentUserSettings.gitlabUsername = username
    return { success: true, data: { ...mockCurrentUserSettings } }
  }

  async unlinkGitLab(): Promise<ActionResult<UserSettings>> {
    await mockDelay()
    mockCurrentUserSettings.gitlabId = undefined
    mockCurrentUserSettings.gitlabUsername = undefined
    return { success: true, data: { ...mockCurrentUserSettings } }
  }

  async linkSlack(username: string): Promise<ActionResult<UserSettings>> {
    await mockDelay()
    mockCurrentUserSettings.slackId = `U${Date.now()}`
    mockCurrentUserSettings.slackUsername = username
    return { success: true, data: { ...mockCurrentUserSettings } }
  }

  async unlinkSlack(): Promise<ActionResult<UserSettings>> {
    await mockDelay()
    mockCurrentUserSettings.slackId = undefined
    mockCurrentUserSettings.slackUsername = undefined
    return { success: true, data: { ...mockCurrentUserSettings } }
  }
}

class ApiUserSettingsService implements UserSettingsServiceInterface {
  async fetchSettings(): Promise<UserSettings> {
    return apiGetUnwrap<UserSettings>('/user/settings')
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<ActionResult<UserSettings>> {
    const payload: Record<string, unknown> = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.email !== undefined) payload.email = updates.email
    if (updates.avatar !== undefined) payload.avatar = updates.avatar
    const data = await apiPatchUnwrap<UserSettings>('/user/settings', payload)
    return { success: true, data }
  }

  async linkGitLab(username: string): Promise<ActionResult<UserSettings>> {
    const data = await apiPostUnwrap<UserSettings>('/user/integrations/gitlab', { username })
    return { success: true, data }
  }

  async unlinkGitLab(): Promise<ActionResult<UserSettings>> {
    const data = await apiDeleteUnwrap<UserSettings>('/user/integrations/gitlab')
    return { success: true, data }
  }

  async linkSlack(username: string): Promise<ActionResult<UserSettings>> {
    const data = await apiPostUnwrap<UserSettings>('/user/integrations/slack', { username })
    return { success: true, data }
  }

  async unlinkSlack(): Promise<ActionResult<UserSettings>> {
    const data = await apiDeleteUnwrap<UserSettings>('/user/integrations/slack')
    return { success: true, data }
  }
}

export const createUserSettingsService = (): UserSettingsServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true'
    ? new MockUserSettingsService()
    : new ApiUserSettingsService()
