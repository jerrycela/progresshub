<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useProject } from '@/composables/useProject'
import { useFormatDate } from '@/composables/useFormatDate'
import { FUNCTION_OPTIONS } from '@/constants/filterOptions'
import { STATUS_COLORS } from '@/constants/ui'
import { GANTT } from '@/constants/pageSettings'
import Card from '@/components/common/Card.vue'
import Select from '@/components/common/Select.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { mockEmployees } from '@/mocks/taskPool'
import type { FunctionType, Task } from 'shared/types'

// ============================================
// 甘特圖頁面 - 專案時程視覺化 (Placeholder，待整合 Frappe Gantt)
// Ralph Loop 迭代 8: 使用 Composables 和常數
// Ralph Loop 迭代 24: RWD 改進與新元件
// Ralph Loop 迭代 25: 行動裝置體驗優化
// 新增: 員工視角、暫停狀態顯示
// ============================================
const taskStore = useTaskStore()
const { getProjectName, getProjectOptions } = useProject()
const { formatShort } = useFormatDate()

// 篩選條件
const selectedProject = ref<string>('ALL')
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')
const selectedEmployee = ref<string>('')  // 員工視角：空值表示「全部員工」

// 員工選項（使用 taskPool 的 mockEmployees）
const employeeOptions = computed(() => [
  { value: '', label: '全部員工' },
  ...mockEmployees.map((emp) => ({
    value: emp.id,
    label: emp.name,
  })),
])

// 篩選後的任務
const filteredTasks = computed(() => {
  let tasks = taskStore.tasks as Task[]

  // 專案篩選
  if (selectedProject.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.projectId === selectedProject.value)
  }

  // 職能篩選
  if (selectedFunction.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.functionTags.includes(selectedFunction.value as FunctionType))
  }

  // 員工篩選（員工視角）
  if (selectedEmployee.value) {
    tasks = tasks.filter((t: Task) => t.assigneeId === selectedEmployee.value)
    // 員工視角：顯示所有狀態（包含已完成），讓主管看到完整工作歷程
    // 不過濾已完成任務
  }

  // 篩選有日期的任務，並依開始日期排序
  return tasks
    .filter((t: Task) => t.startDate && t.dueDate)
    .sort((a: Task, b: Task) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
})

// 使用常數和 composable
const projectOptions = computed(() => getProjectOptions(true))
const functionOptions = FUNCTION_OPTIONS
const statusColors = STATUS_COLORS

// 計算甘特圖時間範圍
const dateRange = computed(() => {
  const tasks = filteredTasks.value
  if (tasks.length === 0) return { start: new Date(), end: new Date() }

  const dates = tasks.flatMap((t: Task) => [new Date(t.startDate!), new Date(t.dueDate!)])
  return {
    start: new Date(Math.min(...dates.map((d: Date) => d.getTime()))),
    end: new Date(Math.max(...dates.map((d: Date) => d.getTime()))),
  }
})

// 計算任務在甘特圖中的位置（百分比）
const getTaskPosition = (task: { startDate?: string; dueDate?: string }) => {
  if (!task.startDate || !task.dueDate) return { left: 0, width: 0 }

  const range = dateRange.value.end.getTime() - dateRange.value.start.getTime()
  if (range === 0) return { left: 0, width: 100 }

  const taskStart = new Date(task.startDate).getTime()
  const taskEnd = new Date(task.dueDate).getTime()

  const left = ((taskStart - dateRange.value.start.getTime()) / range) * 100
  const width = ((taskEnd - taskStart) / range) * 100

  return { left: Math.max(0, left), width: Math.max(GANTT.MIN_BAR_WIDTH, width) }
}

