<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useProject } from '@/composables/useProject'
import { useGantt, type TimeScale } from '@/composables/useGantt'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { FUNCTION_OPTIONS } from '@/constants/filterOptions'
import Card from '@/components/common/Card.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GanttFilters from '@/components/gantt/GanttFilters.vue'
import GanttTimeAxis from '@/components/gantt/GanttTimeAxis.vue'
import GanttMilestoneRow from '@/components/gantt/GanttMilestoneRow.vue'
import GanttTaskRow from '@/components/gantt/GanttTaskRow.vue'
import GanttDependencyLines from '@/components/gantt/GanttDependencyLines.vue'
import MilestoneModal from '@/components/gantt/MilestoneModal.vue'
import TaskRelationModal from '@/components/task/TaskRelationModal.vue'
import { topologicalSort } from '@/utils/topologicalSort'
import { useEmployeeStore } from '@/stores/employees'
import { useMilestoneStore } from '@/stores/milestones'
import type { MilestoneData, FunctionType, Task, UserRole } from 'shared/types'

const taskStore = useTaskStore()
const { getProjectName, getProjectOptions } = useProject()
const { showSuccess, showWarning } = useToast()
const { showConfirm } = useConfirm()
const employeeStore = useEmployeeStore()
const milestoneStore = useMilestoneStore()

// 篩選狀態
const selectedProject = ref<string>('ALL')
const selectedFunction = ref<FunctionType | 'ALL'>('ALL')
const selectedEmployee = ref<string>('')
const selectedStatus = ref<string>('ALL')
const showOverdueOnly = ref(false)
const groupByProject = ref(false)
const collapsedProjects = ref<Set<string>>(new Set())
const timeScale = ref<TimeScale>('week')
const showMilestoneModal = ref(false)

// 任務關聯 Modal 狀態
const showTaskRelationModal = ref(false)
const selectedTask = ref<Task | null>(null)

// 依賴線容器 ref
const taskListContainer = ref<HTMLElement | null>(null)

// 里程碑資料
const milestones = ref<MilestoneData[]>(milestoneStore.allSorted())

// 模擬當前登入者
const currentUser = {
  id: 'emp-7',
  name: '吳建國',
  userRole: 'PRODUCER' as UserRole,
}

const canManageMilestones = computed(() => ['PRODUCER', 'MANAGER'].includes(currentUser.userRole))

// 篩選選項
const statusOptions = [
  { value: 'ALL', label: '所有狀態' },
  { value: 'UNCLAIMED', label: '待認領' },
  { value: 'CLAIMED', label: '已認領' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'PAUSED', label: '暫停中' },
  { value: 'DONE', label: '已完成' },
  { value: 'BLOCKED', label: '卡關' },
]

const timeScaleOptions: Array<{ value: TimeScale; label: string }> = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
]

const colorOptions = [
  { value: '#F59E0B', label: '橙色' },
  { value: '#3B82F6', label: '藍色' },
  { value: '#10B981', label: '綠色' },
  { value: '#EF4444', label: '紅色' },
  { value: '#8B5CF6', label: '紫色' },
  { value: '#EC4899', label: '粉色' },
]

const projectOptions = computed(() => getProjectOptions(true))
const functionOptions = FUNCTION_OPTIONS
const employeeOptions = computed(() => [
  { value: '', label: '全部員工' },
  ...employeeStore.employees.map(emp => ({ value: emp.id, label: emp.name })),
])

// 檢查任務是否逾期（用於 filteredTasks 篩選）
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

  if (selectedProject.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.projectId === selectedProject.value)
  }
  if (selectedFunction.value !== 'ALL') {
    tasks = tasks.filter((t: Task) =>
      t.functionTags.includes(selectedFunction.value as FunctionType),
    )
  }
  if (selectedEmployee.value) {
    tasks = tasks.filter((t: Task) => t.assigneeId === selectedEmployee.value)
  }
  if (selectedStatus.value !== 'ALL') {
    tasks = tasks.filter((t: Task) => t.status === selectedStatus.value)
  }
  if (showOverdueOnly.value) {
    tasks = tasks.filter((t: Task) => isTaskOverdue(t))
  }

  return topologicalSort(tasks.filter((t: Task) => t.startDate && t.dueDate))
})

// 篩選後的里程碑
const filteredMilestones = computed(() => {
  if (selectedProject.value === 'ALL') return milestones.value
  return milestones.value.filter((ms: MilestoneData) => ms.projectId === selectedProject.value)
})

// 使用 Gantt composable
const {
  dateRange,
  todayPosition,
  timeAxisMarks,
  getTaskPosition,
  getMilestonePosition,
  getTaskDuration,
  getDaysRemaining,
  tasksOutsideRange,
  formatDate,
} = useGantt(filteredTasks, filteredMilestones, timeScale)

