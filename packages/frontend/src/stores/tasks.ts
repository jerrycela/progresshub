import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Task,
  TaskStatus,
  TaskSourceType,
  FunctionType,
  ActionResult,
  CreateTaskInput,
  PoolTask,
} from 'shared/types'
import { createTaskService } from '@/services/taskService'
import { mockTasks, mockPoolTasks } from '@/mocks/unified'

// ============================================
// Tasks Store - Service Layer 重構
// 透過 TaskService 抽象層處理任務邏輯
// 保留樂觀更新與回滾機制
// ============================================

const service = createTaskService()

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([...mockTasks])
  const poolTasks = ref<PoolTask[]>([...mockPoolTasks])
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
  const backlogTasks = computed(() => tasks.value.filter((t: Task) => t.status === 'UNCLAIMED'))

  const myTasks = computed(() =>
    tasks.value.filter((t: Task) => t.assigneeId && ['CLAIMED', 'IN_PROGRESS'].includes(t.status)),
  )

  const completedTasks = computed(() => tasks.value.filter((t: Task) => t.status === 'DONE'))

  const overdueTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.value.filter((t: Task) => t.dueDate && t.dueDate < today && t.status !== 'DONE')
  })

  const getTasksByProject = (projectId: string) =>
    computed(() => tasks.value.filter((t: Task) => t.projectId === projectId))

  const getTasksByFunction = (functionType: FunctionType) =>
    computed(() => tasks.value.filter((t: Task) => t.functionTags.includes(functionType)))

  const getTasksByStatus = (status: TaskStatus) =>
    computed(() => tasks.value.filter((t: Task) => t.status === status))

  const getTaskById = (taskId: string) => tasks.value.find((t: Task) => t.id === taskId)

  const getPoolTaskById = (taskId: string) => poolTasks.value.find((t: PoolTask) => t.id === taskId)

  const isTaskLoading = (taskId: string) =>
    loading.value.claim[taskId] || loading.value.unclaim[taskId] || loading.value.update[taskId]

  // 輔助函式：同步 poolTasks 陣列
  const syncPoolTask = (taskId: string, updates: Partial<PoolTask>) => {
    const idx = poolTasks.value.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      poolTasks.value = poolTasks.value.map((t, i) => (i === idx ? { ...t, ...updates } : t))
    }
  }

  // Actions
  const fetchTasks = async (): Promise<ActionResult<Task[]>> => {
    loading.value.fetch = true
    error.value = null

    try {
      const data = await service.fetchTasks()
      tasks.value = data

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

  const fetchPoolTasks = async (): Promise<ActionResult<PoolTask[]>> => {
    loading.value.fetch = true
    error.value = null

    try {
      const data = await service.fetchPoolTasks()
      poolTasks.value = data

      return { success: true, data: poolTasks.value }
    } catch (e) {
      const message = e instanceof Error ? e.message : '載入任務池失敗'
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
      const now = new Date().toISOString()
      task.status = 'CLAIMED'
      task.assigneeId = userId
      task.updatedAt = now

      // 同步 poolTasks
      syncPoolTask(taskId, { status: 'CLAIMED', assigneeId: userId, updatedAt: now })

      // 呼叫 service
      const result = await service.claimTask(taskId, userId)

      if (result.success && result.data) {
        // 以伺服器回應更新本地狀態
        const idx = tasks.value.findIndex((t: Task) => t.id === taskId)
        if (idx !== -1) {
          tasks.value[idx] = { ...tasks.value[idx], ...result.data }
        }
      }

      return { success: true, data: task }
    } catch (e) {
      // 回滾
      task.status = originalStatus
      task.assigneeId = originalAssigneeId
      syncPoolTask(taskId, { status: originalStatus, assigneeId: originalAssigneeId })

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
      // 樂觀更新
      const now = new Date().toISOString()
      task.status = 'UNCLAIMED'
      task.assigneeId = undefined
      task.progress = 0
      task.updatedAt = now

      // 同步 poolTasks
      syncPoolTask(taskId, {
        status: 'UNCLAIMED',
        assigneeId: undefined,
        progress: 0,
        updatedAt: now,
      })

      const result = await service.unclaimTask(taskId)

      if (result.success && result.data) {
        const idx = tasks.value.findIndex((t: Task) => t.id === taskId)
        if (idx !== -1) {
          tasks.value[idx] = { ...tasks.value[idx], ...result.data }
        }
      }

      return { success: true, data: task }
    } catch (e) {
      // 回滾
      task.status = originalStatus
      task.assigneeId = originalAssigneeId
      task.progress = originalProgress
      syncPoolTask(taskId, {
        status: originalStatus,
        assigneeId: originalAssigneeId,
        progress: originalProgress,
      })

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
    notes?: string,
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
      // 樂觀更新
      const now = new Date().toISOString()
      task.progress = progress
      task.updatedAt = now

      // 自動更新狀態
      if (progress > 0 && task.status === 'CLAIMED') {
        task.status = 'IN_PROGRESS'
      }
      if (progress >= 100) {
        task.status = 'DONE'
        task.closedAt = now
      }

      // 同步 poolTasks
      const poolUpdates: Partial<PoolTask> = { progress, status: task.status, updatedAt: now }
      if (task.closedAt) poolUpdates.closedAt = task.closedAt
      syncPoolTask(taskId, poolUpdates)

      const result = await service.updateTaskProgress(taskId, progress, notes)

      if (result.success && result.data) {
        const idx = tasks.value.findIndex((t: Task) => t.id === taskId)
        if (idx !== -1) {
          tasks.value[idx] = { ...tasks.value[idx], ...result.data }
        }
      }

      return { success: true, data: task }
    } catch (e) {
      // 回滾
      task.progress = originalProgress
      task.status = originalStatus
      syncPoolTask(taskId, { progress: originalProgress, status: originalStatus })

      const message = e instanceof Error ? e.message : '更新進度失敗'
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message },
      }
    } finally {
      loading.value.update[taskId] = false
    }
  }

  const updateTaskStatus = async (
    taskId: string,
    status: TaskStatus,
  ): Promise<ActionResult<Task>> => {
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
      // 樂觀更新
      const now = new Date().toISOString()
      task.status = status
      task.updatedAt = now

      if (status === 'DONE') {
        task.progress = 100
        task.closedAt = now
      }

      // 暫停時記錄時間
      if (status === 'PAUSED') {
        task.pausedAt = now
      }

      // 從暫停恢復時清除暫停資訊
      if (originalStatus === 'PAUSED' && status === 'IN_PROGRESS') {
        task.pauseReason = undefined
        task.pauseNote = undefined
        task.pausedAt = undefined
      }

      // 同步 poolTasks
      const poolUpdates: Partial<PoolTask> = { status, updatedAt: now }
      if (status === 'DONE') {
        poolUpdates.progress = 100
        poolUpdates.closedAt = now
      }
      if (status === 'PAUSED') {
        poolUpdates.pausedAt = now
      }
      if (originalStatus === 'PAUSED' && status === 'IN_PROGRESS') {
        poolUpdates.pauseReason = undefined
        poolUpdates.pauseNote = undefined
        poolUpdates.pausedAt = undefined
      }
      syncPoolTask(taskId, poolUpdates)

      const result = await service.updateTaskStatus(taskId, status)

      if (result.success && result.data) {
        const idx = tasks.value.findIndex((t: Task) => t.id === taskId)
        if (idx !== -1) {
          tasks.value[idx] = { ...tasks.value[idx], ...result.data }
        }
      }

      return { success: true, data: task }
    } catch (e) {
      // 回滾
      task.status = originalStatus
      syncPoolTask(taskId, { status: originalStatus })

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
      const now = new Date().toISOString()
      const sourceType: TaskSourceType = input.sourceType || 'POOL'

      // 依來源類型決定狀態與 assigneeId
      let status: Task['status'] = 'UNCLAIMED'
      let assigneeId: string | undefined = undefined
      if (sourceType === 'ASSIGNED' && input.assigneeId) {
        status = 'CLAIMED'
        assigneeId = input.assigneeId
      } else if (sourceType === 'SELF_CREATED' && input.createdBy) {
        status = 'CLAIMED'
        assigneeId = input.createdBy.id
      }

      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: input.title.trim(),
        description: input.description,
        status,
        priority: input.priority || 'MEDIUM',
        progress: 0,
        projectId: input.projectId,
        assigneeId,
        functionTags: input.functionTags || [],
        startDate: input.startDate,
        dueDate: input.dueDate,
        estimatedHours: input.estimatedHours,
        dependsOnTaskIds: input.dependsOnTaskIds,
        createdAt: now,
        updatedAt: now,
      }
      tasks.value = [...tasks.value, newTask]

      // 同時建立 PoolTask
      const newPoolTask: PoolTask = {
        ...newTask,
        sourceType,
        createdBy: input.createdBy || { id: 'unknown', name: '未知' },
        department: input.department as PoolTask['department'],
        canEdit: true,
        canDelete: true,
      }
      poolTasks.value = [...poolTasks.value, newPoolTask]

      return { success: true, data: newTask }
    } catch (e) {
      const message = e instanceof Error ? e.message : '建立任務失敗'
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR' as const, message },
      }
    } finally {
      loading.value.create = false
    }
  }

  const deleteTask = (taskId: string): ActionResult<void> => {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    poolTasks.value = poolTasks.value.filter(t => t.id !== taskId)
    return { success: true }
  }

  const updateTask = (taskId: string, input: Partial<Task>): ActionResult<Task> => {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }
    const now = new Date().toISOString()
    const updated = { ...tasks.value[idx], ...input, updatedAt: now }
    tasks.value = tasks.value.map((t, i) => (i === idx ? updated : t))
    syncPoolTask(taskId, { ...input, updatedAt: now })
    return { success: true, data: updated }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    tasks,
    poolTasks,
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
    getPoolTaskById,
    isTaskLoading,
    // Actions
    fetchTasks,
    fetchPoolTasks,
    claimTask,
    unclaimTask,
    updateTaskProgress,
    updateTaskStatus,
    createTask,
    deleteTask,
    updateTask,
    clearError,
  }
})
