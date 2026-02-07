<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useProgressLogStore } from '@/stores/progressLogs'
import { useNoteStore } from '@/stores/notes'
import { useEmployeeStore } from '@/stores/employees'
import type { PoolTask, GitLabIssue, TaskNote } from 'shared/types'
import type { ProgressLog, UserRole } from 'shared/types'
import { getStatusLabel, getStatusClass, getRoleBadgeClass } from '@/composables/useStatusUtils'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

// ============================================
// 任務詳情頁 - 含進度歷程 Timeline
// ============================================

const { showSuccess, showWarning, showInfo } = useToast()
const { showConfirm } = useConfirm()

const taskStore = useTaskStore()
const progressLogStore = useProgressLogStore()
const noteStore = useNoteStore()
const employeeStore = useEmployeeStore()

const route = useRoute()
const router = useRouter()

const task = ref<PoolTask | null>(null)
const progressLogs = ref<ProgressLog[]>([])
const taskNotes = ref<TaskNote[]>([])
const showAssignModal = ref(false)
const showProgressModal = ref(false)
const showLinkGitLabModal = ref(false)
const showNoteModal = ref(false)
const gitlabIssueUrl = ref('')
const newNoteContent = ref('')

// 模擬當前登入者（用於權限判斷）
const currentUser = {
  id: 'emp-7',
  name: '吳建國',
  userRole: 'PRODUCER' as UserRole,
}

// 檢查是否有新增註記權限（PM、製作人、部門主管）
const canAddNote = computed(() => {
  return ['PM', 'PRODUCER', 'MANAGER'].includes(currentUser.userRole)
})

// 新進度回報表單
const newProgress = ref({
  percentage: 0,
  notes: '',
})

