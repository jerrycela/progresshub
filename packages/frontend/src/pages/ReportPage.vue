<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { mockProjects, reportTypeLabels } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import Button from '@/components/common/Button.vue'
import Badge from '@/components/common/Badge.vue'
import Modal from '@/components/common/Modal.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import type { Task, ReportType } from 'shared/types'

// ============================================
// 進度回報頁面 - 每日進度回報（含「繼續」快速回報功能）
// Ralph Loop 迭代 7: 改用全域 Toast 通知
// Ralph Loop 迭代 18: RWD 響應式優化
// ============================================
const taskStore = useTaskStore()
const authStore = useAuthStore()
const { showSuccess, showError } = useToast()

// 我的進行中任務
const myInProgressTasks = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return []
  return (taskStore.tasks as Task[]).filter(
    (t: Task) => t.assigneeId === userId && ['CLAIMED', 'IN_PROGRESS'].includes(t.status)
  )
})

// 取得專案
const getProject = (projectId: string) =>
  mockProjects.find(p => p.id === projectId)

// 回報相關狀態
const showReportModal = ref(false)
const reportType = ref<ReportType>('PROGRESS')
const selectedTask = ref<Task | null>(null)
const isReporting = ref(false)

// 進度更新表單
const newProgress = ref(0)
const progressNotes = ref('')
const blockerReason = ref('')

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
    // Mock: 模擬 API 呼叫
    await new Promise(resolve => setTimeout(resolve, 500))
    showSuccess(`已回報「${task.title}」繼續進行中`)
  } catch {
    showError('回報失敗，請稍後再試')
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
      const result = await taskStore.updateTaskProgress(selectedTask.value.id, newProgress.value, progressNotes.value)
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
      const result = await taskStore.updateTaskStatus(selectedTask.value.id, 'BLOCKED')
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
        <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary);">每日進度回報</h1>
        <p class="text-sm md:text-base mt-1" style="color: var(--text-secondary);">{{ today }}</p>
      </div>
      <Badge variant="primary" size="md">
        {{ myInProgressTasks.length }} 個任務待回報
      </Badge>
    </div>

    <!-- 使用說明 -->
    <Card class="bg-info/10 border border-info/30">
      <div class="flex gap-3">
        <svg class="w-6 h-6 text-info flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm" style="color: var(--text-primary);">
          <p class="font-medium mb-1">快速回報說明</p>
          <ul class="list-disc list-inside space-y-1" style="color: var(--text-secondary);">
            <li><strong>繼續</strong> - 一鍵回報，延續昨天的工作（進度不變）</li>
            <li><strong>更新</strong> - 有實際進展時，更新進度百分比</li>
            <li><strong>卡關</strong> - 遇到問題需要協助時回報</li>
            <li><strong>完成</strong> - 任務已完成，進度設為 100%</li>
          </ul>
        </div>
      </div>
    </Card>

    <!-- 任務列表 -->
    <div v-if="myInProgressTasks.length > 0" class="space-y-4">
      <Card
        v-for="task in myInProgressTasks"
        :key="task.id"
        hoverable
      >
        <div class="space-y-4">
          <!-- 任務資訊 -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold" style="color: var(--text-primary);">{{ task.title }}</h3>
              <p class="text-sm mt-0.5" style="color: var(--text-tertiary);">
                {{ getProject(task.projectId)?.name }}
              </p>
            </div>
            <Badge
              :variant="task.status === 'BLOCKED' ? 'danger' : 'primary'"
              size="sm"
              dot
            >
              {{ task.status === 'BLOCKED' ? '卡關中' : '進行中' }}
            </Badge>
          </div>

          <!-- 進度條 -->
          <ProgressBar :value="task.progress" size="md">
            <template #label>
              <span class="text-sm" style="color: var(--text-secondary);">目前進度</span>
            </template>
          </ProgressBar>

          <!-- 截止日期 -->
          <div class="flex items-center text-sm" style="color: var(--text-tertiary);">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            截止日期：{{ task.dueDate || '未設定' }}
          </div>

          <!-- 快速回報按鈕 -->
          <div class="flex flex-wrap gap-2 pt-3 border-t" style="border-color: var(--border-primary);">
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
              @click="openReportModal(task, 'PROGRESS')"
            >
              更新進度
            </Button>
            <Button
              variant="warning"
              size="sm"
              @click="openReportModal(task, 'BLOCKED')"
            >
              卡關
            </Button>
            <Button
              variant="success"
              size="sm"
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
      <svg class="w-16 h-16 mx-auto mb-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium mb-1" style="color: var(--text-primary);">太棒了！目前沒有待回報的任務</h3>
      <p style="color: var(--text-tertiary);">您可以前往需求池認領新任務</p>
      <RouterLink
        to="/backlog"
        class="inline-block mt-4"
      >
        <Button variant="primary">前往需求池</Button>
      </RouterLink>
    </Card>

    <!-- 回報對話框 -->
    <Modal v-model="showReportModal" :title="reportTypeLabels[reportType]" size="md">
      <div v-if="selectedTask" class="space-y-4">
        <!-- 任務資訊 -->
        <div class="p-4 rounded-lg" style="background-color: var(--bg-tertiary);">
          <h4 class="font-semibold" style="color: var(--text-primary);">{{ selectedTask.title }}</h4>
          <p class="text-sm mt-1" style="color: var(--text-tertiary);">目前進度：{{ selectedTask.progress }}%</p>
        </div>

        <!-- 進度更新表單 -->
        <div v-if="reportType === 'PROGRESS'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">新進度</label>
            <div class="flex items-center gap-4">
              <input
                v-model.number="newProgress"
                type="range"
                min="0"
                max="100"
                class="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-samurai"
                style="background-color: var(--bg-tertiary);"
              >
              <span class="w-16 text-center font-semibold" style="color: var(--text-primary);">{{ newProgress }}%</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">備註說明</label>
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
            <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">卡關原因</label>
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
          <svg class="w-16 h-16 mx-auto mb-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style="color: var(--text-secondary);">確定要將此任務標記為完成嗎？</p>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="showReportModal = false">
          取消
        </Button>
        <Button
          :variant="reportType === 'BLOCKED' ? 'warning' : reportType === 'COMPLETE' ? 'success' : 'primary'"
          :loading="isReporting"
          @click="submitReport"
        >
          確認{{ reportTypeLabels[reportType] }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
