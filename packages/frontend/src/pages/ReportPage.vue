<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useProjectStore } from '@/stores/projects'
import { reportTypeLabels } from '@/constants/labels'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import Select from '@/components/common/Select.vue'
import type { Task, ReportType } from 'shared/types'

// ============================================
// 進度回報頁面 - 每日進度回報（含「繼續」快速回報功能）
// Ralph Loop 迭代 7: 改用全域 Toast 通知
// Ralph Loop 迭代 18: RWD 響應式優化
// 新增: 暫停/繼續功能
// ============================================
const taskStore = useTaskStore()
const authStore = useAuthStore()
const { showSuccess, showError } = useToast()

// 暫停原因選項
const pauseReasonOptions = [
  { value: 'OTHER_PROJECT', label: '被插件至其他專案' },
  { value: 'WAITING_RESOURCE', label: '等待外部資源' },
  { value: 'WAITING_TASK', label: '等待其他任務完成' },
  { value: 'OTHER', label: '其他' },
]

// 我的進行中任務（包含暫停中的任務）
const myInProgressTasks = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return []
  return (taskStore.tasks as Task[]).filter(
    (t: Task) => t.assigneeId === userId && ['CLAIMED', 'IN_PROGRESS', 'PAUSED'].includes(t.status),
  )
})

const projectStore = useProjectStore()

// 取得專案
const getProject = (projectId: string) => projectStore.getProjectById(projectId)

// 回報相關狀態
const showReportModal = ref(false)
const reportType = ref<ReportType>('PROGRESS')
const selectedTask = ref<Task | null>(null)
const isReporting = ref(false)

// 進度更新表單
const newProgress = ref(0)
const progressNotes = ref('')
const blockerReason = ref('')

// 暫停相關狀態
const showPauseModal = ref(false)
const pauseReason = ref('OTHER_PROJECT')
const pauseNote = ref('')

// 開啟回報對話框
const openReportModal = (task: Task, type: ReportType) => {
  selectedTask.value = task
  reportType.value = type
  newProgress.value = task.progress
  progressNotes.value = ''
  blockerReason.value = ''

  if (type === 'CONTINUE') {
    // 「繼續」功能：直接送出，不需要開對話框
    submitContinue(task)
  } else {
    showReportModal.value = true
  }
}

// 快速「繼續」回報
const submitContinue = async (task: Task) => {
  isReporting.value = true
  try {
    // 如果任務是暫停狀態，恢復為進行中
    if (task.status === 'PAUSED') {
      const result = await taskStore.updateTaskStatus(task.id, 'IN_PROGRESS')
      if (!result.success) {
        showError(result.error?.message || '恢復任務失敗')
        return
      }
    }

    showSuccess(`已回報「${task.title}」繼續進行中`)
  } catch {
    showError('回報失敗，請稍後再試')
  } finally {
    isReporting.value = false
  }
}

// 開啟暫停對話框
const openPauseModal = (task: Task) => {
  selectedTask.value = task
  pauseReason.value = 'OTHER_PROJECT'
  pauseNote.value = ''
  showPauseModal.value = true
}

// 提交暫停
const submitPause = async () => {
  if (!selectedTask.value) return

  isReporting.value = true
  try {
    // 更新任務狀態為暫停
    const pauseReasonLabel =
      pauseReasonOptions.find(opt => opt.value === pauseReason.value)?.label ?? pauseReason.value
    const result = await taskStore.updateTaskStatus(selectedTask.value.id, 'PAUSED', {
      pauseReason: pauseReasonLabel,
      pauseNote: pauseNote.value || undefined,
    })
    if (!result.success) {
      showError(result.error?.message || '暫停任務失敗')
      return
    }

    showPauseModal.value = false
    showSuccess(`已暫停「${selectedTask.value.title}」`)
  } catch {
    showError('暫停任務失敗，請稍後再試')
  } finally {
    isReporting.value = false
  }
}

