<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getTaskById,
  getProgressLogsByTaskId,
  getTransferLogsByTaskId,
  getTaskNotesByTaskId,
  mockEmployees,
  type PoolTask,
} from '@/stores/mockData'
import type { ProgressLog, TransferLog, TaskNote } from '@/types'
import { ReleasePhaseLables, ReleasePhaseColors } from '@/types'

const route = useRoute()
const router = useRouter()

const task = ref<PoolTask | null>(null)
const progressLogs = ref<ProgressLog[]>([])
const transferLogs = ref<TransferLog[]>([])
const taskNotes = ref<TaskNote[]>([])
const showAssignModal = ref(false)
const showProgressModal = ref(false)
const showTransferModal = ref(false)
const showNoteModal = ref(false)

// 當前顯示的歷程 Tab
const activeTab = ref<'progress' | 'transfer' | 'notes'>('progress')

// 新進度回報表單
const newProgress = ref({
  percentage: 0,
  notes: '',
})

// 新轉交表單
const newTransfer = ref({
  toEmployeeId: '',
  reason: '',
  notes: '',
})

// 新備註表單
const newNote = ref({
  content: '',
})

onMounted(() => {
  const taskId = route.params.id as string
  task.value = getTaskById(taskId) || null
  progressLogs.value = getProgressLogsByTaskId(taskId)
  transferLogs.value = getTransferLogsByTaskId(taskId)
  taskNotes.value = getTaskNotesByTaskId(taskId)
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
    case 'ON_HOLD':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
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
    case 'ON_HOLD':
      return '暫停中'
    default:
      return status
  }
}

