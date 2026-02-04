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
const selectedStatus = ref<string>('ALL')  // 狀態篩選
const showOverdueOnly = ref(false)  // 只顯示逾期

// 分組與檢視模式
const groupByProject = ref(false)  // 按專案分組
const collapsedProjects = ref<Set<string>>(new Set())  // 已折疊的專案

// 時間刻度模式
type TimeScale = 'day' | 'week' | 'month'
const timeScale = ref<TimeScale>('week')  // 預設週視圖

// 狀態篩選選項
const statusOptions = [
  { value: 'ALL', label: '所有狀態' },
  { value: 'UNCLAIMED', label: '待認領' },
  { value: 'CLAIMED', label: '已認領' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'PAUSED', label: '暫停中' },
  { value: 'DONE', label: '已完成' },
  { value: 'BLOCKED', label: '卡關' },
]

// 時間刻度選項
const timeScaleOptions: Array<{ value: TimeScale; label: string }> = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
]

// 是否有任何篩選條件
const hasFilters = computed(() => {
  return selectedProject.value !== 'ALL' ||
    selectedFunction.value !== 'ALL' ||
    selectedEmployee.value !== '' ||
    selectedStatus.value !== 'ALL' ||
    showOverdueOnly.value
})

// 清除所有篩選
const clearFilters = (): void => {
  selectedProject.value = 'ALL'
  selectedFunction.value = 'ALL'
  selectedEmployee.value = ''
  selectedStatus.value = 'ALL'
  showOverdueOnly.value = false
}

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

// 檢查任務是否逾期
const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === 'DONE') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.dueDate)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

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
  }

  // 狀態篩選
  if (selectedStatus.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.status === selectedStatus.value)
  }

  // 只顯示逾期
  if (showOverdueOnly.value) {
    tasks = tasks.filter((t: Task) => isTaskOverdue(t))
  }

  // 篩選有日期的任務，並依開始日期排序
  return tasks
    .filter((t: Task) => t.startDate && t.dueDate)
    .sort((a: Task, b: Task) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
})

// 快速統計
const taskStats = computed(() => {
  const tasks = filteredTasks.value
  const overdue = tasks.filter((t: Task) => isTaskOverdue(t)).length
  const inProgress = tasks.filter((t: Task) => t.status === 'IN_PROGRESS').length
  const completed = tasks.filter((t: Task) => t.status === 'DONE').length
  const paused = tasks.filter((t: Task) => t.status === 'PAUSED').length
  return { total: tasks.length, overdue, inProgress, completed, paused }
})

// 取得任務負責人名稱
const getAssigneeName = (task: Task): string => {
  if (!task.assigneeId) return '未指派'
  const emp = mockEmployees.find(e => e.id === task.assigneeId)
  return emp?.name || '未知'
}

// 按專案分組的任務
const groupedTasks = computed(() => {
  if (!groupByProject.value) return null

  const groups: Record<string, { projectId: string; projectName: string; tasks: Task[] }> = {}

  filteredTasks.value.forEach((task: Task) => {
    const projectId = task.projectId || 'unassigned'
    if (!groups[projectId]) {
      groups[projectId] = {
        projectId,
        projectName: getProjectName(projectId) || '未指定專案',
        tasks: [],
      }
    }
    groups[projectId].tasks.push(task)
  })

  return Object.values(groups).sort((a, b) => a.projectName.localeCompare(b.projectName))
})

// 切換專案折疊狀態
const toggleProjectCollapse = (projectId: string): void => {
  const newSet = new Set(collapsedProjects.value)
  if (newSet.has(projectId)) {
    newSet.delete(projectId)
  } else {
    newSet.add(projectId)
  }
  collapsedProjects.value = newSet
}

// 檢查專案是否折疊
const isProjectCollapsed = (projectId: string): boolean => {
  return collapsedProjects.value.has(projectId)
}

// 展開所有專案
const expandAllProjects = (): void => {
  collapsedProjects.value = new Set()
}