// 提交回報
const submitReport = async () => {
  if (!selectedTask.value) return

  isReporting.value = true
  try {
    // 根據回報類型處理
    if (reportType.value === 'PROGRESS') {
      const result = await taskStore.updateTaskProgress(
        selectedTask.value.id,
        newProgress.value,
        progressNotes.value,
      )
      if (!result.success) {
        showError(result.error?.message || '更新進度失敗')
        return
      }
    } else if (reportType.value === 'COMPLETE') {
      const result = await taskStore.updateTaskProgress(selectedTask.value.id, 100)
      if (!result.success) {
        showError(result.error?.message || '完成任務失敗')
        return
      }
    } else if (reportType.value === 'BLOCKED') {
      const result = await taskStore.updateTaskStatus(selectedTask.value.id, 'BLOCKED', {
        blockerReason: blockerReason.value || undefined,
      })
      if (!result.success) {
        showError(result.error?.message || '回報卡關失敗')
        return
      }
    }

    // 關閉對話框
    showReportModal.value = false

    // 顯示成功訊息
    const labels: Record<ReportType, string> = {
      PROGRESS: '進度更新',
      CONTINUE: '繼續進行',
      BLOCKED: '卡關回報',
      COMPLETE: '任務完成',
    }
    showSuccess(`已完成「${selectedTask.value.title}」的${labels[reportType.value]}`)
  } catch {
    showError('操作失敗，請稍後再試')
  } finally {
    isReporting.value = false
  }
}

