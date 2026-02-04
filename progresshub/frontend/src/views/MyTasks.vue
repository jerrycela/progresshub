<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  mockPoolTasks,
  getProgressLogsByTaskId,
  type PoolTask,
} from '@/stores/mockData'
import type { ProgressLog } from '@/types'

// 模擬當前用戶 ID（實際應從 auth store 取得）
const currentUserId = 'emp-1'

// 取得我的任務（負責人或協作者）
const myTasks = computed(() => {
  return mockPoolTasks.filter(
    (task) =>
      task.assignedToId === currentUserId ||
      task.collaborators.includes(currentUserId)
  )
})

// 取得任務的最新進度記錄
const getLatestLog = (taskId: string): ProgressLog | null => {
  const logs = getProgressLogsByTaskId(taskId)
  return logs.length > 0 ? logs[0] : null
}

// 判斷是否為協作者（非主負責人）
const isCollaborator = (task: PoolTask) => {
  return task.assignedToId !== currentUserId && task.collaborators.includes(currentUserId)
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    ON_HOLD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    NOT_STARTED: '未開始',
    IN_PROGRESS: '進行中',
    COMPLETED: '已完成',
    ON_HOLD: '暫停中',
  }
  return texts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-TW')
}

const isOverdue = (task: PoolTask) => {
  if (task.status === 'COMPLETED') return false
  return new Date(task.plannedEndDate) < new Date()
}

const getProgressColor = (progress: number) => {
  if (progress >= 100) return 'from-green-500 to-green-600'
  if (progress >= 70) return 'from-blue-500 to-blue-600'
  if (progress >= 30) return 'from-yellow-500 to-yellow-600'
  return 'from-gray-400 to-gray-500'
}

// 展開的任務 ID（用於顯示進度歷程）
const expandedTaskId = ref<string | null>(null)

const toggleExpand = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId
}

// 任務統計
const taskStats = computed(() => ({
  total: myTasks.value.length,
  asOwner: myTasks.value.filter((t) => t.assignedToId === currentUserId).length,
  asCollaborator: myTasks.value.filter((t) => t.collaborators.includes(currentUserId) && t.assignedToId !== currentUserId).length,
  overdue: myTasks.value.filter((t) => isOverdue(t)).length,
}))
</script>