// 收起所有專案
const collapseAllProjects = (): void => {
  if (!groupedTasks.value) return
  const allProjectIds = groupedTasks.value.map(g => g.projectId)
  collapsedProjects.value = new Set(allProjectIds)
}

// 是否所有專案都已折疊
const allProjectsCollapsed = computed(() => {
  if (!groupedTasks.value || groupedTasks.value.length === 0) return false
  return groupedTasks.value.every(g => collapsedProjects.value.has(g.projectId))
})

// 檢查是否有任務完全在可視範圍外
const tasksOutsideRange = computed(() => {
  const { start, end } = dateRange.value
  const tasks = filteredTasks.value

  let beforeCount = 0 // 在範圍之前結束的任務
  let afterCount = 0  // 在範圍之後開始的任務

  tasks.forEach((task: Task) => {
    if (!task.startDate || !task.dueDate) return
    const taskEnd = new Date(task.dueDate)
    const taskStart = new Date(task.startDate)

    if (taskEnd < start) beforeCount++
    if (taskStart > end) afterCount++
  })

  return { before: beforeCount, after: afterCount, total: beforeCount + afterCount }
})

// 使用常數和 composable
const projectOptions = computed(() => getProjectOptions(true))
const functionOptions = FUNCTION_OPTIONS
const statusColors = STATUS_COLORS

// 時間刻度對應的顯示窗口（天數）
const TIME_SCALE_WINDOWS: Record<TimeScale, { before: number; after: number }> = {
  day: { before: 14, after: 14 },    // ±2 週 = 28 天
  week: { before: 35, after: 35 },   // ±5 週 = 70 天
  month: { before: 60, after: 60 },  // ±2 月 = 120 天
}

// 計算甘特圖時間範圍（時間刻度感知）
const dateRange = computed(() => {
  const tasks = filteredTasks.value
  const msArr = filteredMilestones.value
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 取得當前時間刻度的窗口大小
  const window = TIME_SCALE_WINDOWS[timeScale.value]
  const msPerDay = 24 * 60 * 60 * 1000

  // 計算以今天為中心的理想窗口
  const idealStart = new Date(today.getTime() - window.before * msPerDay)
  const idealEnd = new Date(today.getTime() + window.after * msPerDay)

  // 如果沒有任務和里程碑，返回理想窗口
  if (tasks.length === 0 && msArr.length === 0) {
    return { start: idealStart, end: idealEnd }
  }

  // 收集所有日期
  const taskDates = tasks.flatMap((t: Task) => [new Date(t.startDate!), new Date(t.dueDate!)])
  const msDates = msArr.map((ms: MilestoneData) => new Date(ms.date))
  const allDates = [...taskDates, ...msDates]

  const dataMin = new Date(Math.min(...allDates.map((d: Date) => d.getTime())))
  const dataMax = new Date(Math.max(...allDates.map((d: Date) => d.getTime())))

  // 智慧範圍選擇：
  // 1. 如果數據範圍在理想窗口內，使用理想窗口（確保時間刻度有意義）
  // 2. 如果數據範圍超出理想窗口，擴展以包含所有數據
  // 3. 永遠確保今天在範圍內
  let start = new Date(Math.min(idealStart.getTime(), dataMin.getTime()))
  let end = new Date(Math.max(idealEnd.getTime(), dataMax.getTime()))

  // 加緩衝（3 天或範圍的 5%，取較大者）
  const range = end.getTime() - start.getTime()
  const buffer = Math.max(3 * msPerDay, range * 0.05)
  start = new Date(start.getTime() - buffer)
  end = new Date(end.getTime() + buffer)

  return { start, end }
})

// 今天的位置（百分比）
const todayPosition = computed(() => {
  const range = dateRange.value.end.getTime() - dateRange.value.start.getTime()
  if (range === 0) return 50

  const today = new Date().getTime()
  const position = ((today - dateRange.value.start.getTime()) / range) * 100

  return Math.max(0, Math.min(100, position))
})

