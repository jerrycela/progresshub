<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import Gantt from 'frappe-gantt'
import { ganttApi, projectsApi, employeesApi } from '@/api'
import type { GanttTask, GanttStats, Project, Employee } from '@/types'

const loading = ref(true)
const ganttData = ref<GanttTask[]>([])
const stats = ref<GanttStats | null>(null)
const projects = ref<Project[]>([])
const employees = ref<Employee[]>([])
const roles = ref<string[]>([])

// Filters
const selectedProject = ref('')
const selectedEmployee = ref('')
const selectedRole = ref('')
const viewMode = ref<'Day' | 'Week' | 'Month'>('Week')

let ganttInstance: any = null

onMounted(async () => {
  try {
    const [projectsRes, employeesRes, rolesRes] = await Promise.all([
      projectsApi.getAll(),
      employeesApi.getAll(),
      employeesApi.getRoles(),
    ])

    projects.value = projectsRes.data.projects
    employees.value = employeesRes.data.employees
    roles.value = rolesRes.data.roles

    await loadGanttData()
  } catch (error) {
    console.error('Failed to load initial data:', error)
  } finally {
    loading.value = false
  }
})

const loadGanttData = async () => {
  try {
    const params: any = {}
    if (selectedProject.value) params.projectId = selectedProject.value
    if (selectedEmployee.value) params.employeeId = selectedEmployee.value
    if (selectedRole.value) params.role = selectedRole.value

    const [ganttRes, statsRes] = await Promise.all([
      ganttApi.getData(params),
      ganttApi.getStats(selectedProject.value || undefined),
    ])

    ganttData.value = ganttRes.data.ganttData
    stats.value = statsRes.data.stats

    await nextTick()
    renderGantt()
  } catch (error) {
    console.error('Failed to load gantt data:', error)
  }
}

const renderGantt = () => {
  const container = document.getElementById('gantt-container')
  if (!container) return

  container.innerHTML = ''

  if (ganttData.value.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-500">沒有符合條件的任務</div>'
    return
  }

  // Format data for Frappe Gantt
  const tasks = ganttData.value.map((task) => ({
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    progress: task.progress,
    dependencies: task.dependencies || '',
    custom_class: task.custom_class,
  }))

  ganttInstance = new Gantt('#gantt-container', tasks, {
    view_mode: viewMode.value,
    date_format: 'YYYY-MM-DD',
    language: 'zh',
    custom_popup_html: (task: any) => {
      const ganttTask = ganttData.value.find((t) => t.id === task.id)
      if (!ganttTask) return ''

      return `
        <div class="p-3 bg-white rounded-lg shadow-lg max-w-xs">
          <h3 class="font-bold text-gray-900">${ganttTask.name}</h3>
          <p class="text-sm text-gray-600 mt-1">${ganttTask.projectName}</p>
          <div class="mt-2 space-y-1 text-sm">
            <p><span class="text-gray-500">負責人:</span> ${ganttTask.assigneeName}</p>
            <p><span class="text-gray-500">進度:</span> ${ganttTask.progress}%</p>
            <p><span class="text-gray-500">期間:</span> ${ganttTask.start} ~ ${ganttTask.end}</p>
            ${ganttTask.milestoneName ? `<p><span class="text-gray-500">里程碑:</span> ${ganttTask.milestoneName}</p>` : ''}
          </div>
        </div>
      `
    },
    on_date_change: (task: any, start: Date, end: Date) => {
      console.log('Date changed:', task.id, start, end)
      // TODO: Implement task update
    },
    on_progress_change: (task: any, progress: number) => {
      console.log('Progress changed:', task.id, progress)
      // TODO: Implement progress update
    },
  })
}

watch([selectedProject, selectedEmployee, selectedRole], () => {
  loadGanttData()
})

watch(viewMode, () => {
  if (ganttInstance) {
    ganttInstance.change_view_mode(viewMode.value)
  }
})

