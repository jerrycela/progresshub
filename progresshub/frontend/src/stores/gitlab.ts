/**
 * GitLab 整合 Pinia Store
 * 管理 GitLab 連結狀態、同步操作、活動列表
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gitlabApi } from '@/api'
import type { GitLabActivity, GitLabSyncResult } from '@/types'

// Mock 資料：用於 Zeabur 預覽環境（無法連接內網 GitLab）
const MOCK_MODE = import.meta.env.VITE_GITLAB_MOCK_MODE === 'true'

const MOCK_ACTIVITIES: GitLabActivity[] = [
  {
    id: 'mock-1',
    employeeId: 'mock-user',
    type: 'COMMIT',
    gitlabId: 'abc123def456',
    title: 'fix: 修復登入驗證問題',
    description: '修復了當使用者重複登入時可能導致的 session 衝突問題',
    url: 'https://gitlab.example.com/project/commit/abc123def456',
    projectId: 1,
    projectName: '新手教學系統',
    projectUrl: 'https://gitlab.example.com/project',
    gitlabCreatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    syncedAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    employeeId: 'mock-user',
    type: 'ISSUE',
    gitlabId: '123',
    title: '#123 實作回報功能',
    description: '需要實作進度回報的自動同步功能',
    url: 'https://gitlab.example.com/project/issues/123',
    projectId: 2,
    projectName: 'PVP 對戰系統',
    projectUrl: 'https://gitlab.example.com/project2',
    state: 'opened',
    gitlabCreatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    syncedAt: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    employeeId: 'mock-user',
    type: 'COMMIT',
    gitlabId: 'xyz789',
    title: 'feat: 新增進度條元件',
    description: '新增可複用的進度條 Vue 元件',
    url: 'https://gitlab.example.com/ui/commit/xyz789',
    projectId: 3,
    projectName: 'UI 元件庫',
    projectUrl: 'https://gitlab.example.com/ui',
    gitlabCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    syncedAt: new Date().toISOString(),
  },
]

export const useGitLabStore = defineStore('gitlab', () => {
  // 狀態
  const connected = ref(false)
  const gitlabId = ref<number | null>(null)
  const gitlabUsername = ref<string | null>(null)
  const connectedAt = ref<string | null>(null)
  const lastSyncAt = ref<string | null>(null)
  const activitiesCount = ref(0)

  const activities = ref<GitLabActivity[]>([])
  const totalActivities = ref(0)

  const loading = ref(false)
  const syncing = ref(false)
  const syncResult = ref<GitLabSyncResult | null>(null)

  const configured = ref(false)
  const gitlabUrl = ref<string | null>(null)

  // 計算屬性
  const isConnected = computed(() => connected.value)
  const hasActivities = computed(() => activities.value.length > 0)

  const commitActivities = computed(() =>
    activities.value.filter(a => a.type === 'COMMIT')
  )

  const issueActivities = computed(() =>
    activities.value.filter(a => a.type === 'ISSUE')
  )

  /**
   * 載入 GitLab 配置狀態
   */
  async function loadConfig() {
    if (MOCK_MODE) {
      configured.value = true
      gitlabUrl.value = 'https://gitlab.example.com'
      return
    }

    try {
      const response = await gitlabApi.getConfig()
      configured.value = response.data.configured
      gitlabUrl.value = response.data.gitlabUrl
    } catch (error) {
      console.error('Failed to load GitLab config:', error)
    }
  }

  /**
   * 載入連結狀態
   */
  async function loadStatus() {
    if (MOCK_MODE) {
      // Mock 模式：模擬已連結狀態
      connected.value = true
      gitlabId.value = 12345
      gitlabUsername.value = 'xiaoming'
      connectedAt.value = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      lastSyncAt.value = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      activitiesCount.value = MOCK_ACTIVITIES.length
      return
    }

    loading.value = true
    try {
      const response = await gitlabApi.getStatus()
      connected.value = response.data.connected
      if (response.data.connected) {
        gitlabId.value = response.data.gitlabId
        gitlabUsername.value = response.data.gitlabUsername
        connectedAt.value = response.data.connectedAt
        lastSyncAt.value = response.data.lastSyncAt
        activitiesCount.value = response.data.activitiesCount
      }
    } catch (error) {
      console.error('Failed to load GitLab status:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 開始 OAuth 授權流程
   */
  async function startAuth() {
    if (MOCK_MODE) {
      // Mock 模式：直接設為已連結
      connected.value = true
      gitlabId.value = 12345
      gitlabUsername.value = 'xiaoming'
      connectedAt.value = new Date().toISOString()
      return
    }

    try {
      const response = await gitlabApi.getAuthUrl()
      // 跳轉到 GitLab 授權頁面
      window.location.href = response.data.authUrl
    } catch (error) {
      console.error('Failed to start GitLab auth:', error)
      throw error
    }
  }

  /**
   * 取消連結
   */
  async function disconnect() {
    if (MOCK_MODE) {
      resetState()
      return
    }

    loading.value = true
    try {
      await gitlabApi.disconnect()
      resetState()
    } catch (error) {
      console.error('Failed to disconnect GitLab:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置狀態
   */
  function resetState() {
    connected.value = false
    gitlabId.value = null
    gitlabUsername.value = null
    connectedAt.value = null
    lastSyncAt.value = null
    activitiesCount.value = 0
    activities.value = []
    totalActivities.value = 0
    syncResult.value = null
  }

  /**
   * 手動同步
   */
  async function sync(days: number = 7) {
    if (MOCK_MODE) {
      // Mock 模式：模擬同步
      syncing.value = true
      await new Promise(resolve => setTimeout(resolve, 1500))
      syncResult.value = {
        success: true,
        commitsCount: 5,
        issuesCount: 2,
        message: '同步完成：5 筆 commits, 2 筆 issues',
      }
      lastSyncAt.value = new Date().toISOString()
      activities.value = MOCK_ACTIVITIES
      totalActivities.value = MOCK_ACTIVITIES.length
      activitiesCount.value = MOCK_ACTIVITIES.length
      syncing.value = false
      return syncResult.value
    }

    syncing.value = true
    syncResult.value = null
    try {
      const response = await gitlabApi.sync(days)
      syncResult.value = {
        success: response.data.success,
        commitsCount: response.data.commitsCount,
        issuesCount: response.data.issuesCount,
        message: response.data.message,
      }

      // 重新載入活動和狀態
      await Promise.all([loadStatus(), loadActivities()])

      return syncResult.value
    } catch (error) {
      console.error('Failed to sync GitLab:', error)
      syncResult.value = {
        success: false,
        commitsCount: 0,
        issuesCount: 0,
        message: '同步失敗，請稍後再試',
      }
      throw error
    } finally {
      syncing.value = false
    }
  }

  /**
   * 載入活動列表
   */
  async function loadActivities(options?: { type?: 'COMMIT' | 'ISSUE'; limit?: number; offset?: number }) {
    if (MOCK_MODE) {
      let filtered = MOCK_ACTIVITIES
      if (options?.type) {
        filtered = filtered.filter(a => a.type === options.type)
      }
      activities.value = filtered
      totalActivities.value = filtered.length
      return
    }

    loading.value = true
    try {
      const response = await gitlabApi.getActivities(options)
      activities.value = response.data.activities
      totalActivities.value = response.data.total
    } catch (error) {
      console.error('Failed to load GitLab activities:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 關聯活動到 Task
   */
  async function linkActivityToTask(activityId: string, taskId: string) {
    if (MOCK_MODE) {
      const activity = activities.value.find(a => a.id === activityId)
      if (activity) {
        activity.taskId = taskId
      }
      return
    }

    try {
      await gitlabApi.linkActivity(activityId, taskId)
      // 更新本地狀態
      const activity = activities.value.find(a => a.id === activityId)
      if (activity) {
        activity.taskId = taskId
      }
    } catch (error) {
      console.error('Failed to link activity:', error)
      throw error
    }
  }

  /**
   * 取消關聯
   */
  async function unlinkActivity(activityId: string) {
    if (MOCK_MODE) {
      const activity = activities.value.find(a => a.id === activityId)
      if (activity) {
        activity.taskId = undefined
      }
      return
    }

    try {
      await gitlabApi.unlinkActivity(activityId)
      // 更新本地狀態
      const activity = activities.value.find(a => a.id === activityId)
      if (activity) {
        activity.taskId = undefined
      }
    } catch (error) {
      console.error('Failed to unlink activity:', error)
      throw error
    }
  }

  return {
    // 狀態
    connected,
    gitlabId,
    gitlabUsername,
    connectedAt,
    lastSyncAt,
    activitiesCount,
    activities,
    totalActivities,
    loading,
    syncing,
    syncResult,
    configured,
    gitlabUrl,

    // 計算屬性
    isConnected,
    hasActivities,
    commitActivities,
    issueActivities,

    // 方法
    loadConfig,
    loadStatus,
    startAuth,
    disconnect,
    sync,
    loadActivities,
    linkActivityToTask,
    unlinkActivity,
  }
})
