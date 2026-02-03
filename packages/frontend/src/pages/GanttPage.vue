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
import type { FunctionType, Task } from 'shared/types'

// ============================================
// 甘特圖頁面 - 專案時程視覺化 (Placeholder，待整合 Frappe Gantt)
// Ralph Loop 迭代 8: 使用 Composables 和常數
// Ralph Loop 迭代 24: RWD 改進與新元件
// Ralph Loop 迭代 25: 行動裝置體驗優化
// ============================================
const taskStore = useTaskStore()
const { getProjectName, getProjectOptions } = useProject()
const { formatShort } = useFormatDate()

// 篩選條件
const selectedProject = ref<string>('ALL')
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')

// 篩選後的任務
const filteredTasks = computed(() => {
  let tasks = taskStore.tasks as Task[]

  if (selectedProject.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.projectId === selectedProject.value)
  }

  if (selectedFunction.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.functionTags.includes(selectedFunction.value as FunctionType))
  }

  return tasks.filter((t: Task) => t.startDate && t.dueDate)
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
      <h1 class="text-xl md:text-2xl font-bold text-gray-900">甘特圖</h1>
      <p class="text-sm md:text-base text-gray-500 mt-1">專案時程視覺化總覽</p>
    </div>

    <!-- 行動裝置提示 (迭代 25) -->
    <div class="md:hidden p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm flex items-center gap-2">
      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span>建議使用桌面裝置獲得更完整的甘特圖體驗</span>
    </div>

    <!-- 篩選器 (RWD: 迭代 24 - 使用 Select 元件) -->
    <Card>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>
    </Card>

    <!-- 甘特圖區域 -->
    <Card title="任務時程" :subtitle="`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`">
      <div v-if="filteredTasks.length > 0" class="space-y-3">
        <!-- 時間軸標記 (RWD: 迭代 10) -->
        <div class="flex justify-between text-xs text-gray-400 mb-4 px-4 md:px-12 lg:px-32 xl:px-48">
          <span>{{ formatDate(dateRange.start) }}</span>
          <span>{{ formatDate(dateRange.end) }}</span>
        </div>

        <!-- 任務列表 (RWD: 迭代 10, 25 - 行動裝置優化) -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-gray-100 last:border-0"
        >
          <!-- 任務資訊 -->
          <div class="w-full sm:w-32 md:w-40 lg:w-44 sm:flex-shrink-0">
            <p class="font-medium text-gray-900 text-sm truncate">{{ task.title }}</p>
            <p class="text-xs text-gray-500">{{ getProjectName(task.projectId) }}</p>
            <!-- 行動裝置顯示日期範圍 (迭代 25) -->
            <p class="text-xs text-gray-400 sm:hidden mt-1">
              {{ formatShort(task.startDate) }} - {{ formatShort(task.dueDate) }}
            </p>
          </div>

          <!-- 甘特條 -->
          <div class="flex-1 h-8 bg-gray-100 rounded-lg relative">
            <div
              :class="['absolute h-full rounded-lg transition-all duration-200', statusColors[task.status]]"
              :style="{
                left: `${getTaskPosition(task).left}%`,
                width: `${getTaskPosition(task).width}%`,
              }"
            >
              <div class="flex items-center justify-center h-full px-2">
                <span class="text-xs text-white font-medium truncate">
                  {{ task.progress }}%
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
          <div class="w-4 h-4 bg-gray-300 rounded" />
          <span class="text-sm text-gray-600">待認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-secondary rounded" />
          <span class="text-sm text-gray-600">已認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-primary-600 rounded" />
          <span class="text-sm text-gray-600">進行中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-success rounded" />
          <span class="text-sm text-gray-600">已完成</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-danger rounded" />
          <span class="text-sm text-gray-600">卡關</span>
        </div>
      </div>
    </Card>

    <!-- 提示：整合 Frappe Gantt -->
    <div class="p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm">
      <p class="font-medium">開發中提示</p>
      <p class="mt-1">
        此為簡化版甘特圖預覽。正式版本將整合 Frappe Gantt 套件，支援拖拽調整、縮放、互動編輯等功能。
      </p>
    </div>
  </div>
</template>