<template>
  <div class="p-6 lg:p-8">
    <!-- Page Header -->
    <div class="page-header mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">我的任務</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">管理您負責和協作的所有任務</p>
        </div>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">全部任務</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ taskStats.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">我負責的</p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ taskStats.asOwner }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">我協作的</p>
        <p class="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{{ taskStats.asCollaborator }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">已逾期</p>
        <p class="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{{ taskStats.overdue }}</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="myTasks.length === 0" class="card">
      <div class="text-center py-16">
        <svg class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="mt-4 text-xl font-medium text-gray-900 dark:text-white">目前沒有任務</p>
        <p class="mt-2 text-gray-500 dark:text-gray-400">您目前沒有被分配的任務，請前往任務池認領</p>
        <router-link to="/task-pool" class="btn-primary mt-4 inline-block">
          前往任務池
        </router-link>
      </div>
    </div>

    <!-- Task List -->
    <div v-else class="space-y-4">
      <div
        v-for="task in myTasks"
        :key="task.id"
        class="card overflow-hidden"
      >
        <!-- 任務主要內容 -->
        <div
          class="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          @click="toggleExpand(task.id)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- 標籤列 -->
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <!-- 協作者標籤 -->
                <span
                  v-if="isCollaborator(task)"
                  class="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                >
                  協作
                </span>
                <span :class="['px-2 py-0.5 text-xs font-medium rounded-full', getStatusClass(task.status)]">
                  {{ getStatusText(task.status) }}
                </span>
                <span
                  v-if="isOverdue(task)"
                  class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                >
                  已逾期
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ task.project?.name }}
                </span>
              </div>

              <!-- 任務名稱 -->
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ task.name }}
              </h3>

              <!-- 描述 -->
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                {{ task.description }}
              </p>

              <!-- Phase 1.2: 最新備註摘要 -->
              <div
                v-if="task.latestNote"
                class="mt-3 flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                    {{ task.latestNote }}
                  </p>
                  <p v-if="task.latestNoteAt" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {{ formatRelativeTime(task.latestNoteAt) }}
                  </p>
                </div>
              </div>

              <!-- Phase 1.2: 暫停原因 -->
              <div
                v-if="task.pauseReason"
                class="mt-3 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span class="text-sm text-yellow-700 dark:text-yellow-300">
                  <span class="font-medium">暫停原因：</span>{{ task.pauseReason }}
                </span>
              </div>

              <!-- 底部資訊 -->
              <div class="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <!-- 負責人 -->
                <div v-if="task.assignedTo" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{{ task.assignedTo.name }}</span>
                </div>

                <!-- Phase 1.4: 協作者頭像 -->
                <div v-if="task.collaboratorNames?.length" class="flex items-center gap-1">
                  <div class="flex -space-x-2">
                    <div
                      v-for="(name, index) in task.collaboratorNames.slice(0, 3)"
                      :key="index"
                      class="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 border-2 border-white dark:border-gray-900 flex items-center justify-center"
                      :title="name"
                    >
                      <span class="text-xs font-medium text-purple-700 dark:text-purple-300">
                        {{ name.charAt(0) }}
                      </span>
                    </div>
                    <div
                      v-if="task.collaboratorNames.length > 3"
                      class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center"
                    >
                      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                        +{{ task.collaboratorNames.length - 3 }}
                      </span>
                    </div>
                  </div>
                  <span class="ml-1">協作</span>
                </div>

                <!-- 截止日期 -->
                <div
                  class="flex items-center gap-1"
                  :class="isOverdue(task) ? 'text-red-600 dark:text-red-400' : ''"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>截止 {{ formatDate(task.plannedEndDate) }}</span>
                </div>
              </div>
            </div>

            <!-- 右側：進度 -->
            <div class="flex flex-col items-end gap-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ task.progressPercentage }}%</span>
              <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  class="h-full rounded-full transition-all duration-300 bg-gradient-to-r"
                  :class="getProgressColor(task.progressPercentage)"
                  :style="{ width: `${task.progressPercentage}%` }"
                ></div>
              </div>
              <!-- 展開指示 -->
              <svg
                class="w-5 h-5 text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': expandedTaskId === task.id }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Phase 1.2: 展開的進度歷程 -->
        <div
          v-if="expandedTaskId === task.id"
          class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5"
        >
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">進度歷程</h4>

          <div v-if="getProgressLogsByTaskId(task.id).length === 0" class="text-center py-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">尚無進度記錄</p>
          </div>

          <div v-else class="relative">
            <!-- Timeline 線條 -->
            <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

            <!-- Timeline 項目 -->
            <div class="space-y-4">
              <div
                v-for="(log, index) in getProgressLogsByTaskId(task.id).slice(0, 5)"
                :key="log.id"
                class="relative pl-8"
              >
                <!-- Timeline 節點 -->
                <div
                  class="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center"
                  :class="index === 0 ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
                >
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <!-- 內容 -->
                <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold text-gray-900 dark:text-white text-sm">
                      {{ log.progressPercentage }}%
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatRelativeTime(log.reportedAt) }}
                    </span>
                  </div>
                  <p v-if="log.notes" class="text-sm text-gray-600 dark:text-gray-400">
                    {{ log.notes }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {{ log.employee?.name }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 查看更多 -->
            <div v-if="getProgressLogsByTaskId(task.id).length > 5" class="mt-4 text-center">
              <router-link
                :to="`/task-pool/${task.id}`"
                class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                查看全部 {{ getProgressLogsByTaskId(task.id).length }} 筆記錄
              </router-link>
            </div>
          </div>

          <!-- 快速操作 -->
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <router-link :to="`/task-pool/${task.id}`" class="btn-primary text-sm">
              查看詳情
            </router-link>
            <button class="btn-secondary text-sm">
              回報進度
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Summary -->
    <div v-if="myTasks.length > 0" class="mt-6 flex items-center justify-between text-sm text-gray-500">
      <span>共 {{ myTasks.length }} 個任務</span>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-gray-400"></span>
          未開始: {{ myTasks.filter(t => t.status === 'NOT_STARTED').length }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          進行中: {{ myTasks.filter(t => t.status === 'IN_PROGRESS').length }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
          暫停中: {{ myTasks.filter(t => t.status === 'ON_HOLD').length }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          已完成: {{ myTasks.filter(t => t.status === 'COMPLETED').length }}
        </span>
      </div>
    </div>
  </div>
</template>
