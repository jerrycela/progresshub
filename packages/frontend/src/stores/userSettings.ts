import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ActionResult } from 'shared/types'
import { createUserSettingsService, type UserSettings } from '@/services/userSettingsService'

export type { UserSettings }

// ============================================
// UserSettings Store - Service Layer 重構
// 透過 UserSettingsService 抽象層處理設定邏輯
// ============================================

const service = createUserSettingsService()

export const useUserSettingsStore = defineStore('userSettings', () => {
  // State - 初始為空物件，透過 fetchSettings() 載入
  const settings = ref<UserSettings>({} as UserSettings)

  const fetchSettings = async (): Promise<ActionResult<UserSettings>> => {
    try {
      const data = await service.fetchSettings()
      settings.value = data
      return { success: true, data }
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '載入設定失敗',
        },
      }
    }
  }

  const updateSettings = async (
    updates: Partial<UserSettings>,
  ): Promise<ActionResult<UserSettings>> => {
    try {
      const result = await service.updateSettings(updates)
      if (result.success && result.data) {
        settings.value = result.data
      }
      return result
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '更新設定失敗' },
      }
    }
  }

  const linkGitLab = async (gitlabUsername: string): Promise<ActionResult<UserSettings>> => {
    try {
      const result = await service.linkGitLab(gitlabUsername)
      if (result.success && result.data) {
        settings.value = result.data
      }
      return result
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '連結 GitLab 失敗',
        },
      }
    }
  }

  const unlinkGitLab = async (): Promise<ActionResult<UserSettings>> => {
    try {
      const result = await service.unlinkGitLab()
      if (result.success && result.data) {
        settings.value = result.data
      }
      return result
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '解除連結 GitLab 失敗',
        },
      }
    }
  }

  const linkSlack = async (slackUsername: string): Promise<ActionResult<UserSettings>> => {
    try {
      const result = await service.linkSlack(slackUsername)
      if (result.success && result.data) {
        settings.value = result.data
      }
      return result
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '連結 Slack 失敗',
        },
      }
    }
  }

  const unlinkSlack = async (): Promise<ActionResult<UserSettings>> => {
    try {
      const result = await service.unlinkSlack()
      if (result.success && result.data) {
        settings.value = result.data
      }
      return result
    } catch (e) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: e instanceof Error ? e.message : '解除連結 Slack 失敗',
        },
      }
    }
  }

  return {
    settings,
    fetchSettings,
    updateSettings,
    linkGitLab,
    unlinkGitLab,
    linkSlack,
    unlinkSlack,
  }
})
