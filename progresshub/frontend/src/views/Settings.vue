<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGitLabStore } from '@/stores/gitlab'

const route = useRoute()
const authStore = useAuthStore()
const gitlabStore = useGitLabStore()

const showSyncSuccessToast = ref(false)
const showSyncErrorToast = ref(false)
const toastMessage = ref('')

onMounted(async () => {
  await gitlabStore.loadConfig()
  await gitlabStore.loadStatus()

  // 處理 OAuth 回調參數
  if (route.query.gitlab === 'connected') {
    toastMessage.value = 'GitLab 帳號連結成功！'
    showSyncSuccessToast.value = true
    await gitlabStore.loadStatus()
  } else if (route.query.gitlab === 'error') {
    toastMessage.value = route.query.message as string || 'GitLab 連結失敗'
    showSyncErrorToast.value = true
  }
})

// 自動隱藏 Toast
watch([showSyncSuccessToast, showSyncErrorToast], ([success, error]) => {
  if (success || error) {
    setTimeout(() => {
      showSyncSuccessToast.value = false
      showSyncErrorToast.value = false
    }, 5000)
  }
})

const handleConnect = async () => {
  try {
    await gitlabStore.startAuth()
  } catch {
    toastMessage.value = '無法開始連結流程，請稍後再試'
    showSyncErrorToast.value = true
  }
}

const handleDisconnect = async () => {
  if (!confirm('確定要取消 GitLab 連結嗎？這將會刪除所有同步的活動記錄。')) {
    return
  }
  try {
    await gitlabStore.disconnect()
    toastMessage.value = 'GitLab 連結已取消'
    showSyncSuccessToast.value = true
  } catch {
    toastMessage.value = '取消連結失敗，請稍後再試'
    showSyncErrorToast.value = true
  }
}

