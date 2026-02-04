<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useProject } from '@/composables/useProject'
import { useFormatDate } from '@/composables/useFormatDate'
import { FUNCTION_OPTIONS } from '@/constants/filterOptions'
import { STATUS_COLORS } from '@/constants/ui'
import { GANTT } from '@/constants/pageSettings'
import Card from '@/components/common/Card.vue'
import Select from '@/components/common/Select.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import {
  mockEmployees,
  mockMilestones,
  getAllMilestones,
  type MilestoneData,
} from '@/mocks/taskPool'
import type { FunctionType, Task, UserRole } from 'shared/types'

// ============================================
// 甘特圖頁面 - 專案時程視覺化 (Placeholder，待整合 Frappe Gantt)
// Ralph Loop 迭代 8: 使用 Composables 和常數
// Ralph Loop 迭代 24: RWD 改進與新元件
// Ralph Loop 迭代 25: 行動裝置體驗優化
// 新增: 員工視角、暫停狀態顯示
// 新增: 點擊任務導航到任務詳情
// ============================================
const router = useRouter()
const taskStore = useTaskStore()
const { getProjectName, getProjectOptions } = useProject()
const { formatShort } = useFormatDate()

// 篩選條件
const selectedProject = ref<string>('ALL')
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')
const selectedEmployee = ref<string>('')  // 員工視角：空值表示「全部員工」

// 里程碑相關
const showMilestoneModal = ref(false)
const milestones = ref<MilestoneData[]>(getAllMilestones())
const newMilestone = ref({
  name: '',
  description: '',
  date: '',
  projectId: '',
  color: '#F59E0B',
})

// 模擬當前登入者（用於權限判斷）
const currentUser = {
  id: 'emp-7',
  name: '吳建國',
  userRole: 'PRODUCER' as UserRole,
}

// 檢查是否有管理里程碑權限（製作人、部門主管）
const canManageMilestones = computed(() => {
  return ['PRODUCER', 'MANAGER'].includes(currentUser.userRole)
})

// 篩選後的里程碑（根據選擇的專案）
const filteredMilestones = computed(() => {
  if (selectedProject.value === 'ALL') {
    return milestones.value
  }
  return milestones.value.filter((ms: MilestoneData) => ms.projectId === selectedProject.value)
})

// 顏色選項
const colorOptions = [
  { value: '#F59E0B', label: '橙色' },
  { value: '#3B82F6', label: '藍色' },
  { value: '#10B981', label: '綠色' },
  { value: '#EF4444', label: '紅色' },
  { value: '#8B5CF6', label: '紫色' },
  { value: '#EC4899', label: '粉色' },
]

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

// 點擊任務導航到任務詳情
const navigateToTask = (taskId: string) => {
  router.push(`/task-pool/${taskId}`)
}

// 計算里程碑在甘特圖中的位置（百分比）
const getMilestonePosition = (milestone: MilestoneData) => {
  const range = dateRange.value.end.getTime() - dateRange.value.start.getTime()
  if (range === 0) return 50

  const msDate = new Date(milestone.date).getTime()
  const position = ((msDate - dateRange.value.start.getTime()) / range) * 100

  return Math.max(0, Math.min(100, position))
}

// 新增里程碑
const submitMilestone = (): void => {
  if (!newMilestone.value.name.trim()) {
    alert('請輸入里程碑名稱')
    return
  }
  if (!newMilestone.value.date) {
    alert('請選擇里程碑日期')
    return
  }
  if (!newMilestone.value.projectId) {
    alert('請選擇專案')
    return
  }

  const milestone: MilestoneData = {
    id: `ms-${Date.now()}`,
    projectId: newMilestone.value.projectId,
    name: newMilestone.value.name.trim(),
    description: newMilestone.value.description.trim() || undefined,
    date: newMilestone.value.date,
    color: newMilestone.value.color,
    createdById: currentUser.id,
    createdByName: currentUser.name,
    createdAt: new Date().toISOString(),
  }

  milestones.value = [...milestones.value, milestone].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  mockMilestones.push(milestone)

  showMilestoneModal.value = false
  newMilestone.value = { name: '', description: '', date: '', projectId: '', color: '#F59E0B' }

  alert(`已新增里程碑: ${milestone.name}\n（此為原型展示，實際功能待後端實作）`)
}

