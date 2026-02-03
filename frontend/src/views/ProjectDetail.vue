<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsApi, tasksApi, milestonesApi, employeesApi } from '@/api'
import type { Project, Task, Milestone, Employee } from '@/types'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id as string

const loading = ref(true)
const project = ref<Project | null>(null)
const employees = ref<Employee[]>([])

const showTaskModal = ref(false)
const showMilestoneModal = ref(false)
const editingTask = ref<Task | null>(null)
const editingMilestone = ref<Milestone | null>(null)

const taskForm = ref({
  name: '',
  description: '',
  assignedToId: '',
  plannedStartDate: '',
  plannedEndDate: '',
  milestoneId: '',
})

const milestoneForm = ref({
  name: '',
  description: '',
  targetDate: '',
})

onMounted(async () => {
  try {
    const [projectRes, employeesRes] = await Promise.all([
      projectsApi.getById(projectId),
      employeesApi.getAll({ isActive: true }),
    ])

    project.value = projectRes.data.project
    employees.value = employeesRes.data.employees
  } catch (error) {
    console.error('Failed to load project:', error)
    router.push('/projects')
  } finally {
    loading.value = false
  }
})

const openTaskModal = (task?: Task) => {
  if (task) {
    editingTask.value = task
    taskForm.value = {
      name: task.name,
      description: task.description || '',
      assignedToId: task.assignedToId,
      plannedStartDate: task.plannedStartDate.split('T')[0],
      plannedEndDate: task.plannedEndDate.split('T')[0],
      milestoneId: task.milestoneId || '',
    }
  } else {
    editingTask.value = null
    taskForm.value = {
      name: '',
      description: '',
      assignedToId: '',
      plannedStartDate: project.value?.startDate.split('T')[0] || '',
      plannedEndDate: '',
      milestoneId: '',
    }
  }
  showTaskModal.value = true
}

const openMilestoneModal = (milestone?: Milestone) => {
  if (milestone) {
    editingMilestone.value = milestone
    milestoneForm.value = {
      name: milestone.name,
      description: milestone.description || '',
      targetDate: milestone.targetDate.split('T')[0],
    }
  } else {
    editingMilestone.value = null
    milestoneForm.value = {
      name: '',
      description: '',
      targetDate: '',
    }
  }
  showMilestoneModal.value = true
}

const handleTaskSubmit = async () => {
  try {
    const data = {
      projectId,
      name: taskForm.value.name,
      description: taskForm.value.description || null,
      assignedToId: taskForm.value.assignedToId,
      plannedStartDate: taskForm.value.plannedStartDate,
      plannedEndDate: taskForm.value.plannedEndDate,
      milestoneId: taskForm.value.milestoneId || null,
    }

    if (editingTask.value) {
      await tasksApi.update(editingTask.value.id, data)
    } else {
      await tasksApi.create(data)
    }

    showTaskModal.value = false

    // Reload project data
    const projectRes = await projectsApi.getById(projectId)
    project.value = projectRes.data.project
  } catch (error) {
    console.error('Failed to save task:', error)
  }
}

const handleMilestoneSubmit = async () => {
  try {
    const data = {
      projectId,
      name: milestoneForm.value.name,
      description: milestoneForm.value.description || null,
      targetDate: milestoneForm.value.targetDate,
    }

    if (editingMilestone.value) {
      await milestonesApi.update(editingMilestone.value.id, data)
    } else {
      await milestonesApi.create(data)
    }

    showMilestoneModal.value = false

    // Reload project data
    const projectRes = await projectsApi.getById(projectId)
    project.value = projectRes.data.project
  } catch (error) {
    console.error('Failed to save milestone:', error)
  }
}