onMounted(() => {
  const taskId = route.params.id as string
  task.value = taskStore.getPoolTaskById(taskId) || null
  progressLogs.value = progressLogStore.byTaskId(taskId)
  taskNotes.value = noteStore.byTaskId(taskId)
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
  showSuccess('認領任務成功！')
}

// 退回任務
const returnTask = async (): Promise<void> => {
  const confirmed = await showConfirm({
    title: '退回任務',
    message: '確定要退回此任務嗎？',
    type: 'warning',
    confirmText: '退回',
  })
  if (confirmed) {
    showSuccess('已退回任務')
  }
}

// 提交進度
const submitProgress = (): void => {
  showSuccess(`已提交進度：${newProgress.value.percentage}%`)
  showProgressModal.value = false
  newProgress.value = { percentage: task.value?.progress || 0, notes: '' }
}

// 指派任務
const assignTask = (employeeId: string): void => {
  const employee = employeeStore.getEmployeeById(employeeId)
  showSuccess(`已指派給：${employee?.name}`)
  showAssignModal.value = false
}

// 編輯任務
const editTask = (): void => {
  router.push(`/task-pool/${task.value?.id}/edit`)
}

// 刪除任務
const deleteTask = async (): Promise<void> => {
  const confirmed = await showConfirm({
    title: '刪除任務',
    message: '確定要刪除此任務嗎？此操作無法復原。',
    type: 'danger',
    confirmText: '刪除',
  })
  if (confirmed) {
    showSuccess('已刪除任務')
    router.push('/task-pool')
  }
}

// GitLab Issue 相關
const openGitLabIssue = (url: string): void => {
  window.open(url, '_blank')
}

const editGitLabIssue = (): void => {
  showInfo('GitLab Issue 編輯功能即將推出')
}

const linkGitLabIssue = (): void => {
  if (!gitlabIssueUrl.value.trim()) {
    showWarning('請輸入 GitLab Issue URL')
    return
  }

  // 模擬關聯 Issue（僅原型展示）
  const mockIssue: GitLabIssue = {
    id: Math.floor(Math.random() * 1000),
    title: '新關聯的 GitLab Issue',
    url: gitlabIssueUrl.value.trim(),
    state: 'opened',
  }

  if (task.value) {
    task.value = { ...task.value, gitlabIssue: mockIssue }
  }

  showLinkGitLabModal.value = false
  gitlabIssueUrl.value = ''

  showSuccess('已關聯 GitLab Issue')
}

// 新增註記
const submitNote = (): void => {
  if (!newNoteContent.value.trim()) {
    showWarning('請輸入註記內容')
    return
  }

  // 模擬新增註記
  const newNote: TaskNote = {
    id: `note-${Date.now()}`,
    taskId: task.value?.id || '',
    content: newNoteContent.value.trim(),
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorRole: currentUser.userRole,
    createdAt: new Date().toISOString(),
  }

  // 加入到列表開頭
  taskNotes.value = [newNote, ...taskNotes.value]

  showNoteModal.value = false
  newNoteContent.value = ''

  showSuccess('已新增註記')
}

// 取得角色標籤文字（此頁面專用邏輯）
const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'PM':
      return 'PM'
    case 'PRODUCER':
      return '製作人'
    case 'MANAGER':
      return '部門主管'
    default:
      return '同仁'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 返回按鈕 -->
    <button
      class="flex items-center gap-2 transition-colors cursor-pointer"
      style="color: var(--text-secondary)"
      @click="goBack"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
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
                <span
                  class="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                >
                  {{ getSourceLabel(task.sourceType) }}
                </span>
                <span
                  :class="[
                    'px-2.5 py-1 text-xs font-medium rounded-full',
                    getStatusClass(task.status),
                  ]"
                >
                  {{ getStatusLabel(task.status) }}
                </span>
                <span
                  class="px-2.5 py-1 text-xs font-medium rounded-full"
                  style="background-color: var(--bg-tertiary); color: var(--text-secondary)"
                >
                  {{ task.project?.name }}
                </span>
              </div>

              <!-- 標題 -->
              <h1 class="text-2xl font-bold" style="color: var(--text-primary)">
                {{ task.title }}
              </h1>

              <!-- 描述 -->
              <p class="mt-3" style="color: var(--text-secondary)">
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
                    style="color: var(--bg-tertiary)"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    style="color: var(--accent-primary)"
                    :stroke-dasharray="251.2"
                    :stroke-dashoffset="251.2 - (251.2 * task.progress) / 100"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xl font-bold" style="color: var(--text-primary)"
                    >{{ task.progress }}%</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div
            class="flex flex-wrap gap-3 mt-6 pt-6"
            style="border-top: 1px solid var(--border-primary)"
          >
            <button v-if="task.status === 'UNCLAIMED'" class="btn-primary" @click="claimTask">
              認領任務
            </button>
            <button v-if="task.assigneeId" class="btn-primary" @click="showProgressModal = true">
              回報進度
            </button>
            <button
              v-if="task.assigneeId && task.status !== 'DONE'"
              class="btn-secondary"
              @click="returnTask"
            >
              退回任務
            </button>
            <button class="btn-secondary" @click="showAssignModal = true">指派任務</button>
            <button v-if="task.canEdit" class="btn-ghost" @click="editTask">編輯</button>
            <button v-if="task.canDelete" class="btn-danger" @click="deleteTask">刪除</button>
          </div>
        </div>

        <!-- 註記區塊 -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold" style="color: var(--text-primary)">註記</h2>
            <button
              v-if="canAddNote"
              class="btn-secondary text-sm flex items-center gap-1"
              @click="showNoteModal = true"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              新增註記
            </button>
          </div>

          <div v-if="taskNotes.length === 0" class="text-center py-6">
            <svg
              class="w-10 h-10 mx-auto"
              style="color: var(--text-muted)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p class="mt-2 text-sm" style="color: var(--text-secondary)">尚無註記</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="note in taskNotes"
              :key="note.id"
              class="rounded-lg p-4"
              style="background-color: var(--bg-secondary)"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm" style="color: var(--text-primary)">
                    {{ note.authorName }}
                  </span>
                  <span
                    :class="[
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getRoleBadgeClass(note.authorRole),
                    ]"
                  >
                    {{ getRoleLabel(note.authorRole) }}
                  </span>
                </div>
                <span class="text-xs" style="color: var(--text-muted)">
                  {{ formatDateTime(note.createdAt) }}
                </span>
              </div>
              <p class="text-sm" style="color: var(--text-secondary)">
                {{ note.content }}
              </p>
            </div>
          </div>
        </div>

        <!-- 進度歷程 Timeline -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">進度歷程</h2>

          <div v-if="progressLogs.length === 0" class="text-center py-8">
            <svg
              class="w-12 h-12 mx-auto"
              style="color: var(--text-muted)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p class="mt-3" style="color: var(--text-secondary)">尚無進度記錄</p>
          </div>

          <div v-else class="relative">
            <!-- Timeline 線條 -->
            <div
              class="absolute left-4 top-0 bottom-0 w-0.5"
              style="background-color: var(--border-primary)"
            ></div>

            <!-- Timeline 項目 -->
            <div class="space-y-6">
              <div v-for="(log, index) in progressLogs" :key="log.id" class="relative pl-10">
                <!-- Timeline 節點 -->
                <div
                  class="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center"
                  :style="{
                    backgroundColor: index === 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  }"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <!-- 內容 -->
                <div class="rounded-lg p-4" style="background-color: var(--bg-secondary)">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                      <span class="font-semibold" style="color: var(--text-primary)">
                        {{ log.progress }}%
                      </span>
                      <span
                        v-if="getProgressDelta(log, index) > 0"
                        class="text-sm"
                        style="color: #22c55e"
                      >
                        +{{ getProgressDelta(log, index) }}%
                      </span>
                    </div>
                    <span class="text-sm" style="color: var(--text-muted)">
                      {{ formatDateTime(log.reportedAt) }}
                    </span>
                  </div>
                  <p v-if="log.notes" style="color: var(--text-secondary)">
                    {{ log.notes }}
                  </p>
                  <p class="text-sm mt-2" style="color: var(--text-muted)">
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
          <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">任務資訊</h3>

          <dl class="space-y-4">
            <div>
              <dt class="text-sm" style="color: var(--text-muted)">負責人</dt>
              <dd class="mt-1" style="color: var(--text-primary)">
                {{ task.assignee?.name || '尚未指派' }}
              </dd>
            </div>

            <div v-if="task.collaboratorNames?.length">
              <dt class="text-sm" style="color: var(--text-muted)">協作者</dt>
              <dd class="mt-1" style="color: var(--text-primary)">
                {{ task.collaboratorNames.join('、') }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted)">計畫時間</dt>
              <dd class="mt-1" style="color: var(--text-primary)">
                {{ formatDate(task.startDate || '') }} ~ {{ formatDate(task.dueDate || '') }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted)">建立者</dt>
              <dd class="mt-1" style="color: var(--text-primary)">
                {{ task.createdBy.name }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted)">建立時間</dt>
              <dd class="mt-1" style="color: var(--text-primary)">
                {{ formatDate(task.createdAt) }}
              </dd>
            </div>

            <div>
              <dt class="text-sm" style="color: var(--text-muted)">最後更新</dt>
              <dd class="mt-1" style="color: var(--text-primary)">
                {{ formatDate(task.updatedAt) }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- GitLab Issue 資訊 -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <!-- GitLab 圖示 -->
              <svg class="w-5 h-5" style="color: #fc6d26" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 0 0-.336-.405.87.87 0 0 0-.507-.164.865.865 0 0 0-.508.152.861.861 0 0 0-.336.405l-2.2 6.748H7.587L5.387.968a.861.861 0 0 0-.336-.405.87.87 0 0 0-.507-.164.865.865 0 0 0-.508.152.861.861 0 0 0-.336.405L.433 9.507l-.033.086a6.066 6.066 0 0 0 2.012 7.01l.01.008.028.02 4.97 3.722 2.458 1.86 1.497 1.132a1.014 1.014 0 0 0 1.224 0l1.497-1.131 2.458-1.86 4.998-3.743.012-.01a6.068 6.068 0 0 0 2.008-7.008z"
                />
              </svg>
              <h3 class="text-lg font-semibold" style="color: var(--text-primary)">GitLab Issue</h3>
            </div>
          </div>

          <!-- 已關聯 Issue -->
          <div
            v-if="task.gitlabIssue"
            class="rounded-lg p-4"
            style="background-color: var(--bg-secondary)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium" style="color: var(--accent-primary)">
                    #{{ task.gitlabIssue.id }}
                  </span>
                  <span
                    :class="[
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      task.gitlabIssue.state === 'opened'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
                    ]"
                  >
                    {{ task.gitlabIssue.state === 'opened' ? '開啟' : '已關閉' }}
                  </span>
                </div>
                <p class="text-sm font-medium truncate" style="color: var(--text-primary)">
                  {{ task.gitlabIssue.title }}
                </p>
                <p class="text-xs mt-1 truncate" style="color: var(--text-muted)">
                  {{ task.gitlabIssue.url }}
                </p>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="flex gap-2 mt-4">
              <button class="btn-ghost text-sm" @click="editGitLabIssue">編輯</button>
              <button class="btn-primary text-sm" @click="openGitLabIssue(task.gitlabIssue.url)">
                開啟 Issue
              </button>
            </div>
          </div>

          <!-- 尚未關聯 -->
          <div
            v-else
            class="rounded-lg p-4 text-center"
            style="background-color: var(--bg-secondary)"
          >
            <svg
              class="w-10 h-10 mx-auto mb-2"
              style="color: var(--text-muted)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p class="text-sm mb-3" style="color: var(--text-secondary)">尚未關聯 GitLab Issue</p>
            <button class="btn-secondary text-sm" @click="showLinkGitLabModal = true">
              關聯 Issue
            </button>
          </div>
        </div>

        <!-- 最近一次回報摘要 -->
        <div v-if="progressLogs.length > 0" class="card p-6">
          <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">最近回報</h3>
          <div class="rounded-lg p-4" style="background-color: rgba(196, 30, 58, 0.1)">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold" style="color: var(--accent-primary)">
                {{ progressLogs[0].progress }}%
              </span>
              <span class="text-sm" style="color: var(--text-muted)">
                {{ formatDateTime(progressLogs[0].reportedAt) }}
              </span>
            </div>
            <p class="text-sm" style="color: var(--text-secondary)">
              {{ progressLogs[0].notes || '無備註' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 任務不存在 -->
    <div v-else class="card p-12 text-center">
      <svg
        class="w-16 h-16 mx-auto"
        style="color: var(--text-muted)"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="mt-4" style="color: var(--text-secondary)">找不到此任務</p>
      <button class="btn-primary mt-4" @click="goBack">返回任務池</button>
    </div>

    <!-- 進度回報 Modal -->
    <div v-if="showProgressModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showProgressModal = false"></div>
      <div
        class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        style="background-color: var(--bg-primary)"
      >
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">回報進度</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
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
              <span
                class="text-lg font-semibold w-16 text-right"
                style="color: var(--text-primary)"
              >
                {{ newProgress.percentage }}%
              </span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
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
      <div
        class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        style="background-color: var(--bg-primary)"
      >
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">指派任務</h3>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <button
            v-for="employee in employeeStore.employees"
            :key="employee.id"
            class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer text-left"
            style="background-color: transparent"
            @click="assignTask(employee.id)"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              style="background-color: var(--bg-tertiary)"
            >
              <span class="font-semibold" style="color: var(--accent-primary)">
                {{ employee.name.charAt(0) }}
              </span>
            </div>
            <div>
              <p class="font-medium" style="color: var(--text-primary)">{{ employee.name }}</p>
              <p class="text-sm" style="color: var(--text-muted)">{{ employee.email }}</p>
            </div>
          </button>
        </div>

        <div class="flex justify-end mt-6">
          <button class="btn-secondary" @click="showAssignModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 關聯 GitLab Issue Modal -->
    <div v-if="showLinkGitLabModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showLinkGitLabModal = false"></div>
      <div
        class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        style="background-color: var(--bg-primary)"
      >
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">
          關聯 GitLab Issue
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              GitLab Issue URL
            </label>
            <input
              v-model="gitlabIssueUrl"
              type="text"
              class="input-field w-full"
              placeholder="https://gitlab.com/project/issues/123"
            />
            <p class="mt-2 text-xs" style="color: var(--text-muted)">
              請輸入 GitLab Issue 的完整 URL
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button class="btn-secondary" @click="showLinkGitLabModal = false">取消</button>
          <button class="btn-primary" @click="linkGitLabIssue">確認關聯</button>
        </div>
      </div>
    </div>

    <!-- 新增註記 Modal -->
    <div v-if="showNoteModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showNoteModal = false"></div>
      <div
        class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        style="background-color: var(--bg-primary)"
      >
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">新增註記</h3>

        <div class="space-y-4">
          <div
            class="flex items-center gap-2 p-3 rounded-lg"
            style="background-color: var(--bg-secondary)"
          >
            <svg
              class="w-5 h-5"
              style="color: var(--text-muted)"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span class="text-sm" style="color: var(--text-secondary)">
              以 <strong style="color: var(--text-primary)">{{ currentUser.name }}</strong> 身份發表
            </span>
            <span
              :class="[
                'px-2 py-0.5 text-xs font-medium rounded-full ml-auto',
                getRoleBadgeClass(currentUser.userRole),
              ]"
            >
              {{ getRoleLabel(currentUser.userRole) }}
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary)">
              註記內容
            </label>
            <textarea
              v-model="newNoteContent"
              rows="4"
              class="input-field w-full resize-none"
              placeholder="輸入註記內容..."
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button class="btn-secondary" @click="showNoteModal = false">取消</button>
          <button class="btn-primary" @click="submitNote">發表註記</button>
        </div>
      </div>
    </div>
  </div>
</template>