// 根據時間刻度生成時間軸標記
const timeAxisMarks = computed(() => {
  const { start, end } = dateRange.value
  const marks: Array<{ position: number; label: string; isMain: boolean; isWeekend?: boolean }> = []
  const range = end.getTime() - start.getTime()
  if (range === 0) return marks

  const current = new Date(start)
  current.setHours(0, 0, 0, 0)

  // 計算總天數，用於決定日視圖的標記密度
  const totalDays = Math.ceil(range / (24 * 60 * 60 * 1000))
  const dayStep = totalDays > 21 ? 2 : 1 // 超過 21 天時每 2 天顯示一個標記

  // 根據不同時間刻度生成標記
  if (timeScale.value === 'day') {
    // 日視圖：每天或每隔一天一個標記
    let dayCount = 0
    while (current <= end) {
      const position = ((current.getTime() - start.getTime()) / range) * 100
      if (position >= 0 && position <= 100) {
        // 根據密度決定是否顯示
        const isMonday = current.getDay() === 1
        const shouldShow = dayStep === 1 || (dayCount % dayStep === 0) || isMonday
        if (shouldShow) {
          marks.push({
            position,
            label: `${current.getMonth() + 1}/${current.getDate()}`,
            isMain: isMonday, // 週一為主標記
            isWeekend: current.getDay() === 0 || current.getDay() === 6,
          })
        }
      }
      current.setDate(current.getDate() + 1)
      dayCount++
    }
  } else if (timeScale.value === 'week') {
    // 週視圖：每週一個標記（週一）
    // 先移到最近的週一
    const dayOfWeek = current.getDay()
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek)
    current.setDate(current.getDate() + daysToMonday)

    while (current <= end) {
      const position = ((current.getTime() - start.getTime()) / range) * 100
      if (position >= 0 && position <= 100) {
        marks.push({
          position,
          label: `${current.getMonth() + 1}/${current.getDate()}`,
          isMain: current.getDate() <= 7, // 每月第一週為主標記
        })
      }
      current.setDate(current.getDate() + 7)
    }
  } else {
    // 月視圖：每月第一天一個標記
    current.setDate(1)
    if (current < start) {
      current.setMonth(current.getMonth() + 1)
    }

    while (current <= end) {
      const position = ((current.getTime() - start.getTime()) / range) * 100
      if (position >= 0 && position <= 100) {
        marks.push({
          position,
          label: `${current.getFullYear()}/${current.getMonth() + 1}`,
          isMain: current.getMonth() === 0, // 每年第一個月為主標記
        })
      }
      current.setMonth(current.getMonth() + 1)
    }
  }

  return marks
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

// 計算任務工期天數
const getTaskDuration = (task: Task): number => {
  if (!task.startDate || !task.dueDate) return 0
  const start = new Date(task.startDate)
  const end = new Date(task.dueDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // 包含起始日
}

// 取得狀態顯示文字
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    UNCLAIMED: '待認領',
    CLAIMED: '已認領',
    IN_PROGRESS: '進行中',
    PAUSED: '暫停中',
    DONE: '已完成',
    BLOCKED: '卡關',
  }
  return labels[status] || status
}

