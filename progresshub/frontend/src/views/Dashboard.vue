<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { tasksApi, progressApi, ganttApi } from '@/api'
import type { Task, ProgressLog, GanttStats } from '@/types'

const authStore = useAuthStore()
const loading = ref(true)
const myTasks = ref<Task[]>([])
const recentLogs = ref<ProgressLog[]>([])
const stats = ref<GanttStats | null>(null)

onMounted(async () => {
  try {
    const [tasksRes, logsRes] = await Promise.all([
      tasksApi.getMy(),
      progressApi.getMy(5),
    ])

    myTasks.value = tasksRes.data.tasks
    recentLogs.value = logsRes.data.logs

    if (authStore.isPM) {
      const statsRes = await ganttApi.getStats()
      stats.value = statsRes.data.stats
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
})

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    NOT_STARTED: 'status-not-started',
    IN_PROGRESS: 'status-in-progress',
    COMPLETED: 'status-completed',
  }
  return classes[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    NOT_STARTED: '未開始',
    IN_PROGRESS: '進行中',
    COMPLETED: '已完成',
  }
  return texts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}

const getProgressColor = (progress: number) => {
  if (progress >= 100) return 'from-success-500 to-success-600'
  if (progress >= 70) return 'from-primary-500 to-primary-600'
  if (progress >= 30) return 'from-warning-500 to-warning-600'
  return 'from-gray-400 to-gray-500'
}
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">
        歡迎回來，<span class="gradient-text">{{ authStore.user?.name }}</span>！
      </h1>
      <p class="page-subtitle">這是您的專案進度總覽</p>
    </div>

    <!-- Loading State with Skeleton -->
    <template v-if="loading">
      <!-- Stat Cards Skeleton -->
      <div v-if="authStore.isPM" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div v-for="i in 4" :key="i" class="stat-card">
          <div class="flex items-start justify-between">
            <div class="space-y-3 flex-1">
              <div class="skeleton h-4 w-20"></div>
              <div class="skeleton h-8 w-16"></div>
            </div>
            <div class="skeleton w-12 h-12 rounded-xl"></div>
          </div>
        </div>
      </div>

      <!-- Content Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <div class="skeleton h-6 w-32 mb-6"></div>
          <div class="space-y-4">
            <div v-for="i in 3" :key="i" class="skeleton h-20 rounded-xl"></div>
          </div>
        </div>
        <div class="card">
          <div class="skeleton h-6 w-32 mb-6"></div>
          <div class="space-y-4">
            <div v-for="i in 3" :key="i" class="skeleton h-16 rounded-xl"></div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- PM 統計卡片 -->
      <div v-if="authStore.isPM && stats" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Total Tasks -->
        <div class="stat-card group cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">總任務數</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{{ stats.totalTasks }}</p>
            </div>
            <div class="stat-card-icon bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Completion Rate -->
        <div class="stat-card group cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">完成率</p>
              <p class="text-3xl font-bold text-success-600 dark:text-success-400 tracking-tight">{{ stats.completionRate }}%</p>
            </div>
            <div class="stat-card-icon bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="progress-bar">
              <div
                class="progress-bar-fill-success"
                :style="{ width: `${stats.completionRate}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Average Progress -->
        <div class="stat-card group cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">平均進度</p>
              <p class="text-3xl font-bold text-primary-600 dark:text-primary-400 tracking-tight">{{ stats.averageProgress }}%</p>
            </div>
            <div class="stat-card-icon bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="progress-bar">
              <div
                class="progress-bar-fill-primary"
                :style="{ width: `${stats.averageProgress}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- In Progress -->
        <div class="stat-card group cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">進行中</p>
              <p class="text-3xl font-bold text-warning-600 dark:text-warning-400 tracking-tight">{{ stats.inProgressTasks }}</p>
            </div>
            <div class="stat-card-icon bg-warning-50 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 我的任務 -->
        <div class="card">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">我的任務</h2>
            </div>
            <RouterLink to="/my-tasks" class="link text-sm flex items-center gap-1">
              查看全部
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </RouterLink>
          </div>

          <div v-if="myTasks.length === 0" class="empty-state">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="empty-state-title">目前沒有任務</p>
            <p class="empty-state-description">您目前沒有被分配的任務</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="task in myTasks.slice(0, 5)"
              :key="task.id"
              class="task-item group"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {{ task.name }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ task.project?.name }}</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ task.progressPercentage }}%</div>
                  <div class="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
                    <div
                      class="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
                      :class="getProgressColor(task.progressPercentage)"
                      :style="{ width: `${task.progressPercentage}%` }"
                    ></div>
                  </div>
                </div>
                <span :class="['status-badge', getStatusClass(task.status)]">
                  {{ getStatusText(task.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近回報 -->
        <div class="card">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">最近回報</h2>
            </div>
            <RouterLink to="/report" class="btn-primary text-sm py-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              回報進度
            </RouterLink>
          </div>

          <div v-if="recentLogs.length === 0" class="empty-state">
            <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="empty-state-title">尚無回報記錄</p>
            <p class="empty-state-description">開始回報您的任務進度吧</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="log in recentLogs"
              :key="log.id"
              class="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200"
            >
              <div class="flex items-center justify-between">
                <p class="font-medium text-gray-900 dark:text-gray-100">{{ log.task?.name }}</p>
                <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                  {{ formatDate(log.reportedAt) }}
                </span>
              </div>
              <div class="flex items-center gap-3 mt-2">
                <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {{ log.progressPercentage }}%
                </span>
                <span v-if="log.notes" class="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
                  {{ log.notes }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
