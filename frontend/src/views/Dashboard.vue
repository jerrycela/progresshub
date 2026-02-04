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
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">
      歡迎回來，{{ authStore.user?.name }}！
    </h1>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <template v-else>
      <!-- PM 統計卡片 -->
      <div v-if="authStore.isPM && stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="card">
          <p class="text-sm text-gray-500">總任務數</p>
          <p class="text-3xl font-bold text-gray-900">{{ stats.totalTasks }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">完成率</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.completionRate }}%</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">平均進度</p>
          <p class="text-3xl font-bold text-blue-600">{{ stats.averageProgress }}%</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">進行中</p>
          <p class="text-3xl font-bold text-yellow-600">{{ stats.inProgressTasks }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 我的任務 -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">我的任務</h2>
            <RouterLink to="/my-tasks" class="text-primary-600 hover:text-primary-700 text-sm">
              查看全部
            </RouterLink>
          </div>

          <div v-if="myTasks.length === 0" class="text-gray-500 text-center py-8">
            目前沒有分配的任務
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="task in myTasks.slice(0, 5)"
              :key="task.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ task.name }}</p>
                <p class="text-sm text-gray-500">{{ task.project?.name }}</p>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <div class="text-sm font-medium text-gray-900">{{ task.progressPercentage }}%</div>
                  <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-primary-600 transition-all"
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">最近回報</h2>
            <RouterLink to="/report" class="text-primary-600 hover:text-primary-700 text-sm">
              回報進度
            </RouterLink>
          </div>

          <div v-if="recentLogs.length === 0" class="text-gray-500 text-center py-8">
            尚無回報記錄
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="log in recentLogs"
              :key="log.id"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <p class="font-medium text-gray-900">{{ log.task?.name }}</p>
                <span class="text-sm text-gray-500">{{ formatDate(log.reportedAt) }}</span>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-sm font-medium text-primary-600">{{ log.progressPercentage }}%</span>
                <span v-if="log.notes" class="text-sm text-gray-500 truncate">
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