// 快速統計
const taskStats = computed(() => {
  const tasks = filteredTasks.value
  return {
    total: tasks.length,
    overdue: tasks.filter((t: Task) => isTaskOverdue(t)).length,
    inProgress: tasks.filter((t: Task) => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter((t: Task) => t.status === 'DONE').length,
    paused: tasks.filter((t: Task) => t.status === 'PAUSED').length,
  }
})

const hasFilters = computed(
  () =>
    selectedProject.value !== 'ALL' ||
    selectedFunction.value !== 'ALL' ||
    selectedEmployee.value !== '' ||
    selectedStatus.value !== 'ALL' ||
    showOverdueOnly.value,
)

const clearFilters = (): void => {
  selectedProject.value = 'ALL'
  selectedFunction.value = 'ALL'
  selectedEmployee.value = ''
  selectedStatus.value = 'ALL'
  showOverdueOnly.value = false
}

// 負責人名稱
const getAssigneeName = (task: Task): string => {
  if (!task.assigneeId) return '未指派'
  return employeeStore.getEmployeeById(task.assigneeId)?.name || '未知'
}

// 分組邏輯
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

const toggleProjectCollapse = (projectId: string): void => {
  const newSet = new Set(collapsedProjects.value)
  if (newSet.has(projectId)) {
    newSet.delete(projectId)
  } else {
    newSet.add(projectId)
  }
  collapsedProjects.value = newSet
}

const isProjectCollapsed = (projectId: string): boolean => collapsedProjects.value.has(projectId)

const expandAllProjects = (): void => {
  collapsedProjects.value = new Set()
}

const collapseAllProjects = (): void => {
  if (!groupedTasks.value) return
  collapsedProjects.value = new Set(groupedTasks.value.map(g => g.projectId))
}

const allProjectsCollapsed = computed(() => {
  if (!groupedTasks.value || groupedTasks.value.length === 0) return false
  return groupedTasks.value.every(g => collapsedProjects.value.has(g.projectId))
})

// 導航
const navigateToTask = (taskId: string) => {
  const task = (taskStore.tasks as Task[]).find((t: Task) => t.id === taskId)
  if (task) {
    selectedTask.value = task
    showTaskRelationModal.value = true
  }
}

// 里程碑 CRUD
const submitMilestone = (data: {
  name: string
  description: string
  date: string
  projectId: string
  color: string
}): void => {
  if (!data.name.trim()) {
    showWarning('請輸入里程碑名稱')
    return
  }
  if (!data.date) {
    showWarning('請選擇里程碑日期')
    return
  }
  if (!data.projectId) {
    showWarning('請選擇專案')
    return
  }

  const milestone: MilestoneData = {
    id: `ms-${Date.now()}`,
    projectId: data.projectId,
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    date: data.date,
    color: data.color,
    createdById: currentUser.id,
    createdByName: currentUser.name,
    createdAt: new Date().toISOString(),
  }

  milestones.value = [...milestones.value, milestone].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  milestoneStore.addMilestone(milestone)
  showMilestoneModal.value = false
  showSuccess(`已新增里程碑：${milestone.name}`)
}

const deleteMilestone = async (msId: string): Promise<void> => {
  const confirmed = await showConfirm({
    title: '刪除里程碑',
    message: '確定要刪除此里程碑嗎？',
    type: 'danger',
    confirmText: '刪除',
  })
  if (!confirmed) return

  milestones.value = milestones.value.filter((ms: MilestoneData) => ms.id !== msId)
  milestoneStore.removeMilestone(msId)
  showSuccess('已刪除里程碑')
}
</script>

<template>
  <div class="space-y-6">
    <!-- 頁面標題 -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold" style="color: var(--text-primary)">甘特圖</h1>
      <p class="text-sm md:text-base mt-1" style="color: var(--text-secondary)">
        專案時程視覺化總覽
      </p>
    </div>

    <!-- 行動裝置提示 -->
    <div
      class="md:hidden p-3 rounded-lg text-sm flex items-center gap-2 bg-info/10 border border-info/30"
      style="color: var(--text-primary)"
    >
      <svg
        class="w-5 h-5 flex-shrink-0 text-info"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <span>建議使用桌面裝置獲得更完整的甘特圖體驗</span>
    </div>

    <!-- 篩選器 -->
    <GanttFilters
      v-model:selected-project="selectedProject"
      v-model:selected-function="selectedFunction"
      v-model:selected-employee="selectedEmployee"
      v-model:selected-status="selectedStatus"
      v-model:show-overdue-only="showOverdueOnly"
      v-model:group-by-project="groupByProject"
      :project-options="projectOptions"
      :function-options="functionOptions"
      :employee-options="employeeOptions"
      :status-options="statusOptions"
      :task-stats="taskStats"
      :tasks-outside-range="tasksOutsideRange"
      :has-filters="hasFilters"
      :all-projects-collapsed="allProjectsCollapsed"
      @clear-filters="clearFilters"
      @expand-all="expandAllProjects"
      @collapse-all="collapseAllProjects"
    />

    <!-- 甘特圖區域 -->
    <Card>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4 w-full">
          <div>
            <h3 class="text-lg font-semibold" style="color: var(--text-primary)">任務時程</h3>
            <p class="text-sm" style="color: var(--text-secondary)">
              {{ formatDate(dateRange.start) }} - {{ formatDate(dateRange.end) }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <!-- 時間刻度切換 -->
            <div
              class="flex items-center rounded-lg p-1"
              style="background-color: var(--bg-tertiary)"
            >
              <button
                v-for="scale in timeScaleOptions"
                :key="scale.value"
                :class="[
                  'px-3 py-1 text-sm rounded-md transition-all cursor-pointer',
                  timeScale === scale.value
                    ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
                    : 'hover:bg-white/50 dark:hover:bg-gray-600/50',
                ]"
                :style="{
                  color: timeScale === scale.value ? 'var(--text-primary)' : 'var(--text-muted)',
                }"
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
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span class="hidden sm:inline">管理里程碑</span>
            </button>
          </div>
        </div>
      </template>

      <div v-if="filteredTasks.length > 0" class="space-y-3">
        <!-- 里程碑標記 -->
        <GanttMilestoneRow
          :milestones="filteredMilestones"
          :get-milestone-position="getMilestonePosition"
        />

        <!-- 時間軸 -->
        <GanttTimeAxis
          :time-axis-marks="timeAxisMarks"
          :today-position="todayPosition"
          :date-range="dateRange"
          :format-date="formatDate"
        />

        <!-- 任務列表 -->
        <div>
          <!-- 分組模式 -->
          <template v-if="groupByProject && groupedTasks">
            <div v-for="group in groupedTasks" :key="group.projectId" class="mb-4">
              <button
                class="w-full flex items-center gap-2 py-2 px-3 rounded-lg mb-2 transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                style="background-color: var(--bg-secondary)"
                @click="toggleProjectCollapse(group.projectId)"
              >
                <svg
                  :class="[
                    'w-4 h-4 transition-transform',
                    isProjectCollapsed(group.projectId) ? '-rotate-90' : '',
                  ]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style="color: var(--text-muted)"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                <span class="font-medium" style="color: var(--text-primary)">{{
                  group.projectName
                }}</span>
                <span
                  class="text-sm ml-2 px-2 py-0.5 rounded-full"
                  style="background-color: var(--bg-tertiary); color: var(--text-muted)"
                >
                  {{ group.tasks.length }} 項任務
                </span>
              </button>

              <div
                v-show="!isProjectCollapsed(group.projectId)"
                class="pl-4 border-l-2"
                style="border-color: var(--border-primary)"
              >
                <GanttTaskRow
                  v-for="(task, index) in group.tasks"
                  :key="task.id"
                  :task="task"
                  :index="index"
                  :get-task-position="getTaskPosition"
                  :is-task-overdue="isTaskOverdue"
                  :get-task-duration="getTaskDuration"
                  :get-days-remaining="getDaysRemaining"
                  :get-assignee-name="getAssigneeName"
                  @click="navigateToTask"
                />
              </div>
            </div>
          </template>

          <!-- 非分組模式 -->
          <div v-if="!groupByProject" ref="taskListContainer" class="relative">
            <GanttTaskRow
              v-for="(task, index) in filteredTasks"
              :key="task.id"
              :task="task"
              :index="index"
              :get-task-position="getTaskPosition"
              :is-task-overdue="isTaskOverdue"
              :get-task-duration="getTaskDuration"
              :get-days-remaining="getDaysRemaining"
              :get-assignee-name="getAssigneeName"
              :get-project-name="getProjectName"
              :show-project="true"
              @click="navigateToTask"
            />
            <GanttDependencyLines
              :tasks="filteredTasks"
              :get-task-position="getTaskPosition"
              :container-el="taskListContainer"
            />
          </div>
        </div>
      </div>

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
          <span class="text-sm" style="color: var(--text-secondary)">待認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-info/60 rounded" />
          <span class="text-sm" style="color: var(--text-secondary)">已認領</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-samurai rounded" />
          <span class="text-sm" style="color: var(--text-secondary)">進行中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-amber-500/60 rounded" />
          <span class="text-sm" style="color: var(--text-secondary)">暫停中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-success rounded" />
          <span class="text-sm" style="color: var(--text-secondary)">已完成</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-danger rounded" />
          <span class="text-sm" style="color: var(--text-secondary)">卡關</span>
        </div>
      </div>
    </Card>

    <!-- 開發中提示 -->
    <div
      class="p-4 rounded-lg text-sm bg-info/10 border border-info/30"
      style="color: var(--text-primary)"
    >
      <p class="font-medium">開發中提示</p>
      <p class="mt-1" style="color: var(--text-secondary)">
        此為簡化版甘特圖預覽。正式版本將整合 Frappe Gantt 套件，支援拖拽調整、縮放、互動編輯等功能。
      </p>
    </div>

    <!-- 里程碑管理 Modal -->
    <MilestoneModal
      v-model="showMilestoneModal"
      :milestones="milestones"
      :project-options="projectOptions.filter(p => p.value !== 'ALL')"
      :color-options="colorOptions"
      :can-manage="canManageMilestones"
      @submit="submitMilestone"
      @delete="deleteMilestone"
    />

    <!-- 任務關聯 Modal -->
    <TaskRelationModal
      v-if="selectedTask"
      v-model="showTaskRelationModal"
      :task="selectedTask"
      :all-tasks="taskStore.tasks as Task[]"
    />
  </div>
</template>
