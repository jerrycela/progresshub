import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskStatus, FunctionType } from 'shared/types'
import { mockTasks } from '@/mocks/data'

export const useTaskStore = defineStore('tasks', () => {
  // State
  const tasks = ref<Task[]>([...mockTasks])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const backlogTasks = computed(() =>
    tasks.value.filter((t: Task) => t.status === 'UNCLAIMED')
  )

  const myTasks = computed(() =>
    tasks.value.filter((t: Task) =>
      t.assigneeId && ['CLAIMED', 'IN_PROGRESS'].includes(t.status)
    )
  )

  const completedTasks = computed(() =>
    tasks.value.filter((t: Task) => t.status === 'DONE')
  )

  const overdueTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.value.filter((t: Task) =>
      t.dueDate &&
      t.dueDate < today &&
      t.status !== 'DONE'
    )
  })

  const getTasksByProject = (projectId: string) =>
    computed(() => tasks.value.filter((t: Task) => t.projectId === projectId))

  const getTasksByFunction = (functionType: FunctionType) =>
    computed(() => tasks.value.filter((t: Task) => t.functionTags.includes(functionType)))

  const getTasksByStatus = (status: TaskStatus) =>
    computed(() => tasks.value.filter((t: Task) => t.status === status))

  // Actions
  const fetchTasks = async () => {
    isLoading.value = true
    error.value = null
    try {
      // Mock: 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 300))
      tasks.value = [...mockTasks]
    } catch (e) {
      error.value = '載入任務失敗'
    } finally {
      isLoading.value = false
    }
  }

  const claimTask = async (taskId: string, userId: string) => {
    const task = tasks.value.find((t: Task) => t.id === taskId)
    if (task && task.status === 'UNCLAIMED') {
      task.status = 'CLAIMED'
      task.assigneeId = userId
    }
  }

  const unclaimTask = async (taskId: string) => {
    const task = tasks.value.find((t: Task) => t.id === taskId)
    if (task && ['CLAIMED', 'IN_PROGRESS'].includes(task.status)) {
      task.status = 'UNCLAIMED'
      task.assigneeId = undefined
      task.progress = 0
    }
  }

  const updateTaskProgress = async (taskId: string, progress: number, _notes?: string) => {
    const task = tasks.value.find((t: Task) => t.id === taskId)
    if (task) {
      task.progress = progress
      if (progress > 0 && task.status === 'CLAIMED') {
        task.status = 'IN_PROGRESS'
      }
      if (progress >= 100) {
        task.status = 'DONE'
      }
    }
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const task = tasks.value.find((t: Task) => t.id === taskId)
    if (task) {
      task.status = status
    }
  }

  const createTask = async (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: String(Date.now()),
      title: taskData.title || '新任務',
      description: taskData.description,
      status: 'UNCLAIMED',
      progress: 0,
      projectId: taskData.projectId || '1',
      functionTags: taskData.functionTags || [],
      startDate: taskData.startDate,
      dueDate: taskData.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    tasks.value.push(newTask)
    return newTask
  }

  return {
    // State
    tasks,
    isLoading,
    error,
    // Getters
    backlogTasks,
    myTasks,
    completedTasks,
    overdueTasks,
    getTasksByProject,
    getTasksByFunction,
    getTasksByStatus,
    // Actions
    fetchTasks,
    claimTask,
    unclaimTask,
    updateTaskProgress,
    updateTaskStatus,
    createTask,
  }
})