const deleteTask = async (taskId: string) => {
  if (!confirm('確定要刪除此任務嗎？')) return
  try {
    await tasksApi.delete(taskId)
    const projectRes = await projectsApi.getById(projectId)
    project.value = projectRes.data.project
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

const deleteMilestone = async (milestoneId: string) => {
  if (!confirm('確定要刪除此里程碑嗎？')) return
  try {
    await milestonesApi.delete(milestoneId)
    const projectRes = await projectsApi.getById(projectId)
    project.value = projectRes.data.project
  } catch (error) {
    console.error('Failed to delete milestone:', error)
  }
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    NOT_STARTED: 'status-not-started',
    IN_PROGRESS: 'status-in-progress',
    COMPLETED: 'status-completed',
    PENDING: 'status-not-started',
    ACHIEVED: 'status-completed',
  }
  return classes[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    NOT_STARTED: '未開始',
    IN_PROGRESS: '進行中',
    COMPLETED: '已完成',
    PENDING: '待達成',
    ACHIEVED: '已達成',
  }
  return texts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}
</script>

<template>
  <div class="p-6">
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <template v-else-if="project">
      <!-- 返回按鈕和標題 -->
      <div class="flex items-center gap-4 mb-6">
        <button @click="router.push('/projects')" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-gray-900">{{ project.name }}</h1>
      </div>

      <!-- 專案資訊 -->
      <div class="card mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p class="text-sm text-gray-500">狀態</p>
            <span :class="['status-badge', getStatusClass(project.status)]">
              {{ getStatusText(project.status) }}
            </span>
          </div>
          <div>
            <p class="text-sm text-gray-500">開始日期</p>
            <p class="font-medium">{{ formatDate(project.startDate) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">結束日期</p>
            <p class="font-medium">{{ project.endDate ? formatDate(project.endDate) : '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">描述</p>
            <p class="font-medium">{{ project.description || '-' }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 任務列表 -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">任務</h2>
            <button @click="openTaskModal()" class="btn btn-primary text-sm">
              新增任務
            </button>
          </div>

          <div v-if="!project.tasks?.length" class="text-gray-500 text-center py-8">
            尚無任務
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="task in project.tasks"
              :key="task.id"
              class="p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ task.name }}</p>
                  <p class="text-sm text-gray-500 mt-1">
                    負責人: {{ task.assignedTo?.name }}
                  </p>
                </div>
                <span :class="['status-badge', getStatusClass(task.status)]">
                  {{ getStatusText(task.status) }}
                </span>
              </div>

              <div class="mt-3 flex items-center gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary-600"
                        :style="{ width: `${task.progressPercentage}%` }"
                      ></div>
                    </div>
                    <span class="text-sm text-gray-600">{{ task.progressPercentage }}%</span>
                  </div>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-between text-sm">
                <span class="text-gray-500">
                  {{ formatDate(task.plannedStartDate) }} ~ {{ formatDate(task.plannedEndDate) }}
                </span>
                <div class="flex gap-2">
                  <button
                    @click="openTaskModal(task)"
                    class="text-primary-600 hover:text-primary-700"
                  >
                    編輯
                  </button>
                  <button
                    @click="deleteTask(task.id)"
                    class="text-red-600 hover:text-red-700"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 里程碑列表 -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">里程碑</h2>
            <button @click="openMilestoneModal()" class="btn btn-primary text-sm">
              新增里程碑
            </button>
          </div>

          <div v-if="!project.milestones?.length" class="text-gray-500 text-center py-8">
            尚無里程碑
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="milestone in project.milestones"
              :key="milestone.id"
              class="p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-medium text-gray-900">{{ milestone.name }}</p>
                  <p v-if="milestone.description" class="text-sm text-gray-500 mt-1">
                    {{ milestone.description }}
                  </p>
                </div>
                <span :class="['status-badge', getStatusClass(milestone.status)]">
                  {{ getStatusText(milestone.status) }}
                </span>
              </div>

              <div class="mt-3 flex items-center justify-between text-sm">
                <span class="text-gray-500">目標日期: {{ formatDate(milestone.targetDate) }}</span>
                <div class="flex gap-2">
                  <button
                    @click="openMilestoneModal(milestone)"
                    class="text-primary-600 hover:text-primary-700"
                  >
                    編輯
                  </button>
                  <button
                    @click="deleteMilestone(milestone.id)"
                    class="text-red-600 hover:text-red-700"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 任務 Modal -->
    <div v-if="showTaskModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            {{ editingTask ? '編輯任務' : '新增任務' }}
          </h2>

          <form @submit.prevent="handleTaskSubmit" class="space-y-4">
            <div>
              <label class="form-label">任務名稱</label>
              <input v-model="taskForm.name" type="text" class="form-input" required />
            </div>

            <div>
              <label class="form-label">描述</label>
              <textarea v-model="taskForm.description" rows="2" class="form-input"></textarea>
            </div>

            <div>
              <label class="form-label">負責人</label>
              <select v-model="taskForm.assignedToId" class="form-select" required>
                <option value="">請選擇</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                  {{ emp.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="form-label">開始日期</label>
                <input v-model="taskForm.plannedStartDate" type="date" class="form-input" required />
              </div>
              <div>
                <label class="form-label">結束日期</label>
                <input v-model="taskForm.plannedEndDate" type="date" class="form-input" required />
              </div>
            </div>

            <div>
              <label class="form-label">里程碑</label>
              <select v-model="taskForm.milestoneId" class="form-select">
                <option value="">無</option>
                <option v-for="ms in project?.milestones" :key="ms.id" :value="ms.id">
                  {{ ms.name }}
                </option>
              </select>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showTaskModal = false" class="btn btn-secondary">取消</button>
              <button type="submit" class="btn btn-primary">{{ editingTask ? '儲存' : '建立' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 里程碑 Modal -->
    <div v-if="showMilestoneModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            {{ editingMilestone ? '編輯里程碑' : '新增里程碑' }}
          </h2>

          <form @submit.prevent="handleMilestoneSubmit" class="space-y-4">
            <div>
              <label class="form-label">里程碑名稱</label>
              <input v-model="milestoneForm.name" type="text" class="form-input" required />
            </div>

            <div>
              <label class="form-label">描述</label>
              <textarea v-model="milestoneForm.description" rows="2" class="form-input"></textarea>
            </div>

            <div>
              <label class="form-label">目標日期</label>
              <input v-model="milestoneForm.targetDate" type="date" class="form-input" required />
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button type="button" @click="showMilestoneModal = false" class="btn btn-secondary">取消</button>
              <button type="submit" class="btn btn-primary">{{ editingMilestone ? '儲存' : '建立' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
