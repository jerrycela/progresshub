<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { mockProjects } from '@/mocks/data'
import Card from '@/components/common/Card.vue'
import type { FunctionType, Task } from 'shared/types'

// 甘特圖頁面 - 專案時程視覺化 (Placeholder，待整合 Frappe Gantt)
const taskStore = useTaskStore()

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

// 專案選項
const projectOptions = computed(() => [
  { value: 'ALL', label: '全部專案' },
  ...mockProjects.map(p => ({ value: p.id, label: p.name })),
])

// 職能選項
const functionOptions = [
  { value: 'ALL', label: '全部職能' },
  { value: 'PLANNING', label: '企劃' },
  { value: 'PROGRAMMING', label: '程式' },
  { value: 'ART', label: '美術' },
  { value: 'ANIMATION', label: '動態' },
  { value: 'SOUND', label: '音效' },
  { value: 'VFX', label: '特效' },
  { value: 'COMBAT', label: '戰鬥' },
]

// 任務狀態顏色
const statusColors: Record<string, string> = {
  UNCLAIMED: 'bg-gray-300',
  CLAIMED: 'bg-secondary',
  IN_PROGRESS: 'bg-primary-600',
  DONE: 'bg-success',
  BLOCKED: 'bg-danger',
}

// 取得專案名稱
const getProjectName = (projectId: string) =>
  mockProjects.find(p => p.id === projectId)?.name || '未知專案'

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

  return { left: Math.max(0, left), width: Math.max(5, width) }
}

// 格式化日期
const formatDate = (date: Date) =>
  date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">甘特圖</h1>
      <p class="text-gray-500 mt-1">專案時程視覺化總覽</p>
    </div>

    <!-- 篩選器 -->
    <Card>
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">專案篩選</label>
          <select
            v-model="selectedProject"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option v-for="opt in projectOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">職能篩選</label>
          <select
            v-model="selectedFunction"
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
          >
            <option v-for="opt in functionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </Card>

    <!-- 甘特圖區域 -->
    <Card title="任務時程" :subtitle="`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`">
      <div v-if="filteredTasks.length > 0" class="space-y-3">
        <!-- 時間軸標記 -->
        <div class="flex justify-between text-xs text-gray-400 mb-4 px-48">
          <span>{{ formatDate(dateRange.start) }}</span>
          <span>{{ formatDate(dateRange.end) }}</span>
        </div>

        <!-- 任務列表 -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
        >
          <!-- 任務資訊 -->
          <div class="w-44 flex-shrink-0">
            <p class="font-medium text-gray-900 text-sm truncate">{{ task.title }}</p>
            <p class="text-xs text-gray-500">{{ getProjectName(task.projectId) }}</p>
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

      <!-- 空狀態 -->
      <div v-else class="text-center py-12 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>目前沒有符合條件的任務</p>
      </div>
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
