<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useProgressLogStore } from '@/stores/progressLogs'
import { useNoteStore } from '@/stores/notes'
import { useEmployeeStore } from '@/stores/employees'
import { useAuthStore } from '@/stores/auth'
import type { PoolTask, TaskNote } from 'shared/types'
import type { ProgressLog, UserRole } from 'shared/types'
import { getStatusLabel, getStatusClass, getSourceLabel } from '@/composables/useStatusUtils'
import { useToast } from '@/composables/useToast'
import { useFormatDate } from '@/composables/useFormatDate'
import { useConfirm } from '@/composables/useConfirm'
import ProgressTimeline from '@/components/task/ProgressTimeline.vue'
import GitLabIssueCard from '@/components/task/GitLabIssueCard.vue'
import TaskDetailModals from '@/components/task/TaskDetailModals.vue'
import TaskNotes from '@/components/task/TaskNotes.vue'

// ============================================
// 任務詳情頁 - 含進度歷程 Timeline
// ============================================

const { showSuccess, showWarning, showInfo, showError } = useToast()
const { showConfirm } = useConfirm()
const { formatDate, formatDateTime } = useFormatDate()

const taskStore = useTaskStore()
const progressLogStore = useProgressLogStore()
const noteStore = useNoteStore()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const task = ref<PoolTask | null>(null)
const progressLogs = ref<ProgressLog[]>([])
const taskNotes = ref<TaskNote[]>([])
const showAssignModal = ref(false)
const showProgressModal = ref(false)
const showLinkGitLabModal = ref(false)
const showNoteModal = ref(false)
const gitlabIssueUrl = ref('')
const newNoteContent = ref('')

// 檢查是否有新增註記權限（PM、製作人、部門主管）
const canAddNote = computed(() => {
  return authStore.user ? ['PM', 'PRODUCER', 'MANAGER'].includes(authStore.user.role) : false
})

// 格式化當前使用者（供 modal 使用）
const currentUserForModal = computed(() => ({
  id: authStore.user?.id || '',
  name: authStore.user?.name || '',
  userRole: (authStore.user?.role || 'EMPLOYEE') as UserRole,
}))

// 新進度回報表單
const newProgress = ref({ percentage: 0, notes: '' })

const loadTaskData = async (taskId: string) => {
  isLoading.value = true

  // 先從 store 快取嘗試
  let found = taskStore.getPoolTaskById(taskId) || null

  // 找不到時做 fallback fetch
  if (!found) {
    await taskStore.fetchPoolTasks()
    found = taskStore.getPoolTaskById(taskId) || null
  }

  task.value = found

  if (task.value) {
    newProgress.value = { percentage: task.value.progress, notes: '' }
  }

  // 同時載入進度歷程與備註
  await Promise.all([progressLogStore.fetchByTaskId(taskId), noteStore.fetchByTaskId(taskId)])

  progressLogs.value = progressLogStore.byTaskId(taskId)
  taskNotes.value = noteStore.byTaskId(taskId)

  isLoading.value = false
}

onMounted(() => {
  loadTaskData(route.params.id as string)
})

// 響應路由參數變化（同頁面不同任務間跳轉）
watch(
  () => route.params.id,
  newId => {
    if (newId) {
      loadTaskData(newId as string)
    }
  },
)

const goBack = (): void => {
  router.push('/task-pool')
}
const claimTask = async (): Promise<void> => {
  if (!authStore.user || !task.value) return
  const result = await taskStore.claimTask(task.value.id, authStore.user.id)
  if (result.success) {
    task.value = taskStore.getPoolTaskById(task.value.id) || null
    showSuccess('認領任務成功！')
  } else {
    showWarning(result.error?.message || '認領失敗，請稍後再試')
  }
}
const editTask = (): void => {
  router.push(`/task-pool/${task.value?.id}/edit`)
}

const returnTask = async (): Promise<void> => {
  const confirmed = await showConfirm({
    title: '退回任務',
    message: '確定要退回此任務嗎？',
    type: 'warning',
    confirmText: '退回',
  })
  if (confirmed && task.value) {
    const result = await taskStore.unclaimTask(task.value.id)
    if (result.success) {
      task.value = taskStore.getPoolTaskById(task.value.id) || null
      showSuccess('已退回任務')
    } else {
      showError(result.error?.message || '退回任務失敗')
    }
  }
}

const submitProgress = async (): Promise<void> => {
  if (!task.value) return
  const result = await taskStore.updateTaskProgress(
    task.value.id,
    newProgress.value.percentage,
    newProgress.value.notes,
  )
  if (result.success) {
    task.value = taskStore.getPoolTaskById(task.value.id) || null
    showSuccess(`已提交進度：${newProgress.value.percentage}%`)
  } else {
    showError(result.error?.message || '提交進度失敗')
  }
  showProgressModal.value = false
  newProgress.value = { percentage: task.value?.progress || 0, notes: '' }
}

const assignTask = async (employeeId: string): Promise<void> => {
  if (!task.value) return
  const result = await taskStore.claimTask(task.value.id, employeeId)
  if (result.success) {
    const employee = employeeStore.getEmployeeById(employeeId)
    task.value = taskStore.getPoolTaskById(task.value.id) || null
    showSuccess(`已指派給：${employee?.name}`)
  } else {
    showError(result.error?.message || '指派任務失敗')
  }
  showAssignModal.value = false
}