// 刪除里程碑
const deleteMilestone = (msId: string): void => {
  if (!confirm('確定要刪除此里程碑嗎？')) return

  milestones.value = milestones.value.filter((ms: MilestoneData) => ms.id !== msId)
  const index = mockMilestones.findIndex((ms: MilestoneData) => ms.id === msId)
  if (index !== -1) mockMilestones.splice(index, 1)

  alert('已刪除里程碑\n（此為原型展示，實際功能待後端實作）')
}
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
    <Card>
      <!-- 標題列：含里程碑管理按鈕 -->
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div>
            <h3 class="text-lg font-semibold" style="color: var(--text-primary);">任務時程</h3>
            <p class="text-sm" style="color: var(--text-secondary);">{{ formatDate(dateRange.start) }} - {{ formatDate(dateRange.end) }}</p>
          </div>
          <button
            v-if="canManageMilestones"
            class="btn-secondary text-sm flex items-center gap-1"
            @click="showMilestoneModal = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            管理里程碑
          </button>
        </div>
      </template>

      <div v-if="filteredTasks.length > 0" class="space-y-3">
        <!-- 里程碑標記區（日期軸上方） -->
        <div v-if="filteredMilestones.length > 0" class="relative h-10 mb-2 px-4 md:px-12 lg:px-32 xl:px-48">
          <div class="absolute inset-x-4 md:inset-x-12 lg:inset-x-32 xl:inset-x-48 h-full">
            <div
              v-for="milestone in filteredMilestones"
              :key="milestone.id"
              class="absolute top-0 transform -translate-x-1/2 group cursor-pointer"
              :style="{ left: `${getMilestonePosition(milestone)}%` }"
            >
              <!-- 菱形標記 -->
              <div
                class="w-4 h-4 rotate-45 shadow-md"
                :style="{ backgroundColor: milestone.color || '#F59E0B' }"
              ></div>
              <!-- Tooltip -->
              <div class="absolute top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div class="px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap" style="background-color: var(--bg-primary); border: 1px solid var(--border-primary);">
                  <p class="font-semibold" style="color: var(--text-primary);">{{ milestone.name }}</p>
                  <p style="color: var(--text-muted);">{{ milestone.date }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 時間軸標記 (RWD: 迭代 10) -->
        <div class="flex justify-between text-xs mb-4 px-4 md:px-12 lg:px-32 xl:px-48" style="color: var(--text-muted);">
          <span>{{ formatDate(dateRange.start) }}</span>
          <span>{{ formatDate(dateRange.end) }}</span>
        </div>

        <!-- 任務列表 (RWD: 迭代 10, 25 - 行動裝置優化) -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2"
          style="border-color: var(--border-primary);"
          @click="navigateToTask(task.id)"
        >
          <!-- 任務資訊 -->
          <div class="w-full sm:w-32 md:w-40 lg:w-44 sm:flex-shrink-0">
            <p class="font-medium text-sm truncate hover:text-samurai transition-colors" style="color: var(--text-primary);">{{ task.title }}</p>
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

    <!-- 里程碑管理 Modal -->
    <div v-if="showMilestoneModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50" @click="showMilestoneModal = false"></div>
      <div class="relative rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" style="background-color: var(--bg-primary);">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--text-primary);">管理里程碑</h3>

        <!-- 現有里程碑列表 -->
        <div v-if="milestones.length > 0" class="mb-6">
          <h4 class="text-sm font-medium mb-3" style="color: var(--text-secondary);">現有里程碑</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="ms in milestones"
              :key="ms.id"
              class="flex items-center justify-between p-3 rounded-lg"
              style="background-color: var(--bg-secondary);"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rotate-45"
                  :style="{ backgroundColor: ms.color || '#F59E0B' }"
                ></div>
                <div>
                  <p class="font-medium text-sm" style="color: var(--text-primary);">{{ ms.name }}</p>
                  <p class="text-xs" style="color: var(--text-muted);">{{ ms.date }}</p>
                </div>
              </div>
              <button
                class="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                style="color: var(--text-muted);"
                @click="deleteMilestone(ms.id)"
              >
                <svg class="w-4 h-4 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 新增里程碑表單 -->
        <div class="border-t pt-4" style="border-color: var(--border-primary);">
          <h4 class="text-sm font-medium mb-3" style="color: var(--text-secondary);">新增里程碑</h4>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                名稱 <span style="color: var(--accent-primary);">*</span>
              </label>
              <input
                v-model="newMilestone.name"
                type="text"
                class="input-field w-full"
                placeholder="例如：Alpha 測試"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                說明
              </label>
              <input
                v-model="newMilestone.description"
                type="text"
                class="input-field w-full"
                placeholder="選填"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  日期 <span style="color: var(--accent-primary);">*</span>
                </label>
                <input
                  v-model="newMilestone.date"
                  type="date"
                  class="input-field w-full cursor-pointer"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  專案 <span style="color: var(--accent-primary);">*</span>
                </label>
                <select v-model="newMilestone.projectId" class="input-field w-full cursor-pointer">
                  <option value="">請選擇</option>
                  <option v-for="proj in projectOptions.filter(p => p.value !== 'ALL')" :key="proj.value" :value="proj.value">
                    {{ proj.label }}
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                顏色
              </label>
              <div class="flex gap-2">
                <button
                  v-for="color in colorOptions"
                  :key="color.value"
                  :class="[
                    'w-8 h-8 rounded-lg cursor-pointer transition-all',
                    newMilestone.color === color.value ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)]' : ''
                  ]"
                  :style="{ backgroundColor: color.value }"
                  @click="newMilestone.color = color.value"
                ></button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button class="btn-secondary" @click="showMilestoneModal = false">關閉</button>
          <button class="btn-primary" @click="submitMilestone">新增里程碑</button>
        </div>
      </div>
    </div>
  </div>
</template>