const handleSync = async () => {
  try {
    const result = await gitlabStore.sync(7)
    if (result?.success) {
      toastMessage.value = result.message || '同步完成'
      showSyncSuccessToast.value = true
    } else {
      toastMessage.value = result?.message || '同步失敗'
      showSyncErrorToast.value = true
    }
  } catch {
    toastMessage.value = '同步失敗，請稍後再試'
    showSyncErrorToast.value = true
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '從未'
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`
  return formatDate(dateString)
}

const getActivityIcon = (type: string) => {
  return type === 'COMMIT' ? '📝' : '📌'
}

const getActivityTypeText = (type: string) => {
  return type === 'COMMIT' ? 'commit' : 'issue'
}

const getIssueStateClass = (state?: string) => {
  if (state === 'opened') return 'text-success-600 dark:text-success-400'
  if (state === 'closed') return 'text-gray-500 dark:text-gray-400'
  return ''
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">設定</h1>
      <p class="page-subtitle">管理您的帳號設定與整合服務</p>
    </div>

    <!-- Toast Notifications -->
    <Transition name="slide-down">
      <div
        v-if="showSyncSuccessToast"
        class="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded-xl shadow-lg border border-success-200 dark:border-success-800"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ toastMessage }}</span>
        <button @click="showSyncSuccessToast = false" class="ml-2 hover:opacity-70">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>

    <Transition name="slide-down">
      <div
        v-if="showSyncErrorToast"
        class="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl shadow-lg border border-red-200 dark:border-red-800"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ toastMessage }}</span>
        <button @click="showSyncErrorToast = false" class="ml-2 hover:opacity-70">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左側：個人資訊 -->
      <div class="space-y-6">
        <!-- 個人資訊卡片 -->
        <div class="card">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">個人資訊</h2>
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">姓名</label>
              <p class="text-gray-900 dark:text-gray-100">{{ authStore.user?.name }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              <p class="text-gray-900 dark:text-gray-100">{{ authStore.user?.email }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">部門</label>
              <p class="text-gray-900 dark:text-gray-100">{{ authStore.user?.department || '未設定' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">職能</label>
              <p class="text-gray-900 dark:text-gray-100">{{ authStore.user?.role || '未設定' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500 dark:text-gray-400">權限等級</label>
              <span :class="[
                'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                authStore.isAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                authStore.isPM ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              ]">
                {{ authStore.user?.permissionLevel }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：GitLab 整合 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- GitLab 連結卡片 -->
        <div class="card">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ gitlabStore.isConnected ? 'GitLab 帳號已連結' : 'GitLab 帳號連結' }}
              </h2>
              <p v-if="!gitlabStore.isConnected" class="text-sm text-gray-500 dark:text-gray-400">
                連結 GitLab 帳號後，可手動同步您的工作進度（Commits、Issues）到系統
              </p>
            </div>
          </div>

          <!-- 未配置狀態 -->
          <div v-if="!gitlabStore.configured" class="text-center py-8">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400 mb-2">GitLab 整合尚未配置</p>
            <p class="text-sm text-gray-400 dark:text-gray-500">請聯繫系統管理員設定 GitLab OAuth</p>
          </div>

          <!-- 未連結狀態 -->
          <div v-else-if="!gitlabStore.isConnected" class="text-center py-8">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <svg class="w-8 h-8 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z"/>
              </svg>
            </div>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              連結 GitLab 帳號以同步您的 Commits 和 Issues
            </p>
            <button
              @click="handleConnect"
              :disabled="gitlabStore.loading"
              class="btn-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              連結 GitLab 帳號
            </button>
            <p v-if="gitlabStore.gitlabUrl" class="text-xs text-gray-400 dark:text-gray-500 mt-3">
              將連結至 {{ gitlabStore.gitlabUrl }}
            </p>
          </div>

          <!-- 已連結狀態 -->
          <div v-else class="space-y-6">
            <!-- 連結資訊 -->
            <div class="flex items-start justify-between p-4 bg-success-50/50 dark:bg-success-900/20 rounded-xl border border-success-200 dark:border-success-800">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <svg class="w-6 h-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      @{{ gitlabStore.gitlabUsername }}
                    </span>
                    <span class="text-xs px-2 py-0.5 bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300 rounded-full">
                      已連結
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ gitlabStore.gitlabUrl || 'gitlab.company.com' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 同步資訊 -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">上次同步</p>
                <p class="font-medium text-gray-900 dark:text-gray-100">
                  {{ formatDate(gitlabStore.lastSyncAt) }}
                </p>
              </div>
              <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">同步記錄</p>
                <p class="font-medium text-gray-900 dark:text-gray-100">
                  {{ gitlabStore.activitiesCount }} 筆活動
                </p>
              </div>
            </div>

            <!-- 同步結果 -->
            <Transition name="fade">
              <div
                v-if="gitlabStore.syncResult"
                :class="[
                  'p-4 rounded-xl border',
                  gitlabStore.syncResult.success
                    ? 'bg-success-50/50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                    : 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                ]"
              >
                <div class="flex items-center gap-2">
                  <svg
                    v-if="gitlabStore.syncResult.success"
                    class="w-5 h-5 text-success-600 dark:text-success-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg
                    v-else
                    class="w-5 h-5 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span :class="gitlabStore.syncResult.success ? 'text-success-700 dark:text-success-300' : 'text-red-700 dark:text-red-300'">
                    {{ gitlabStore.syncResult.message }}
                  </span>
                </div>
              </div>
            </Transition>

            <!-- 操作按鈕 -->
            <div class="flex items-center gap-3">
              <button
                @click="handleSync"
                :disabled="gitlabStore.syncing"
                class="btn-primary"
              >
                <svg
                  v-if="gitlabStore.syncing"
                  class="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ gitlabStore.syncing ? '同步中...' : '立即同步' }}
              </button>
              <button
                @click="handleDisconnect"
                :disabled="gitlabStore.loading"
                class="btn-secondary text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                取消連結
              </button>
            </div>
          </div>
        </div>

        <!-- 最近 GitLab 活動 -->
        <div v-if="gitlabStore.isConnected" class="card">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">最近 GitLab 活動</h2>
            </div>
            <button
              @click="handleSync"
              :disabled="gitlabStore.syncing"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="同步"
            >
              <svg
                :class="['w-5 h-5', gitlabStore.syncing && 'animate-spin']"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="gitlabStore.loading && !gitlabStore.hasActivities" class="space-y-3">
            <div v-for="i in 3" :key="i" class="skeleton h-20 rounded-xl"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="!gitlabStore.hasActivities" class="empty-state">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="empty-state-title">尚無同步記錄</p>
            <p class="empty-state-description">點擊「立即同步」來同步您的 GitLab 活動</p>
          </div>

          <!-- Activity List -->
          <div v-else class="space-y-3">
            <a
              v-for="activity in gitlabStore.activities.slice(0, 10)"
              :key="activity.id"
              :href="activity.url"
              target="_blank"
              rel="noopener noreferrer"
              class="block p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200"
            >
              <div class="flex items-start gap-3">
                <span class="text-xl">{{ getActivityIcon(activity.type) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ activity.title }}
                  </p>
                  <div class="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{{ activity.projectName }}</span>
                    <span>·</span>
                    <span>{{ getActivityTypeText(activity.type) }}</span>
                    <span v-if="activity.state" :class="getIssueStateClass(activity.state)">
                      · {{ activity.state }}
                    </span>
                    <span>·</span>
                    <span>{{ formatRelativeTime(activity.gitlabCreatedAt) }}</span>
                  </div>
                </div>
                <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
