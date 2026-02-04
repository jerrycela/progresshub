<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getTaskById,
  getProgressLogsByTaskId,
  mockEmployees,
  type PoolTask,
} from '@/mocks/taskPool'
import type { ProgressLog } from 'shared/types'

// ============================================
// 任務詳情頁 - 含進度歷程 Timeline
// ============================================

const route = useRoute()
const router = useRouter()

const task = ref<PoolTask | null>(null)
const progressLogs = ref<ProgressLog[]>([])
const showAssignModal = ref(false)
const showProgressModal = ref(false)

// 新進度回報表單
const newProgress = ref({
  percentage: 0,
  notes: '',
})

onMounted(() => {
  const taskId = route.params.id as string
  task.value = getTaskById(taskId) || null
  progressLogs.value = getProgressLogsByTaskId(taskId)
  if (task.value) {
    newProgress.value.percentage = task.value.progress
  }
})

// 格式化日期時間
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW')
}

// 計算進度變化
const getProgressDelta = (log: ProgressLog, index: number): number => {
  if (index === progressLogs.value.length - 1) {
    return log.progress
  }
  const prevLog = progressLogs.value[index + 1]
  return log.progress - prevLog.progress
}

// 狀態標籤
const getStatusClass = (status: string): string => {
  switch (status) {
    case 'UNCLAIMED':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'CLAIMED':
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    case 'DONE':
      return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
    case 'BLOCKED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'UNCLAIMED':
      return '待認領'
    case 'CLAIMED':
      return '已認領'
    case 'IN_PROGRESS':
      return '進行中'
    case 'DONE':
      return '已完成'
    case 'BLOCKED':
      return '阻塞'
    default:
      return status
  }
}

// 來源類型
const getSourceLabel = (sourceType: string): string => {
  switch (sourceType) {
    case 'ASSIGNED':
      return '指派任務'
    case 'POOL':
      return '任務池'
    case 'SELF_CREATED':
      return '自建任務'
    default:
      return sourceType
  }
}

// 返回
const goBack = (): void => {
  router.push('/task-pool')
}

// 認領任務
const claimTask = (): void => {
  alert('認領任務成功！\n（此為原型展示，實際功能待後端實作）')
}

// 退回任務
const returnTask = (): void => {
  if (confirm('確定要退回此任務嗎？')) {
    alert('已退回任務\n（此為原型展示，實際功能待後端實作）')
  }
}

// 提交進度
const submitProgress = (): void => {
  alert(`提交進度: ${newProgress.value.percentage}%\n備註: ${newProgress.value.notes}\n（此為原型展示，實際功能待後端實作）`)
  showProgressModal.value = false
  newProgress.value = { percentage: task.value?.progress || 0, notes: '' }
}

// 指派任務
const assignTask = (employeeId: string): void => {
  const employee = mockEmployees.find((e) => e.id === employeeId)
  alert(`已指派給: ${employee?.name}\n（此為原型展示，實際功能待後端實作）`)
  showAssignModal.value = false
}

// 編輯任務
const editTask = (): void => {
  router.push(`/task-pool/${task.value?.id}/edit`)
}

