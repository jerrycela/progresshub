import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createUserSettingsService, type UserSettings } from '@/services/userSettingsService'
import { storeAction } from '@/utils/storeHelpers'

export type { UserSettings }

// ============================================
// UserSettings Store - Service Layer 重構
// 透過 UserSettingsService 抽象層處理設定邏輯
// ============================================

const service = createUserSettingsService()

export const useUserSettingsStore = defineStore('userSettings', () => {
  // State - 初始為空物件，透過 fetchSettings() 載入
  const settings = ref<UserSettings>({} as UserSettings)

  const loading = ref({
    fetch: false,
    update: false,
    linkGitLab: false,
    unlinkGitLab: false,
    linkSlack: false,
    unlinkSlack: false,
  })

  const fetchSettings = () =>
    storeAction(
      async () => {
        settings.value = await service.fetchSettings()
        return settings.value
      },
      '載入設定失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.fetch = isLoading
      },
    )

  const updateSettings = (updates: Partial<UserSettings>) =>
    storeAction(
      async () => {
        const result = await service.updateSettings(updates)
        if (result.success && result.data) {
          settings.value = result.data
        }
        return settings.value
      },
      '更新設定失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.update = isLoading
      },
    )

  const linkGitLab = (gitlabUsername: string) =>
    storeAction(
      async () => {
        const result = await service.linkGitLab(gitlabUsername)
        if (result.success && result.data) {
          settings.value = result.data
        }
        return settings.value
      },
      '連結 GitLab 失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.linkGitLab = isLoading
      },
    )

  const unlinkGitLab = () =>
    storeAction(
      async () => {
        const result = await service.unlinkGitLab()
        if (result.success && result.data) {
          settings.value = result.data
        }
        return settings.value
      },
      '解除連結 GitLab 失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.unlinkGitLab = isLoading
      },
    )

  const linkSlack = (slackUsername: string) =>
    storeAction(
      async () => {
        const result = await service.linkSlack(slackUsername)
        if (result.success && result.data) {
          settings.value = result.data
        }
        return settings.value
      },
      '連結 Slack 失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.linkSlack = isLoading
      },
    )

  const unlinkSlack = () =>
    storeAction(
      async () => {
        const result = await service.unlinkSlack()
        if (result.success && result.data) {
          settings.value = result.data
        }
        return settings.value
      },
      '解除連結 Slack 失敗',
      'UNKNOWN_ERROR',
      isLoading => {
        loading.value.unlinkSlack = isLoading
      },
    )

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    linkGitLab,
    unlinkGitLab,
    linkSlack,
    unlinkSlack,
  }
})
