<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getTaskById,
  getProgressLogsByTaskId,
  mockEmployees,
  type PoolTask,
} from '@/stores/mockData'
import type { ProgressLog } from '@/types'

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
})

// 格式化日期時間
const formatDateTime = (dateString: string) => {
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
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW')
}

// 計算進度變化
const getProgressDelta = (log: ProgressLog, index: number) => {
  if (index === progressLogs.value.length - 1) {
    return log.progressPercentage
  }
  const prevLog = progressLogs.value[index + 1]
  return log.progressPercentage - prevLog.progressPercentage
}

// 狀態標籤
const getStatusClass = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return '未開始'
    case 'IN_PROGRESS':
      return '進行中'
    case 'COMPLETED':
      return '已完成'
    default:
      return status
  }
}

// 來源類型
const getSourceLabel = (sourceType: string) => {
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
const goBack = () => {
  router.push('/task-pool')
}

// 認領任務
const claimTask = () => {
  alert('認領任務成功！\n（此為原型展示，實際功能待後端實作）')
}

// 退回任務
const returnTask = () => {
  if (confirm('確定要退回此任務嗎？')) {
    alert('已退回任務\n（此為原型展示，實際功能待後端實作）')
  }
}

// 提交進度
const submitProgress = () => {
  alert(`提交進度: ${newProgress.value.percentage}%\n備註: ${newProgress.value.notes}\n（此為原型展示，實際功能待後端實作）`)
  showProgressModal.value = false
  newProgress.value = { percentage: task.value?.progressPercentage || 0, notes: '' }
}

// 指派任務
const assignTask = (employeeId: string) => {
  const employee = mockEmployees.find((e) => e.id === employeeId)
  alert(`已指派給: ${employee?.name}\n（此為原型展示，實際功能待後端實作）`)
  showAssignModal.value = false
}

// 編輯任務
const editTask = () => {
  router.push(`/task-pool/${task.value?.id}/edit`)
}

// 刪除任務
const deleteTask = () => {
  if (confirm('確定要刪除此任務嗎？此操作無法復原。')) {
    alert('已刪除任務\n（此為原型展示，實際功能待後端實作）')
    router.push('/task-pool')
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- 返回按鈕 -->
    <button
      @click="goBack"
      class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
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
                <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ task.project?.name }}
                </span>
              </div>

              <!-- 標題 -->
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ task.name }}
              </h1>

              <!-- 描述 -->
              <p class="text-gray-600 dark:text-gray-400 mt-3">
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
                    class="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    class="text-primary-500"
                    :stroke-dasharray="251.2"
                    :stroke-dashoffset="251.2 - (251.2 * task.progressPercentage) / 100"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xl font-bold text-gray-900 dark:text-white">{{ task.progressPercentage }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              v-if="!task.assignedToId && task.status === 'NOT_STARTED'"
              @click="claimTask"
              class="btn-accent"
            >
              認領任務
            </button>
            <button
              v-if="task.assignedToId"
              @click="showProgressModal = true"
              class="btn-primary"
            >
              回報進度
            </button>
            <button
              v-if="task.assignedToId && task.status !== 'COMPLETED'"
              @click="returnTask"
              class="btn-secondary"
            >
              退回任務
            </button>
            <button
              @click="showAssignModal = true"
              class="btn-secondary"
            >
              指派任務
            </button>
            <button
              v-if="task.canEdit"
              @click="editTask"
              class="btn-ghost"
            >
              編輯
            </button>
            <button
              v-if="task.canDelete"
              @click="deleteTask"
              class="btn-danger"
            >
              刪除
            </button>
          </div>
        </div>

        <!-- 進度歷程 Timeline -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            進度歷程
          </h2>

          <div v-if="progressLogs.length === 0" class="text-center py-8">
            <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="mt-3 text-gray-500 dark:text-gray-400">尚無進度記錄</p>
          </div>

          <div v-else class="relative">
            <!-- Timeline 線條 -->
            <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

            <!-- Timeline 項目 -->
            <div class="space-y-6">
              <div
                v-for="(log, index) in progressLogs"
                :key="log.id"
                class="relative pl-10"
              >
                <!-- Timeline 節點 -->
                <div class="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center"
                  :class="index === 0 ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
                >
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <!-- 內容 -->
                <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                      <span class="font-semibold text-gray-900 dark:text-white">
                        {{ log.progressPercentage }}%
                      </span>
                      <span
                        v-if="getProgressDelta(log, index) > 0"
                        class="text-sm text-green-600 dark:text-green-400"
                      >
                        +{{ getProgressDelta(log, index) }}%
                      </span>
                    </div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDateTime(log.reportedAt) }}
                    </span>
                  </div>
                  <p v-if="log.notes" class="text-gray-600 dark:text-gray-400">
                    {{ log.notes }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    回報者: {{ log.employee?.name }}
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
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">任務資訊</h3>

          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-gray-500 dark:text-gray-400">負責人</dt>
              <dd class="text-gray-900 dark:text-white mt-1">
                {{ task.assignedTo?.name || '尚未指派' }}
              </dd>
            </div>

            <div v-if="task.collaboratorNames?.length">
              <dt class="text-sm text-gray-500 dark:text-gray-400">協作者</dt>
              <dd class="text-gray-900 dark:text-white mt-1">
                {{ task.collaboratorNames.join('、') }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-gray-500 dark:text-gray-400">計畫時間</dt>
              <dd class="text-gray-900 dark:text-white mt-1">
                {{ formatDate(task.plannedStartDate) }} ~ {{ formatDate(task.plannedEndDate) }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-gray-500 dark:text-gray-400">建立者</dt>
              <dd class="text-gray-900 dark:text-white mt-1">
                {{ task.createdBy.name }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-gray-500 dark:text-gray-400">建立時間</dt>
              <dd class="text-gray-900 dark:text-white mt-1">
                {{ formatDate(task.createdAt) }}
              </dd>
            </div>

            <div>
              <dt class="text-sm text-gray-500 dark:text-gray-400">最後更新</dt>
              <dd class="text-gray-900 dark:text-white mt-1">
                {{ formatDate(task.updatedAt) }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- 最近一次回報摘要 -->
        <div v-if="progressLogs.length > 0" class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">最近回報</h3>
          <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-primary-700 dark:text-primary-300">
                {{ progressLogs[0].progressPercentage }}%
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDateTime(progressLogs[0].reportedAt) }}
              </span>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ progressLogs[0].notes || '無備註' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 任務不存在 -->
    <div v-else class="card p-12 text-center">
      <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="mt-4 text-gray-500 dark:text-gray-400">找不到此任務</p>
      <button @click="goBack" class="btn-primary mt-4">返回任務池</button>
    </div>

    <!-- 進度回報 Modal -->
    <div v-if="showProgressModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showProgressModal = false"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">回報進度</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <span class="text-lg font-semibold text-gray-900 dark:text-white w-16 text-right">
                {{ newProgress.percentage }}%
              </span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              備註
            </label>
            <textarea
              v-model="newProgress.notes"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="描述進度更新內容..."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showProgressModal = false" class="btn-secondary">取消</button>
          <button @click="submitProgress" class="btn-primary">提交</button>
        </div>
      </div>
    </div>

    <!-- 指派任務 Modal -->
    <div v-if="showAssignModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showAssignModal = false"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">指派任務</h3>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <button
            v-for="employee in mockEmployees"
            :key="employee.id"
            @click="assignTask(employee.id)"
            class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-left"
          >
            <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span class="text-primary-600 dark:text-primary-400 font-semibold">
                {{ employee.name.charAt(0) }}
              </span>
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ employee.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ employee.email }}</p>
            </div>
          </button>
        </div>

        <div class="flex justify-end mt-6">
          <button @click="showAssignModal = false" class="btn-secondary">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>
