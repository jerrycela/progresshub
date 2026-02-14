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

    // 保存快照（用於回滾）
    const tasksSnapshot = tasks.value
    const poolSnapshot = poolTasks.value

    try {
      // 樂觀更新（不可變）
      const now = new Date().toISOString()
      tasks.value = tasks.value.map(t =>
        t.id === taskId
          ? { ...t, status: 'CLAIMED' as const, assigneeId: userId, updatedAt: now }
          : t,
      )

      // 同步 poolTasks
      syncPoolTask(taskId, { status: 'CLAIMED', assigneeId: userId, updatedAt: now })

      // 呼叫 service
      const result = await service.claimTask(taskId, userId)

      if (result.success && result.data) {
        tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, ...result.data } : t))
      }

      return { success: true, data: tasks.value.find(t => t.id === taskId)! }
    } catch (e) {
      // 回滾：還原快照
      tasks.value = tasksSnapshot
      poolTasks.value = poolSnapshot

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

    // 保存快照（用於回滾）
    const tasksSnapshot = tasks.value
    const poolSnapshot = poolTasks.value

    try {
      // 樂觀更新（不可變）
      const now = new Date().toISOString()
      tasks.value = tasks.value.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'UNCLAIMED' as const,
              assigneeId: undefined,
              progress: 0,
              updatedAt: now,
            }
          : t,
      )

      // 同步 poolTasks
      syncPoolTask(taskId, {
        status: 'UNCLAIMED',
        assigneeId: undefined,
        progress: 0,
        updatedAt: now,
      })

      const result = await service.unclaimTask(taskId)

      if (result.success && result.data) {
        tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, ...result.data } : t))
      }

      return { success: true, data: tasks.value.find(t => t.id === taskId)! }
    } catch (e) {
      // 回滾：還原快照
      tasks.value = tasksSnapshot
      poolTasks.value = poolSnapshot

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

    // 保存快照（用於回滾）
    const tasksSnapshot = tasks.value
    const poolSnapshot = poolTasks.value

    try {
      // 計算新狀態（不可變）
      const now = new Date().toISOString()
      let newStatus = task.status
      let closedAt = task.closedAt

      if (progress > 0 && task.status === 'CLAIMED') {
        newStatus = 'IN_PROGRESS'
      }
      if (progress >= 100) {
        newStatus = 'DONE'
        closedAt = now
      }

      // 樂觀更新（不可變）
      tasks.value = tasks.value.map(t =>
        t.id === taskId ? { ...t, progress, status: newStatus, updatedAt: now, closedAt } : t,
      )

      // 同步 poolTasks
      const poolUpdates: Partial<PoolTask> = { progress, status: newStatus, updatedAt: now }
      if (closedAt) poolUpdates.closedAt = closedAt
      syncPoolTask(taskId, poolUpdates)

      const result = await service.updateTaskProgress(taskId, progress, notes)

      if (result.success && result.data) {
        tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, ...result.data } : t))
      }

      return { success: true, data: tasks.value.find(t => t.id === taskId)! }
    } catch (e) {
      // 回滾：還原快照
      tasks.value = tasksSnapshot
      poolTasks.value = poolSnapshot

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

    // 保存快照（用於回滾）
    const tasksSnapshot = tasks.value
    const poolSnapshot = poolTasks.value
    const originalStatus = task.status

    try {
      // 計算新欄位（不可變）
      const now = new Date().toISOString()
      const extraFields: Partial<Task> = { updatedAt: now }

      if (status === 'DONE') {
        extraFields.progress = 100
        extraFields.closedAt = now
      }
      if (status === 'PAUSED') {
        extraFields.pausedAt = now
      }
      if (originalStatus === 'PAUSED' && status === 'IN_PROGRESS') {
        extraFields.pauseReason = undefined
        extraFields.pauseNote = undefined
        extraFields.pausedAt = undefined
      }

      // 樂觀更新（不可變）
      tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, status, ...extraFields } : t))

      // 同步 poolTasks
      const poolUpdates: Partial<PoolTask> = { status, ...extraFields }
      syncPoolTask(taskId, poolUpdates)

      const result = await service.updateTaskStatus(taskId, status)

      if (result.success && result.data) {
        tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, ...result.data } : t))
      }

      return { success: true, data: tasks.value.find(t => t.id === taskId)! }
    } catch (e) {
      // 回滾：還原快照
      tasks.value = tasksSnapshot
      poolTasks.value = poolSnapshot

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
      const result = await service.createTask(input)

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || { code: 'UNKNOWN_ERROR', message: '建立任務失敗' },
        }
      }

      const newTask = result.data
      tasks.value = [...tasks.value, newTask]

      // 同時建立 PoolTask
      const sourceType: TaskSourceType = input.sourceType || 'POOL'
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

  const deleteTask = async (taskId: string): Promise<ActionResult<void>> => {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }

    // 樂觀更新：先從 store 移除
    const tasksSnapshot = [...tasks.value]
    const poolSnapshot = [...poolTasks.value]
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    poolTasks.value = poolTasks.value.filter(t => t.id !== taskId)

    try {
      await service.deleteTask(taskId)
      return { success: true }
    } catch (e) {
      // 回滾
      tasks.value = tasksSnapshot
      poolTasks.value = poolSnapshot
      const message = e instanceof Error ? e.message : '刪除任務失敗'
      return {
        success: false,
        error: { code: 'TASK_DELETE_FAILED', message },
      }
    }
  }

  const updateTask = async (taskId: string, input: Partial<Task>): Promise<ActionResult<Task>> => {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx === -1) {
      return {
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: '找不到指定的任務' },
      }
    }

    // 樂觀更新
    const tasksSnapshot = [...tasks.value]
    const poolSnapshot = [...poolTasks.value]
    const now = new Date().toISOString()
    const updated = { ...tasks.value[idx], ...input, updatedAt: now }
    tasks.value = tasks.value.map((t, i) => (i === idx ? updated : t))
    syncPoolTask(taskId, { ...input, updatedAt: now })

    try {
      const result = await service.updateTask(taskId, input)

      if (result.success && result.data) {
        tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, ...result.data } : t))
        syncPoolTask(taskId, result.data)
      }

      return { success: true, data: tasks.value.find(t => t.id === taskId)! }
    } catch (e) {
      // 回滾
      tasks.value = tasksSnapshot
      poolTasks.value = poolSnapshot
      const message = e instanceof Error ? e.message : '更新任務失敗'
      return {
        success: false,
        error: { code: 'TASK_UPDATE_FAILED', message },
      }
    }
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