// 刪除任務
const deleteTask = (): void => {
  if (confirm('確定要刪除此任務嗎？此操作無法復原。')) {
    alert('已刪除任務\n（此為原型展示，實際功能待後端實作）')
    router.push('/task-pool')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 返回按鈕 -->
    <button
      class="flex items-center gap-2 transition-colors cursor-pointer"
      style="color: var(--text-secondary);"
      @click="goBack"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>返回任務池</span>
    </button>

    <div v-if="task" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左側：任務詳情 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 任務基本資訊 -->
        <div class="card p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <!-- 標籤 -->
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  {{ getSourceLabel(task.sourceType) }}
                </span>
                <span :class="['px-2.5 py-1 text-xs font-medium rounded-full', getStatusClass(task.status)]">
                  {{ getStatusLabel(task.status) }}
                </span>
                <span class="px-2.5 py-1 text-xs font-medium rounded-full" style="background-color: var(--bg-tertiary); color: var(--text-secondary);">
                  {{ task.project?.name }}
                </span>
              </div>

              <!-- 標題 -->
              <h1 class="text-2xl font-bold" style="color: var(--text-primary);">
                {{ task.title }}
              </h1>

              <!-- 描述 -->
              <p class="mt-3" style="color: var(--text-secondary);">
                {{ task.description }}
              </p>
            </div>

            <!-- 進度圓環 -->
            <div class="flex-shrink-0">
              <div class="relative w-24 h-24">
                <svg class="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    style="color: var(--bg-tertiary);"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    style="color: var(--accent-primary);"
                    :stroke-dasharray="251.2"
                    :stroke-dashoffset="251.2 - (251.2 * task.progress) / 100"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xl font-bold" style="color: var(--text-primary);">{{ task.progress }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex flex-wrap gap-3 mt-6 pt-6" style="border-top: 1px solid var(--border-primary);">
            <button
              v-if="task.status === 'UNCLAIMED'"
              class="btn-primary"
              @click="claimTask"
            >
              認領任務
            </button>
            <button
              v-if="task.assigneeId"
              class="btn-primary"
              @click="showProgressModal = true"
            >
              回報進度
            </button>
            <button
              v-if="task.assigneeId && task.status !== 'DONE'"
              class="btn-secondary"
              @click="returnTask"
            >
              退回任務
            </button>
            <button
              class="btn-secondary"
              @click="showAssignModal = true"
            >
              指派任務
            </button>
            <button
              v-if="task.canEdit"
              class="btn-ghost"
              @click="editTask"
            >
              編輯
            </button>
            <button
              v-if="task.canDelete"
              class="btn-danger"
              @click="deleteTask"
            >
              刪除
            </button>
          </div>
        </div>

        <!-- 進度歷程 Timeline -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">
            進度歷程
          </h2>

          <div v-if="progressLogs.length === 0" class="text-center py-8">
            <svg class="w-12 h-12 mx-auto" style="color: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="mt-3" style="color: var(--text-secondary);">尚無進度記錄</p>
          </div>

          <div v-else class="relative">
            <!-- Timeline 線條 -->
            <div class="absolute left-4 top-0 bottom-0 w-0.5" style="background-color: var(--border-primary);"></div>

            <!-- Timeline 項目 -->
            <div class="space-y-6">
              <div
                v-for="(log, index) in progressLogs"
                :key="log.id"
                class="relative pl-10"
              >
                <!-- Timeline 節點 -->
                <div
                  class="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center"
                  :style="{ backgroundColor: index === 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }"
                >
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <!-- 內容 -->
                <div class="rounded-lg p-4" style="background-color: var(--bg-secondary);">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                      <span class="font-semibold" style="color: var(--text-primary);">
                        {{ log.progress }}%
                      </span>
                      <span
                        v-if="getProgressDelta(log, index) > 0"
                        class="text-sm"
                        style="color: #22C55E;"
                      >
                        +{{ getProgressDelta(log, index) }}%
                      </span>
                    </div>
                    <span class="text-sm" style="color: var(--text-muted);">
                      {{ formatDateTime(log.reportedAt) }}
                    </span>
                  </div>
                  <p v-if="log.notes" style="color: var(--text-secondary);">
                    {{ log.notes }}
                  </p>
                  <p class="text-sm mt-2" style="color: var(--text-muted);">
                    回報者: {{ log.user?.name }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：任務資訊 -->
      <div class="space-y-6">
        <!-- 任務資訊卡 -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">任務資訊</h3>

          <dl class="space-y-4">
            <div>
              <dt class="text-sm" style="color: var(--text-muted);">負責人</dt>
              <dd class="mt-1" style="color: var(--text-primary);">
                {{ task.assignee?.name || '尚未指派' }}
              </dd>
            </div>

            <div v-if="task.collaboratorNames?.length">
              <dt class="text-sm" style="color: var(--text-muted);">協作者</dt>
              <dd class="mt-1" style="color: var(--text-primary);">
                {{ task.collaboratorNames.join('、') }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted);">計畫時間</dt>
              <dd class="mt-1" style="color: var(--text-primary);">
                {{ formatDate(task.startDate || '') }} ~ {{ formatDate(task.dueDate || '') }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted);">建立者</dt>
              <dd class="mt-1" style="color: var(--text-primary);">
                {{ task.createdBy.name }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted);">建立時間</dt>
              <dd class="mt-1" style="color: var(--text-primary);">
                {{ formatDate(task.createdAt) }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted);">最後更新</dt>
              <dd class="mt-1" style="color: var(--text-primary);">
                {{ formatDate(task.updatedAt) }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- 最近一次回報摘要 -->
        <div v-if="progressLogs.length > 0" class="card p-6">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">最近回報</h3>
          <div class="rounded-lg p-4" style="background-color: rgba(196, 30, 58, 0.1);">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold" style="color: var(--accent-primary);">
                {{ progressLogs[0].progress }}%
              </span>
              <span class="text-sm" style="color: var(--text-muted);">
                {{ formatDateTime(progressLogs[0].reportedAt) }}
              </span>
            </div>
            <p class="text-sm" style="color: var(--text-secondary);">
              {{ progressLogs[0].notes || '無備註' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 任務不存在 -->
    <div v-else class="card p-12 text-center">
      <svg class="w-16 h-16 mx-auto" style="color: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="mt-4" style="color: var(--text-secondary);">找不到此任務</p>
      <button class="btn-primary mt-4" @click="goBack">返回任務池</button>
    </div>

    <!-- 進度回報 Modal -->
    <div v-if="showProgressModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showProgressModal = false"></div>
      <div class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4" style="background-color: var(--bg-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">回報進度</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
              目前進度
            </label>
            <div class="flex items-center gap-4">
              <input
                v-model.number="newProgress.percentage"
                type="range"
                min="0"
                max="100"
                class="flex-1"
              />
              <span class="text-lg font-semibold w-16 text-right" style="color: var(--text-primary);">
                {{ newProgress.percentage }}%
              </span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
              備註
            </label>
            <textarea
              v-model="newProgress.notes"
              rows="3"
              class="input-field w-full"
              placeholder="描述進度更新內容..."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button class="btn-secondary" @click="showProgressModal = false">取消</button>
          <button class="btn-primary" @click="submitProgress">提交</button>
        </div>
      </div>
    </div>

    <!-- 指派任務 Modal -->
    <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showAssignModal = false"></div>
      <div class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4" style="background-color: var(--bg-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">指派任務</h3>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <button
            v-for="employee in mockEmployees"
            :key="employee.id"
            class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer text-left"
            style="background-color: transparent;"
            @click="assignTask(employee.id)"
          >
            <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background-color: var(--bg-tertiary);">
              <span class="font-semibold" style="color: var(--accent-primary);">
                {{ employee.name.charAt(0) }}
              </span>
            </div>
            <div>
              <p class="font-medium" style="color: var(--text-primary);">{{ employee.name }}</p>
              <p class="text-sm" style="color: var(--text-muted);">{{ employee.email }}</p>
            </div>
          </button>
        </div>

        <div class="flex justify-end mt-6">
          <button class="btn-secondary" @click="showAssignModal = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>