// 今日日期
const today = new Date().toLocaleDateString('zh-TW', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 18) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-primary">每日進度回報</h1>
        <p class="text-sm md:text-base mt-1 text-secondary">{{ today }}</p>
      </div>
      <Badge variant="primary" size="md"> {{ myInProgressTasks.length }} 個任務待回報 </Badge>
    </div>

    <!-- 使用說明 -->
    <Card class="bg-info/10 border border-info/30">
      <div class="flex gap-3">
        <svg
          class="w-6 h-6 text-info flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="text-sm text-primary">
          <p class="font-medium mb-1">快速回報說明</p>
          <ul class="list-disc list-inside space-y-1 text-secondary">
            <li>
              <strong>繼續</strong> - 一鍵回報，延續昨天的工作（進度不變）；若任務暫停中則恢復進行
            </li>
            <li><strong>更新</strong> - 有實際進展時，更新進度百分比</li>
            <li><strong>暫停</strong> - 被插件打斷時，暫停任務並記錄原因</li>
            <li><strong>卡關</strong> - 遇到問題需要協助時回報</li>
            <li><strong>完成</strong> - 任務已完成，進度設為 100%</li>
          </ul>
        </div>
      </div>
    </Card>

    <!-- 任務列表 -->
    <div v-if="myInProgressTasks.length > 0" class="space-y-4">
      <Card v-for="task in myInProgressTasks" :key="task.id" hoverable>
        <div class="space-y-4">
          <!-- 任務資訊 -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-primary">{{ task.title }}</h3>
              <p class="text-sm mt-0.5 text-tertiary">
                {{ getProject(task.projectId)?.name }}
              </p>
              <!-- 暫停資訊 -->
              <div
                v-if="task.status === 'PAUSED' && task.pauseReason"
                class="mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20"
              >
                <p class="text-xs text-amber-600 dark:text-amber-400">
                  <span class="font-medium">暫停原因：</span>{{ task.pauseReason }}
                </p>
                <p
                  v-if="task.pauseNote"
                  class="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5"
                >
                  {{ task.pauseNote }}
                </p>
                <p
                  v-if="task.pausedAt"
                  class="text-xs text-amber-600/60 dark:text-amber-400/60 mt-0.5"
                >
                  暫停時間：{{ new Date(task.pausedAt).toLocaleString('zh-TW') }}
                </p>
              </div>
            </div>
            <Badge
              :variant="
                task.status === 'BLOCKED'
                  ? 'danger'
                  : task.status === 'PAUSED'
                    ? 'paused'
                    : 'primary'
              "
              size="sm"
              dot
            >
              {{
                task.status === 'BLOCKED'
                  ? '卡關中'
                  : task.status === 'PAUSED'
                    ? '暫停中'
                    : '進行中'
              }}
            </Badge>
          </div>

          <!-- 進度條 -->
          <ProgressBar :value="task.progress" size="md">
            <template #label>
              <span class="text-sm text-secondary">目前進度</span>
            </template>
          </ProgressBar>

          <!-- 截止日期 -->
          <div class="flex items-center text-sm text-tertiary">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            截止日期：{{ task.dueDate || '未設定' }}
          </div>

          <!-- 快速回報按鈕 -->
          <div class="flex flex-wrap gap-2 pt-3 border-t border-theme">
            <Button
              variant="info"
              size="sm"
              :loading="isReporting"
              @click="openReportModal(task, 'CONTINUE')"
            >
              繼續
            </Button>
            <Button
              variant="primary"
              size="sm"
              :disabled="task.status === 'PAUSED'"
              @click="openReportModal(task, 'PROGRESS')"
            >
              更新進度
            </Button>
            <!-- 暫停按鈕：只有進行中的任務可以暫停 -->
            <Button
              v-if="task.status !== 'PAUSED'"
              variant="secondary"
              size="sm"
              class="!bg-amber-500/10 !text-amber-600 hover:!bg-amber-500/20 dark:!text-amber-400"
              @click="openPauseModal(task)"
            >
              暫停
            </Button>
            <Button
              variant="warning"
              size="sm"
              :disabled="task.status === 'PAUSED'"
              @click="openReportModal(task, 'BLOCKED')"
            >
              卡關
            </Button>
            <Button
              variant="success"
              size="sm"
              :disabled="task.status === 'PAUSED'"
              @click="openReportModal(task, 'COMPLETE')"
            >
              完成
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- 空狀態 -->
    <Card v-else class="text-center py-12">
      <svg
        class="w-16 h-16 mx-auto mb-4 text-success"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 class="text-lg font-medium mb-1 text-primary">太棒了！目前沒有待回報的任務</h3>
      <p class="text-tertiary">您可以前往需求池認領新任務</p>
      <RouterLink to="/backlog" class="inline-block mt-4">
        <Button variant="primary">前往需求池</Button>
      </RouterLink>
    </Card>

    <!-- 回報對話框 -->
    <Modal v-model="showReportModal" :title="reportTypeLabels[reportType]" size="md">
      <div v-if="selectedTask" class="space-y-4">
        <!-- 任務資訊 -->
        <div class="p-4 rounded-lg bg-elevated">
          <h4 class="font-semibold text-primary">{{ selectedTask.title }}</h4>
          <p class="text-sm mt-1 text-tertiary">目前進度：{{ selectedTask.progress }}%</p>
        </div>

        <!-- 進度更新表單 -->
        <div v-if="reportType === 'PROGRESS'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-secondary">新進度</label>
            <div class="flex items-center gap-4">
              <input
                v-model.number="newProgress"
                type="range"
                min="0"
                max="100"
                class="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-samurai bg-elevated"
              />
              <span class="w-16 text-center font-semibold text-primary">{{ newProgress }}%</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2 text-secondary">備註說明</label>
            <textarea
              v-model="progressNotes"
              rows="3"
              class="input"
              placeholder="描述您今天完成了什麼..."
            />
          </div>
        </div>

        <!-- 卡關表單 -->
        <div v-if="reportType === 'BLOCKED'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-secondary">卡關原因</label>
            <textarea
              v-model="blockerReason"
              rows="3"
              class="input"
              placeholder="描述您遇到的問題..."
            />
          </div>
        </div>

        <!-- 完成確認 -->
        <div v-if="reportType === 'COMPLETE'" class="text-center">
          <svg
            class="w-16 h-16 mx-auto mb-4 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-secondary">確定要將此任務標記為完成嗎？</p>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showReportModal = false"> 取消 </Button>
        <Button
          :variant="
            reportType === 'BLOCKED' ? 'warning' : reportType === 'COMPLETE' ? 'success' : 'primary'
          "
          :loading="isReporting"
          @click="submitReport"
        >
          確認{{ reportTypeLabels[reportType] }}
        </Button>
      </template>
    </Modal>

    <!-- 暫停對話框 -->
    <Modal v-model="showPauseModal" title="暫停任務" size="md">
      <div v-if="selectedTask" class="space-y-4">
        <!-- 任務資訊 -->
        <div class="p-4 rounded-lg bg-elevated">
          <h4 class="font-semibold text-primary">{{ selectedTask.title }}</h4>
          <p class="text-sm mt-1 text-tertiary">目前進度：{{ selectedTask.progress }}%</p>
        </div>

        <!-- 暫停原因選擇 -->
        <div>
          <Select v-model="pauseReason" label="暫停原因" :options="pauseReasonOptions" />
        </div>

        <!-- 暫停說明 -->
        <div>
          <label class="block text-sm font-medium mb-2 text-secondary">說明（選填）</label>
          <textarea
            v-model="pauseNote"
            rows="3"
            class="input"
            placeholder="例如：被拉去支援 Project B"
          />
        </div>

        <!-- 提示訊息 -->
        <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p class="text-sm text-amber-600 dark:text-amber-400">
            暫停後，任務會標記為「暫停中」狀態。您可以隨時點擊「繼續」按鈕恢復任務。
          </p>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showPauseModal = false"> 取消 </Button>
        <Button
          class="!bg-amber-500 hover:!bg-amber-600 !text-white"
          :loading="isReporting"
          @click="submitPause"
        >
          確認暫停
        </Button>
      </template>
    </Modal>
  </div>
</template>
