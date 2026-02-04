import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskStatus, FunctionType, ActionResult, CreateTaskInput } from 'shared/types'
import { mockTasks } from '@/mocks/data'

// ============================================
// Tasks Store - Ralph Loop 迭代 6 重構
// 新增完整錯誤處理、細粒度 Loading 狀態、樂觀更新
// ============================================

export const useTaskStore = defineStore('tasks', () => {
  // State
  const tasks = ref<Task[]>([...mockTasks])
  const error = ref<string | null>(null)

  // Loading 狀態（細粒度）
  const loading = ref({
    fetch: false,
    create: false,
    claim: {} as Record<string, boolean>,
    unclaim: {} as Record<string, boolean>,
    update: {} as Record<string, boolean>,
  })

  // 相容舊版 isLoading
  const isLoading = computed(() => loading.value.fetch || loading.value.create)

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

  const getTaskById = (taskId: string) =>
    tasks.value.find((t: Task) => t.id === taskId)

  const isTaskLoading = (taskId: string) =>
    loading.value.claim[taskId] ||
    loading.value.unclaim[taskId] ||
    loading.value.update[taskId]

  // Actions
  const fetchTasks = async (): Promise<ActionResult<Task[]>> => {
    loading.value.fetch = true
    error.value = null

    try {
      // Mock: 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 300))
      tasks.value = [...mockTasks]

      return { success: true, data: tasks.value }
    } catch (e) {
      const message = e instanceof Error ? e.message : '載入任務失敗'
      error.value = message

      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message },
      }
    } finally {
      loading.value.fetch = false
    }
  }

  const claimTask = async (taskId: string, userId: string): Promise<ActionResult<Task>> => {
    const task = tasks.value.find((t: Task) => t.id === taskId)

    // 驗證任務存在
    if (!task) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }

    // 驗證任務狀態
    if (task.status !== 'UNCLAIMED') {
      return {
        success: false,
        error: { code: 'TASK_NOT_UNCLAIMED', message: '此任務已被認領或不可認領' },
      }
    }

    loading.value.claim[taskId] = true

    // 保存原始狀態（用於回滾）
    const originalStatus = task.status
    const originalAssigneeId = task.assigneeId

    try {
      // 樂觀更新
      task.status = 'CLAIMED'
      task.assigneeId = userId
      task.updatedAt = new Date().toISOString()

      // Mock: 模擬 API 呼叫
      await new Promise(resolve => setTimeout(resolve, 200))

      return { success: true, data: task }
    } catch (e) {
      // 回滾
      task.status = originalStatus
      task.assigneeId = originalAssigneeId

      const message = e instanceof Error ? e.message : '認領任務失敗'
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message },
      }
    } finally {
      loading.value.claim[taskId] = false
    }
  }

  const unclaimTask = async (taskId: string): Promise<ActionResult<Task>> => {
    const task = tasks.value.find((t: Task) => t.id === taskId)

    if (!task) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }

    if (!['CLAIMED', 'IN_PROGRESS'].includes(task.status)) {
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message: '無法放棄此狀態的任務' },
      }
    }

    loading.value.unclaim[taskId] = true

    const originalStatus = task.status
    const originalAssigneeId = task.assigneeId
    const originalProgress = task.progress

    try {
      task.status = 'UNCLAIMED'
      task.assigneeId = undefined
      task.progress = 0
      task.updatedAt = new Date().toISOString()

      await new Promise(resolve => setTimeout(resolve, 200))

      return { success: true, data: task }
    } catch (e) {
      task.status = originalStatus
      task.assigneeId = originalAssigneeId
      task.progress = originalProgress

      const message = e instanceof Error ? e.message : '放棄認領失敗'
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message },
      }
    } finally {
      loading.value.unclaim[taskId] = false
    }
  }

  const updateTaskProgress = async (
    taskId: string,
    progress: number,
    notes?: string
  ): Promise<ActionResult<Task>> => {
    const task = tasks.value.find((t: Task) => t.id === taskId)

    if (!task) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }

    // 驗證進度值
    if (progress < 0 || progress > 100) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '進度必須在 0-100 之間' },
      }
    }

    loading.value.update[taskId] = true

    const originalProgress = task.progress
    const originalStatus = task.status

    try {
      task.progress = progress
      task.updatedAt = new Date().toISOString()

      // 自動更新狀態
      if (progress > 0 && task.status === 'CLAIMED') {
        task.status = 'IN_PROGRESS'
      }
      if (progress >= 100) {
        task.status = 'DONE'
        task.closedAt = new Date().toISOString()
      }

      // Mock: 保存備註（實際會記錄到 ProgressLog）
      if (notes) {
        console.log(`任務 ${taskId} 進度更新備註: ${notes}`)
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      return { success: true, data: task }
    } catch (e) {
      task.progress = originalProgress
      task.status = originalStatus

      const message = e instanceof Error ? e.message : '更新進度失敗'
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message },
      }
    } finally {
      loading.value.update[taskId] = false
    }
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<ActionResult<Task>> => {
    const task = tasks.value.find((t: Task) => t.id === taskId)

    if (!task) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }

    loading.value.update[taskId] = true
    const originalStatus = task.status

    try {
      task.status = status
      task.updatedAt = new Date().toISOString()

      if (status === 'DONE') {
        task.progress = 100
        task.closedAt = new Date().toISOString()
      }

      // 暫停時記錄時間
      if (status === 'PAUSED') {
        task.pausedAt = new Date().toISOString()
      }

      // 從暫停恢復時清除暫停資訊
      if (originalStatus === 'PAUSED' && status === 'IN_PROGRESS') {
        task.pauseReason = undefined
        task.pauseNote = undefined
        task.pausedAt = undefined
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      return { success: true, data: task }
    } catch (e) {
      task.status = originalStatus

      const message = e instanceof Error ? e.message : '更新狀態失敗'
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message },
      }
    } finally {
      loading.value.update[taskId] = false
    }
  }

  const createTask = async (input: CreateTaskInput): Promise<ActionResult<Task>> => {
    // 驗證必需欄位
    if (!input.title?.trim()) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '任務標題為必填' },
      }
    }

    if (!input.projectId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '專案 ID 為必填' },
      }
    }

    // 驗證日期
    if (input.startDate && input.dueDate) {
      if (new Date(input.startDate) > new Date(input.dueDate)) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '開始日期不能晚於截止日期' },
        }
      }
    }

    loading.value.create = true

    try {
      const newTask: Task = {
        id: String(Date.now()),
        title: input.title.trim(),
        description: input.description,
        status: 'UNCLAIMED',
        priority: input.priority || 'MEDIUM',
        progress: 0,
        projectId: input.projectId,
        functionTags: input.functionTags || [],
        startDate: input.startDate,
        dueDate: input.dueDate,
        estimatedHours: input.estimatedHours,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      tasks.value.push(newTask)

      return { success: true, data: newTask }
    } catch (e) {
      const message = e instanceof Error ? e.message : '建立任務失敗'
      return {
        success: false,
        error: { code: 'TASK_CREATE_FAILED', message },
      }
    } finally {
      loading.value.create = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    tasks,
    error,
    loading,
    isLoading,
    // Getters
    backlogTasks,
    myTasks,
    completedTasks,
    overdueTasks,
    getTasksByProject,
    getTasksByFunction,
    getTasksByStatus,
    getTaskById,
    isTaskLoading,
    // Actions
    fetchTasks,
    claimTask,
    unclaimTask,
    updateTaskProgress,
    updateTaskStatus,
    createTask,
    clearError,
  }
})