// 判斷是否逾期
const isOverdue = () => {
  if (!task.value || task.value.status === 'COMPLETED') return false
  return new Date(task.value.plannedEndDate) < new Date()
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

// Phase 2.1: 轉交任務
const submitTransfer = () => {
  const employee = mockEmployees.find((e) => e.id === newTransfer.value.toEmployeeId)
  alert(`已轉交給: ${employee?.name}\n原因: ${newTransfer.value.reason}\n備註: ${newTransfer.value.notes}\n（此為原型展示，實際功能待後端實作）`)
  showTransferModal.value = false
  newTransfer.value = { toEmployeeId: '', reason: '', notes: '' }
}

// Phase 2.3: 新增備註
const submitNote = () => {
  alert(`新增備註: ${newNote.value.content}\n（此為原型展示，實際功能待後端實作）`)
  showNoteModal.value = false
  newNote.value = { content: '' }
}

// 格式化相對時間
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
                <!-- Phase 2.2: 釋出節點標籤 -->
                <span
                  v-if="task.releasePhase"
                  :class="['px-2.5 py-1 text-xs font-medium rounded-full', ReleasePhaseColors[task.releasePhase]]"
                >
                  {{ ReleasePhaseLables[task.releasePhase] }}
                  <span v-if="task.releaseDate" class="opacity-75 ml-1">{{ task.releaseDate }}</span>
                </span>
                <!-- 逾期標籤 -->
                <span
                  v-if="isOverdue()"
                  class="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                >
                  已逾期
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
            <!-- Phase 2.3: 新增備註按鈕 -->
            <button
              @click="showNoteModal = true"
              class="btn-secondary"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              新增備註
            </button>
            <!-- Phase 2.1: 轉交任務按鈕 -->
            <button
              v-if="task.assignedToId && task.status !== 'COMPLETED'"
              @click="showTransferModal = true"
              class="btn-secondary"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              轉交任務
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

        <!-- Phase 2: 歷程區塊（Tab 切換：進度歷程/轉交記錄/備註） -->
        <div class="card p-6">
          <!-- Tab 選項 -->
          <div class="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              @click="activeTab = 'progress'"
              :class="[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === 'progress'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                進度歷程
                <span v-if="progressLogs.length > 0" class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                  {{ progressLogs.length }}
                </span>
              </div>
            </button>
            <button
              @click="activeTab = 'transfer'"
              :class="[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === 'transfer'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                轉交記錄
                <span v-if="transferLogs.length > 0" class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                  {{ transferLogs.length }}
                </span>
              </div>
            </button>
            <button
              @click="activeTab = 'notes'"
              :class="[
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === 'notes'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                備註
                <span v-if="taskNotes.length > 0" class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                  {{ taskNotes.length }}
                </span>
              </div>
            </button>
          </div>

          <!-- Tab 內容：進度歷程 -->
          <div v-if="activeTab === 'progress'">
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

          <!-- Tab 內容：轉交記錄 -->
          <div v-if="activeTab === 'transfer'">
            <div v-if="transferLogs.length === 0" class="text-center py-8">
              <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p class="mt-3 text-gray-500 dark:text-gray-400">尚無轉交記錄</p>
            </div>

            <div v-else class="relative">
              <!-- Timeline 線條 -->
              <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-orange-200 dark:bg-orange-700/50"></div>

              <!-- Timeline 項目 -->
              <div class="space-y-6">
                <div
                  v-for="(log, index) in transferLogs"
                  :key="log.id"
                  class="relative pl-10"
                >
                  <!-- Timeline 節點 -->
                  <div class="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center"
                    :class="index === 0 ? 'bg-orange-500' : 'bg-orange-300 dark:bg-orange-600'"
                  >
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>

                  <!-- 內容 -->
                  <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <!-- 轉出者 -->
                        <div class="flex items-center gap-1.5">
                          <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {{ log.fromEmployee?.name?.charAt(0) }}
                            </span>
                          </div>
                          <span class="text-sm text-gray-700 dark:text-gray-300">{{ log.fromEmployee?.name }}</span>
                        </div>
                        <!-- 箭頭 -->
                        <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <!-- 轉入者 -->
                        <div class="flex items-center gap-1.5">
                          <div class="w-6 h-6 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                            <span class="text-xs font-medium text-orange-700 dark:text-orange-300">
                              {{ log.toEmployee?.name?.charAt(0) }}
                            </span>
                          </div>
                          <span class="text-sm font-medium text-orange-700 dark:text-orange-300">{{ log.toEmployee?.name }}</span>
                        </div>
                      </div>
                      <span class="text-sm text-gray-500 dark:text-gray-400">
                        {{ formatDateTime(log.transferredAt) }}
                      </span>
                    </div>
                    <div v-if="log.reason" class="mt-2">
                      <span class="text-xs font-medium text-orange-600 dark:text-orange-400">轉交原因：</span>
                      <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">{{ log.reason }}</p>
                    </div>
                    <div v-if="log.notes" class="mt-2">
                      <span class="text-xs font-medium text-gray-500 dark:text-gray-400">備註：</span>
                      <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">{{ log.notes }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 內容：備註 -->
          <div v-if="activeTab === 'notes'">
            <div v-if="taskNotes.length === 0" class="text-center py-8">
              <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p class="mt-3 text-gray-500 dark:text-gray-400">尚無備註</p>
              <button @click="showNoteModal = true" class="mt-3 text-primary-600 dark:text-primary-400 hover:underline text-sm">
                新增第一則備註
              </button>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="note in taskNotes"
                :key="note.id"
                class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <span class="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {{ note.employee?.name?.charAt(0) }}
                      </span>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white text-sm">{{ note.employee?.name }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatRelativeTime(note.createdAt) }}</p>
                    </div>
                  </div>
                </div>
                <p class="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ note.content }}</p>
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
              <dd class="mt-2">
                <!-- Phase 1.4: 協作者頭像列表 -->
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="(name, index) in task.collaboratorNames"
                    :key="index"
                    class="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-full"
                  >
                    <div class="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                      <span class="text-xs font-medium text-purple-700 dark:text-purple-300">
                        {{ name.charAt(0) }}
                      </span>
                    </div>
                    <span class="text-sm text-purple-700 dark:text-purple-300">{{ name }}</span>
                  </div>
                </div>
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

    <!-- Phase 2.1: 轉交任務 Modal -->
    <div v-if="showTransferModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showTransferModal = false"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            轉交任務
          </div>
        </h3>

        <div class="space-y-4">
          <!-- 目前負責人 -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">目前負責人</p>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {{ task?.assignedTo?.name?.charAt(0) }}
                </span>
              </div>
              <span class="font-medium text-gray-900 dark:text-white">{{ task?.assignedTo?.name }}</span>
            </div>
          </div>

          <!-- 選擇接收者 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              轉交給 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="newTransfer.toEmployeeId"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">請選擇接收者</option>
              <option
                v-for="employee in mockEmployees.filter(e => e.id !== task?.assignedToId)"
                :key="employee.id"
                :value="employee.id"
              >
                {{ employee.name }}
              </option>
            </select>
          </div>

          <!-- 轉交原因 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              轉交原因 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="newTransfer.reason"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">請選擇原因</option>
              <option value="工作量調整">工作量調整</option>
              <option value="技能需求">技能需求</option>
              <option value="請假/出差">請假/出差</option>
              <option value="專案調動">專案調動</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <!-- 備註 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              交接備註
            </label>
            <textarea
              v-model="newTransfer.notes"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="描述任務目前狀態、注意事項..."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showTransferModal = false" class="btn-secondary">取消</button>
          <button
            @click="submitTransfer"
            :disabled="!newTransfer.toEmployeeId || !newTransfer.reason"
            :class="[
              'btn-primary bg-orange-500 hover:bg-orange-600',
              (!newTransfer.toEmployeeId || !newTransfer.reason) && 'opacity-50 cursor-not-allowed'
            ]"
          >
            確認轉交
          </button>
        </div>
      </div>
    </div>

    <!-- Phase 2.3: 新增備註 Modal -->
    <div v-if="showNoteModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showNoteModal = false"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            新增備註
          </div>
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              備註內容 <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="newNote.content"
              rows="5"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="輸入備註內容...&#10;&#10;例如：&#10;- 目前進度狀況&#10;- 遇到的問題&#10;- 需要協助的事項"
            ></textarea>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p class="text-sm text-blue-700 dark:text-blue-300">
              <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              備註會保留在任務歷程中，方便團隊成員追蹤。
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showNoteModal = false" class="btn-secondary">取消</button>
          <button
            @click="submitNote"
            :disabled="!newNote.content.trim()"
            :class="[
              'btn-primary',
              !newNote.content.trim() && 'opacity-50 cursor-not-allowed'
            ]"
          >
            儲存備註
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