const deleteTask = async (): Promise<void> => {
  const confirmed = await showConfirm({
    title: '刪除任務',
    message: '確定要刪除此任務嗎？此操作無法復原。',
    type: 'danger',
    confirmText: '刪除',
  })
  if (confirmed && task.value) {
    const result = await taskStore.deleteTask(task.value.id)
    if (result.success) {
      showSuccess('已刪除任務')
      router.push('/task-pool')
    } else {
      showError(result.error?.message || '刪除任務失敗')
    }
  }
}

const openGitLabIssue = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer')
}
const editGitLabIssue = (): void => {
  showInfo('GitLab Issue 編輯功能即將推出')
}

const linkGitLabIssue = (): void => {
  showInfo('GitLab 整合尚未啟用')
}

const submitNote = async (): Promise<void> => {
  if (!newNoteContent.value.trim()) {
    showWarning('請輸入註記內容')
    return
  }
  if (!authStore.user || !task.value) return
  const result = await noteStore.addNote({
    taskId: task.value.id,
    content: newNoteContent.value.trim(),
    authorId: authStore.user.id,
    authorName: authStore.user.name,
    authorRole: authStore.user.role,
  })
  if (result.success && result.data) {
    taskNotes.value = [result.data, ...taskNotes.value]
    showSuccess('已新增註記')
  } else {
    showError(result.error?.message || '新增註記失敗')
  }
  showNoteModal.value = false
  newNoteContent.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- 返回按鈕 -->
    <button
      class="flex items-center gap-2 transition-colors cursor-pointer text-secondary"
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

    <!-- 載入中 -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2"
        style="border-color: var(--accent-primary)"
      ></div>
    </div>

    <div v-else-if="task" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左側：任務詳情 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 任務基本資訊 -->
        <div class="card p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
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
                  class="px-2.5 py-1 text-xs font-medium rounded-full bg-elevated text-secondary"
                >
                  {{ task.project?.name }}
                </span>
              </div>
              <h1 class="text-2xl font-bold text-primary">{{ task.title }}</h1>
              <p class="mt-3 text-secondary">{{ task.description }}</p>
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
                    class="text-[var(--bg-tertiary)]"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    stroke-width="8"
                    fill="none"
                    class="text-accent-primary"
                    :stroke-dasharray="251.2"
                    :stroke-dashoffset="251.2 - (251.2 * task.progress) / 100"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xl font-bold text-primary">{{ task.progress }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="flex flex-wrap gap-3 mt-6 pt-6 border-t border-theme">
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
        <TaskNotes
          :task-notes="taskNotes"
          :can-add-note="canAddNote"
          @add-note="showNoteModal = true"
        />

        <!-- 進度歷程 Timeline -->
        <ProgressTimeline :progress-logs="progressLogs" />
      </div>

      <!-- 右側：任務資訊 -->
      <div class="space-y-6">
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-primary">任務資訊</h3>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-muted">負責人</dt>
              <dd class="mt-1 text-primary">{{ task.assignee?.name || '尚未指派' }}</dd>
            </div>
            <div v-if="task.collaboratorNames?.length">
              <dt class="text-sm text-muted">協作者</dt>
              <dd class="mt-1 text-primary">{{ task.collaboratorNames.join('、') }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">計畫時間</dt>
              <dd class="mt-1 text-primary">
                {{ formatDate(task.startDate || '') }} ~ {{ formatDate(task.dueDate || '') }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-muted">建立者</dt>
              <dd class="mt-1 text-primary">{{ task.createdBy?.name || '未知' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">建立時間</dt>
              <dd class="mt-1 text-primary">{{ formatDate(task.createdAt) }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">最後更新</dt>
              <dd class="mt-1 text-primary">{{ formatDate(task.updatedAt) }}</dd>
            </div>
          </dl>
        </div>

        <!-- GitLab Issue 資訊 -->
        <GitLabIssueCard
          :gitlab-issue="task.gitlabIssue"
          @link="showLinkGitLabModal = true"
          @edit="editGitLabIssue"
          @open="openGitLabIssue"
        />

        <!-- 最近一次回報摘要 -->
        <div v-if="progressLogs.length > 0" class="card p-6">
          <h3 class="text-lg font-semibold mb-4 text-primary">最近回報</h3>
          <div class="rounded-lg p-4 bg-rose-500/10">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-accent-primary">{{ progressLogs[0].progress }}%</span>
              <span class="text-sm text-muted">{{
                formatDateTime(progressLogs[0].reportedAt)
              }}</span>
            </div>
            <p class="text-sm text-secondary">{{ progressLogs[0].notes || '無備註' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 任務不存在 -->
    <div v-else-if="!isLoading" class="card p-12 text-center">
      <svg
        class="w-16 h-16 mx-auto text-muted"
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
      <p class="mt-4 text-secondary">找不到此任務</p>
      <button class="btn-primary mt-4" @click="goBack">返回任務池</button>
    </div>

    <!-- Modal 集合 -->
    <TaskDetailModals
      v-model:show-progress-modal="showProgressModal"
      v-model:show-assign-modal="showAssignModal"
      v-model:show-git-lab-modal="showLinkGitLabModal"
      v-model:show-note-modal="showNoteModal"
      v-model:new-progress="newProgress"
      v-model:gitlab-url="gitlabIssueUrl"
      v-model:new-note-content="newNoteContent"
      :employees="employeeStore.employees"
      :current-user="currentUserForModal"
      @submit-progress="submitProgress"
      @assign-task="assignTask"
      @link-git-lab="linkGitLabIssue"
      @submit-note="submitNote"
    />
  </div>
</template>