// 格式化日期（用於顯示）
const formatDate = (date: Date) => formatShort(date.toISOString())
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 (RWD: 迭代 24) -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary);">甘特圖</h1>
      <p class="text-sm md:text-base mt-1" style="color: var(--text-secondary);">專案時程視覺化總覽</p>
    </div>

    <!-- 行動裝置提示 (迭代 25) -->
    <div class="md:hidden p-3 rounded-lg text-sm flex items-center gap-2 bg-info/10 border border-info/30" style="color: var(--text-primary);">
      <svg class="w-5 h-5 flex-shrink-0 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span>建議使用桌面裝置獲得更完整的甘特圖體驗</span>
    </div>

    <!-- 篩選器 (RWD: 迭代 24 - 使用 Select 元件) -->
    <Card>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          v-model="selectedProject"
          label="專案篩選"
          :options="projectOptions"
        />
        <Select
          v-model="selectedFunction"
          label="職能篩選"
          :options="functionOptions"
        />
        <Select
          v-model="selectedEmployee"
          label="員工篩選"
          :options="employeeOptions"
        />
      </div>
      <!-- 員工視角提示 -->
      <div v-if="selectedEmployee" class="mt-3 p-2 rounded-lg text-sm bg-info/10 border border-info/20" style="color: var(--text-secondary);">
        <span class="font-medium">💡 員工視角：</span>顯示該員工負責的所有任務（含已完成）
      </div>
    </Card>

    <!-- 甘特圖區域 -->
    <Card title="任務時程" :subtitle="`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`">
      <div v-if="filteredTasks.length > 0" class="space-y-3">
        <!-- 時間軸標記 (RWD: 迭代 10) -->
        <div class="flex justify-between text-xs mb-4 px-4 md:px-12 lg:px-32 xl:px-48" style="color: var(--text-muted);">
          <span>{{ formatDate(dateRange.start) }}</span>
          <span>{{ formatDate(dateRange.end) }}</span>
        </div>

        <!-- 任務列表 (RWD: 迭代 10, 25 - 行動裝置優化) -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b last:border-0"
          style="border-color: var(--border-primary);"
        >
          <!-- 任務資訊 -->
          <div class="w-full sm:w-32 md:w-40 lg:w-44 sm:flex-shrink-0">
            <p class="font-medium text-sm truncate" style="color: var(--text-primary);">{{ task.title }}</p>
            <p class="text-xs" style="color: var(--text-tertiary);">{{ getProjectName(task.projectId) }}</p>
            <!-- 行動裝置顯示日期範圍 (迭代 25) -->
            <p class="text-xs sm:hidden mt-1" style="color: var(--text-muted);">
              {{ formatShort(task.startDate) }} - {{ formatShort(task.dueDate) }}
            </p>
          </div>

          <!-- 甘特條 -->
          <div class="flex-1 h-8 rounded-lg relative" style="background-color: var(--bg-tertiary);">
            <div
              :class="[
                'absolute h-full rounded-lg transition-all duration-200',
                statusColors[task.status],
                // 暫停狀態使用條紋樣式
                task.status === 'PAUSED' ? 'bg-gradient-to-r from-amber-500/40 via-amber-400/20 to-amber-500/40 bg-[length:10px_100%]' : ''
              ]"
              :style="{
                left: `${getTaskPosition(task).left}%`,
                width: `${getTaskPosition(task).width}%`,
              }"
            >
              <div class="flex items-center justify-center h-full px-2 gap-1">
                <!-- 暫停圖示 -->
                <svg v-if="task.status === 'PAUSED'" class="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span :class="['text-xs font-medium truncate', task.status === 'PAUSED' ? 'text-amber-700' : 'text-white']">
                  {{ task.status === 'PAUSED' ? '暫停中' : `${task.progress}%` }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空狀態 (迭代 24: 使用 EmptyState 元件) -->
      <EmptyState
        v-else
        icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        title="目前沒有符合條件的任務"
        description="請調整篩選條件或新增有時程的任務"
      />
    </Card>

    <!-- 圖例 -->
    <Card>
      <div class="flex flex-wrap gap-4">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-ink-muted/30 rounded" />
          <span class="text-sm" style="color: var(--text-secondary);">待認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-info/60 rounded" />
          <span class="text-sm" style="color: var(--text-secondary);">已認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-samurai rounded" />
          <span class="text-sm" style="color: var(--text-secondary);">進行中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-amber-500/60 rounded" />
          <span class="text-sm" style="color: var(--text-secondary);">暫停中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-success rounded" />
          <span class="text-sm" style="color: var(--text-secondary);">已完成</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-danger rounded" />
          <span class="text-sm" style="color: var(--text-secondary);">卡關</span>
        </div>
      </div>
    </Card>

    <!-- 提示：整合 Frappe Gantt -->
    <div class="p-4 rounded-lg text-sm bg-info/10 border border-info/30" style="color: var(--text-primary);">
      <p class="font-medium">開發中提示</p>
      <p class="mt-1" style="color: var(--text-secondary);">
        此為簡化版甘特圖預覽。正式版本將整合 Frappe Gantt 套件，支援拖拽調整、縮放、互動編輯等功能。
      </p>
    </div>
  </div>
</template>