// 計算剩餘天數
const getDaysRemaining = (task: Task): number | null => {
  if (!task.dueDate || task.status === 'DONE') return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.dueDate)
  dueDate.setHours(0, 0, 0, 0)
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

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
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <Select
          v-model="selectedStatus"
          label="狀態篩選"
          :options="statusOptions"
        />
      </div>

      <!-- 快速篩選和清除 -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer',
            showOverdueOnly
              ? 'bg-red-500 text-white'
              : 'bg-[var(--bg-tertiary)] hover:bg-red-100 dark:hover:bg-red-900/30'
          ]"
          :style="{ color: showOverdueOnly ? '' : 'var(--text-secondary)' }"
          @click="showOverdueOnly = !showOverdueOnly"
        >
          只看逾期
        </button>
        <button
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer',
            groupByProject
              ? 'bg-blue-500 text-white'
              : 'bg-[var(--bg-tertiary)] hover:bg-blue-100 dark:hover:bg-blue-900/30'
          ]"
          :style="{ color: groupByProject ? '' : 'var(--text-secondary)' }"
          @click="groupByProject = !groupByProject"
        >
          按專案分組
        </button>
        <!-- 展開/收起所有（僅在分組模式下顯示） -->
        <button
          v-if="groupByProject && groupedTasks && groupedTasks.length > 1"
          class="px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]"
          style="color: var(--text-muted);"
          @click="allProjectsCollapsed ? expandAllProjects() : collapseAllProjects()"
        >
          {{ allProjectsCollapsed ? '展開全部' : '收起全部' }}
        </button>
        <button
          v-if="hasFilters"
          class="px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer"
          style="color: var(--text-muted);"
          @click="clearFilters"
        >
          清除篩選
        </button>
      </div>

      <!-- 員工視角提示 -->
      <div v-if="selectedEmployee" class="mt-3 p-2 rounded-lg text-sm bg-info/10 border border-info/20" style="color: var(--text-secondary);">
        <span class="font-medium">員工視角：</span>顯示該員工負責的所有任務（含已完成）
      </div>

      <!-- 逾期任務警告 -->
      <div v-if="taskStats.overdue > 0 && !showOverdueOnly" class="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm font-medium text-red-700 dark:text-red-400">
            {{ taskStats.overdue }} 項任務已逾期
          </span>
          <button
            class="ml-auto text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors cursor-pointer"
            @click="showOverdueOnly = true"
          >
            只看逾期
          </button>
        </div>
      </div>

      <!-- 超出顯示範圍提示 -->
      <div v-if="tasksOutsideRange.total > 0" class="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
        <div class="flex items-center gap-2 text-sm">
          <svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <span class="text-amber-700 dark:text-amber-400">
            <span class="font-medium">{{ tasksOutsideRange.total }} 項任務</span>
            不在目前顯示範圍內
            <span v-if="tasksOutsideRange.before > 0" class="text-xs">（{{ tasksOutsideRange.before }} 項在更早之前）</span>
            <span v-if="tasksOutsideRange.after > 0" class="text-xs">（{{ tasksOutsideRange.after }} 項在更晚之後）</span>
          </span>
          <span class="ml-auto text-xs text-amber-600 dark:text-amber-400">切換至「月」視圖可看到更多</span>
        </div>
      </div>

      <!-- 快速統計 -->
      <div class="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm" style="border-color: var(--border-primary);">
        <div class="flex items-center gap-2">
          <span style="color: var(--text-muted);">總計</span>
          <span class="font-semibold" style="color: var(--text-primary);">{{ taskStats.total }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span style="color: var(--text-muted);">進行中</span>
          <span class="font-semibold text-blue-500">{{ taskStats.inProgress }}</span>
        </div>
        <div v-if="taskStats.overdue > 0" class="flex items-center gap-2">
          <span style="color: var(--text-muted);">逾期</span>
          <span class="font-semibold text-red-500">{{ taskStats.overdue }}</span>
        </div>
        <div v-if="taskStats.paused > 0" class="flex items-center gap-2">
          <span style="color: var(--text-muted);">暫停</span>
          <span class="font-semibold text-amber-500">{{ taskStats.paused }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span style="color: var(--text-muted);">已完成</span>
          <span class="font-semibold text-green-500">{{ taskStats.completed }}</span>
        </div>
      </div>
    </Card>

    <!-- 甘特圖區域 -->
    <Card>
      <!-- 標題列：含時間刻度切換和里程碑管理按鈕 -->
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4 w-full">
          <div>
            <h3 class="text-lg font-semibold" style="color: var(--text-primary);">任務時程</h3>
            <p class="text-sm" style="color: var(--text-secondary);">{{ formatDate(dateRange.start) }} - {{ formatDate(dateRange.end) }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- 時間刻度切換 -->
            <div class="flex items-center rounded-lg p-1" style="background-color: var(--bg-tertiary);">
              <button
                v-for="scale in timeScaleOptions"
                :key="scale.value"
                :class="[
                  'px-3 py-1 text-sm rounded-md transition-all cursor-pointer',
                  timeScale === scale.value
                    ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
                    : 'hover:bg-white/50 dark:hover:bg-gray-600/50'
                ]"
                :style="{ color: timeScale === scale.value ? 'var(--text-primary)' : 'var(--text-muted)' }"
                @click="timeScale = scale.value"
              >
                {{ scale.label }}
              </button>
            </div>
            <!-- 里程碑管理按鈕 -->
            <button
              v-if="canManageMilestones"
              class="btn-secondary text-sm flex items-center gap-1"
              @click="showMilestoneModal = true"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="hidden sm:inline">管理里程碑</span>
            </button>
          </div>
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

        <!-- 時間軸標記（根據時間刻度動態生成） -->
        <div class="relative h-8 mb-4">
          <!-- 行動裝置簡化時間軸 -->
          <div class="sm:hidden flex justify-between text-xs px-2" style="color: var(--text-muted);">
            <span>{{ formatDate(dateRange.start) }}</span>
            <span class="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-semibold">今天</span>
            <span>{{ formatDate(dateRange.end) }}</span>
          </div>
          <!-- 桌面版完整時間軸 -->
          <div class="hidden sm:block absolute inset-x-0 h-full">
            <div class="flex items-end h-full pl-44 md:pl-48 lg:pl-52">
              <div class="relative flex-1 h-full border-b" style="border-color: var(--border-primary);">
                <!-- 刻度標記 -->
                <template v-for="mark in timeAxisMarks" :key="mark.position">
                  <div
                    class="absolute bottom-0 flex flex-col items-center"
                    :style="{ left: `${mark.position}%`, transform: 'translateX(-50%)' }"
                  >
                    <span
                      :class="[
                        'text-[10px] whitespace-nowrap',
                        mark.isMain ? 'font-semibold' : 'font-normal',
                        mark.isWeekend ? 'opacity-60' : ''
                      ]"
                      :style="{ color: mark.isMain ? 'var(--text-secondary)' : 'var(--text-muted)' }"
                    >
                      {{ mark.label }}
                    </span>
                    <div
                      :class="['w-px', mark.isMain ? 'h-3 bg-[var(--border-secondary)]' : 'h-2 bg-[var(--border-primary)]']"
                    ></div>
                  </div>
                </template>
                <!-- 今天標記 -->
                <div
                  class="absolute bottom-0 flex flex-col items-center z-10"
                  :style="{ left: `${todayPosition}%`, transform: 'translateX(-50%)' }"
                >
                  <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-500 text-white whitespace-nowrap">今天</span>
                  <div class="w-0.5 h-3 bg-red-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 任務列表容器（含今天指示線） -->
        <div class="relative">
          <!-- 今天的垂直線 -->
          <div
            class="absolute top-0 bottom-0 w-0.5 bg-red-500/70 z-10 pointer-events-none hidden sm:block"
            :style="{ left: `calc(${todayPosition}% + 176px * (1 - ${todayPosition} / 100))` }"
          >
            <div class="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded whitespace-nowrap">今天</div>
          </div>

          <!-- 分組顯示模式 -->
          <template v-if="groupByProject && groupedTasks">
            <div v-for="group in groupedTasks" :key="group.projectId" class="mb-4">
              <!-- 專案標題（可折疊） -->
              <button
                class="w-full flex items-center gap-2 py-2 px-3 rounded-lg mb-2 transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                style="background-color: var(--bg-secondary);"
                @click="toggleProjectCollapse(group.projectId)"
              >
                <svg
                  :class="['w-4 h-4 transition-transform', isProjectCollapsed(group.projectId) ? '-rotate-90' : '']"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style="color: var(--text-muted);"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                <span class="font-medium" style="color: var(--text-primary);">{{ group.projectName }}</span>
                <span class="text-sm ml-2 px-2 py-0.5 rounded-full" style="background-color: var(--bg-tertiary); color: var(--text-muted);">
                  {{ group.tasks.length }} 項任務
                </span>
              </button>

              <!-- 專案任務列表（可折疊） -->
              <div v-show="!isProjectCollapsed(group.projectId)" class="pl-4 border-l-2" style="border-color: var(--border-primary);">
                <div
                  v-for="(task, index) in group.tasks"
                  :key="task.id"
                  :class="[
                    'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2',
                    index % 2 === 0 ? 'bg-transparent' : 'bg-black/[0.02] dark:bg-white/[0.02]'
                  ]"
                  style="border-color: var(--border-primary);"
                  @click="navigateToTask(task.id)"
                >
                  <!-- 任務資訊（簡化） -->
                  <div class="w-full sm:w-44 md:w-48 lg:w-52 sm:flex-shrink-0">
                    <div class="flex items-center gap-2">
                      <p class="font-medium text-sm truncate hover:text-samurai transition-colors" style="color: var(--text-primary);">{{ task.title }}</p>
                      <span v-if="isTaskOverdue(task)" class="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">逾期</span>
                    </div>
                    <p class="text-xs" style="color: var(--text-muted);">{{ getAssigneeName(task) }}</p>
                  </div>
                  <!-- 甘特條 -->
                  <div class="flex-1 h-8 rounded-lg relative group/bar" style="background-color: var(--bg-tertiary);">
                    <div
                      :class="[
                        'absolute h-full rounded-lg transition-all duration-200',
                        isTaskOverdue(task) ? 'bg-red-500' : statusColors[task.status],
                        task.status === 'PAUSED' && !isTaskOverdue(task) ? 'bg-gradient-to-r from-amber-500/40 via-amber-400/20 to-amber-500/40 bg-[length:10px_100%]' : ''
                      ]"
                      :style="{ left: `${getTaskPosition(task).left}%`, width: `${getTaskPosition(task).width}%` }"
                    >
                      <div class="flex items-center justify-center h-full px-2 gap-1">
                        <svg v-if="task.status === 'PAUSED'" class="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        <span :class="['text-xs font-medium truncate', task.status === 'PAUSED' ? 'text-amber-700' : 'text-white']">
                          {{ task.status === 'PAUSED' ? '暫停中' : isTaskOverdue(task) ? '逾期' : `${task.progress}%` }}
                        </span>
                      </div>
                      <!-- Tooltip -->
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-20 hidden sm:block">
                        <div class="px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap" style="background-color: var(--bg-primary); border: 1px solid var(--border-primary);">
                          <p class="font-semibold mb-1" style="color: var(--text-primary);">{{ task.title }}</p>
                          <div class="space-y-0.5" style="color: var(--text-muted);">
                            <p>狀態：{{ getStatusLabel(task.status) }}</p>
                            <p>日期：{{ formatShort(task.startDate) }} ~ {{ formatShort(task.dueDate) }}</p>
                            <p>工期：{{ getTaskDuration(task) }} 天</p>
                            <p>進度：{{ task.progress }}%</p>
                            <p v-if="getDaysRemaining(task) !== null" :class="getDaysRemaining(task)! < 0 ? 'text-red-500 font-medium' : getDaysRemaining(task)! <= 3 ? 'text-amber-500' : ''">
                              {{ getDaysRemaining(task)! < 0 ? `已逾期 ${Math.abs(getDaysRemaining(task)!)} 天` : getDaysRemaining(task) === 0 ? '今天到期' : `剩餘 ${getDaysRemaining(task)} 天` }}
                            </p>
                          </div>
                        </div>
                        <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style="border-top-color: var(--border-primary);"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 一般顯示模式（非分組） -->
          <template v-else>
            <div
              v-for="(task, index) in filteredTasks"
              :key="task.id"
              :class="[
                'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2',
                index % 2 === 0 ? 'bg-transparent' : 'bg-black/[0.02] dark:bg-white/[0.02]'
              ]"
              style="border-color: var(--border-primary);"
              @click="navigateToTask(task.id)"
            >
              <!-- 任務資訊 -->
              <div class="w-full sm:w-44 md:w-48 lg:w-52 sm:flex-shrink-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-sm truncate hover:text-samurai transition-colors" style="color: var(--text-primary);">{{ task.title }}</p>
                  <span v-if="isTaskOverdue(task)" class="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">逾期</span>
                  <span v-else-if="getDaysRemaining(task) !== null && getDaysRemaining(task)! <= 3 && getDaysRemaining(task)! >= 0" class="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                    {{ getDaysRemaining(task) === 0 ? '今天' : `${getDaysRemaining(task)}天` }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <p class="text-xs" style="color: var(--text-tertiary);">{{ getProjectName(task.projectId) }}</p>
                  <span class="text-xs" style="color: var(--text-muted);">·</span>
                  <p class="text-xs" style="color: var(--text-muted);">{{ getAssigneeName(task) }}</p>
                </div>
                <!-- 行動裝置顯示日期範圍 -->
                <p class="text-xs sm:hidden mt-1" style="color: var(--text-muted);">
                  {{ formatShort(task.startDate) }} - {{ formatShort(task.dueDate) }}
                </p>
              </div>

              <!-- 甘特條 -->
              <div class="flex-1 h-8 rounded-lg relative group/bar" style="background-color: var(--bg-tertiary);">
                <div
                  :class="[
                    'absolute h-full rounded-lg transition-all duration-200',
                    isTaskOverdue(task) ? 'bg-red-500' : statusColors[task.status],
                    task.status === 'PAUSED' && !isTaskOverdue(task) ? 'bg-gradient-to-r from-amber-500/40 via-amber-400/20 to-amber-500/40 bg-[length:10px_100%]' : ''
                  ]"
                  :style="{
                    left: `${getTaskPosition(task).left}%`,
                    width: `${getTaskPosition(task).width}%`,
                  }"
                >
                  <div class="flex items-center justify-center h-full px-2 gap-1">
                    <svg v-if="task.status === 'PAUSED'" class="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="isTaskOverdue(task)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <span :class="['text-xs font-medium truncate', task.status === 'PAUSED' ? 'text-amber-700' : 'text-white']">
                      {{ task.status === 'PAUSED' ? '暫停中' : isTaskOverdue(task) ? '逾期' : `${task.progress}%` }}
                    </span>
                  </div>
                  <!-- Tooltip -->
                  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-20 hidden sm:block">
                    <div class="px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap" style="background-color: var(--bg-primary); border: 1px solid var(--border-primary);">
                      <p class="font-semibold mb-1" style="color: var(--text-primary);">{{ task.title }}</p>
                      <div class="space-y-0.5" style="color: var(--text-muted);">
                        <p>狀態：{{ getStatusLabel(task.status) }}</p>
                        <p>日期：{{ formatShort(task.startDate) }} ~ {{ formatShort(task.dueDate) }}</p>
                        <p>工期：{{ getTaskDuration(task) }} 天</p>
                        <p>進度：{{ task.progress }}%</p>
                        <p v-if="getDaysRemaining(task) !== null" :class="getDaysRemaining(task)! < 0 ? 'text-red-500 font-medium' : getDaysRemaining(task)! <= 3 ? 'text-amber-500' : ''">
                          {{ getDaysRemaining(task)! < 0 ? `已逾期 ${Math.abs(getDaysRemaining(task)!)} 天` : getDaysRemaining(task) === 0 ? '今天到期' : `剩餘 ${getDaysRemaining(task)} 天` }}
                        </p>
                      </div>
                    </div>
                    <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style="border-top-color: var(--border-primary);"></div>
                  </div>
                </div>
              </div>
            </div>
          </template>
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