const clearFilters = () => {
  selectedProject.value = ''
  selectedEmployee.value = ''
  selectedRole.value = ''
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">甘特圖</h1>
      <div class="flex items-center gap-2">
        <button
          v-for="mode in ['Day', 'Week', 'Month'] as const"
          :key="mode"
          @click="viewMode = mode"
          :class="[
            'px-3 py-1 rounded text-sm',
            viewMode === mode
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          ]"
        >
          {{ mode === 'Day' ? '日' : mode === 'Week' ? '週' : '月' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <template v-else>
      <!-- 統計卡片 -->
      <div v-if="stats" class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="card py-4">
          <p class="text-sm text-gray-500">總任務</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.totalTasks }}</p>
        </div>
        <div class="card py-4">
          <p class="text-sm text-gray-500">未開始</p>
          <p class="text-2xl font-bold text-gray-400">{{ stats.notStartedTasks }}</p>
        </div>
        <div class="card py-4">
          <p class="text-sm text-gray-500">進行中</p>
          <p class="text-2xl font-bold text-blue-600">{{ stats.inProgressTasks }}</p>
        </div>
        <div class="card py-4">
          <p class="text-sm text-gray-500">已完成</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.completedTasks }}</p>
        </div>
        <div class="card py-4">
          <p class="text-sm text-gray-500">完成率</p>
          <p class="text-2xl font-bold text-primary-600">{{ stats.completionRate }}%</p>
        </div>
      </div>

      <!-- 篩選器 -->
      <div class="card mb-6">
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex-1 min-w-[200px]">
            <label class="form-label">專案</label>
            <select v-model="selectedProject" class="form-select">
              <option value="">所有專案</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="flex-1 min-w-[200px]">
            <label class="form-label">負責人</label>
            <select v-model="selectedEmployee" class="form-select">
              <option value="">所有人</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.name }}
              </option>
            </select>
          </div>

          <div class="flex-1 min-w-[200px]">
            <label class="form-label">職能</label>
            <select v-model="selectedRole" class="form-select">
              <option value="">所有職能</option>
              <option v-for="role in roles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>

          <div class="flex items-end">
            <button @click="clearFilters" class="btn btn-secondary">
              清除篩選
            </button>
          </div>
        </div>
      </div>

      <!-- 甘特圖 -->
      <div class="card overflow-hidden">
        <div id="gantt-container" class="gantt-container min-h-[400px]"></div>
      </div>

      <!-- 圖例 -->
      <div class="mt-4 flex items-center gap-6 text-sm text-gray-600">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-gray-300 rounded"></div>
          <span>未開始</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>剛開始</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-blue-500 rounded"></div>
          <span>進行中</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-emerald-500 rounded"></div>
          <span>即將完成</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-emerald-600 rounded"></div>
          <span>已完成</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
/* Frappe Gantt 樣式覆蓋 */
.gantt .grid-background {
  fill: #f9fafb;
}

.gantt .grid-header {
  fill: #f3f4f6;
  stroke: #e5e7eb;
}

.gantt .grid-row {
  fill: #ffffff;
}

.gantt .grid-row:nth-child(even) {
  fill: #f9fafb;
}

.gantt .row-line {
  stroke: #e5e7eb;
}

.gantt .tick {
  stroke: #e5e7eb;
}

.gantt .today-highlight {
  fill: rgba(59, 130, 246, 0.1);
}

.gantt .bar-group .bar {
  rx: 4;
  ry: 4;
}

.gantt .bar-progress {
  fill: rgba(255, 255, 255, 0.3);
}

.gantt .bar-label {
  font-size: 11px;
  font-weight: 500;
}

.gantt .handle {
  fill: rgba(0, 0, 0, 0.2);
}

.gantt-container {
  overflow-x: auto;
}

.popup-wrapper {
  z-index: 1000;
}
</style>
