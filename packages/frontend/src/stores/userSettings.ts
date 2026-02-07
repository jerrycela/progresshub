import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ActionResult } from 'shared/types'
import { mockCurrentUserSettings, type UserSettings } from '@/mocks/userSettings'

export type { UserSettings }

export const useUserSettingsStore = defineStore('userSettings', () => {
  const settings = ref<UserSettings>({ ...mockCurrentUserSettings })

  const updateSettings = async (updates: Partial<UserSettings>): Promise<ActionResult<UserSettings>> => {
    try {
      await new Promise((r) => setTimeout(r, 500))
      const updated: UserSettings = { ...settings.value, ...updates }
      settings.value = updated
      // 同步更新 mock 源資料
      Object.assign(mockCurrentUserSettings, updates)
      return { success: true, data: updated }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '更新設定失敗' },
      }
    }
  }

  const linkGitLab = (gitlabUsername: string): UserSettings => {
    settings.value = {
      ...settings.value,
      gitlabId: `GL${Date.now()}`,
      gitlabUsername,
    }
    Object.assign(mockCurrentUserSettings, {
      gitlabId: settings.value.gitlabId,
      gitlabUsername: settings.value.gitlabUsername,
    })
    return { ...settings.value }
  }

  const unlinkGitLab = (): UserSettings => {
    settings.value = {
      ...settings.value,
      gitlabId: undefined,
      gitlabUsername: undefined,
    }
    mockCurrentUserSettings.gitlabId = undefined
    mockCurrentUserSettings.gitlabUsername = undefined
    return { ...settings.value }
  }

  const linkSlack = (slackUsername: string): UserSettings => {
    settings.value = {
      ...settings.value,
      slackId: `U${Date.now()}`,
      slackUsername,
    }
    Object.assign(mockCurrentUserSettings, {
      slackId: settings.value.slackId,
      slackUsername: settings.value.slackUsername,
    })
    return { ...settings.value }
  }

  const unlinkSlack = (): UserSettings => {
    settings.value = {
      ...settings.value,
      slackId: undefined,
      slackUsername: undefined,
    }
    mockCurrentUserSettings.slackId = undefined
    mockCurrentUserSettings.slackUsername = undefined
    return { ...settings.value }
  }

  return {
    settings,
    updateSettings,
    linkGitLab,
    unlinkGitLab,
    linkSlack,
    unlinkSlack,
  }
})
