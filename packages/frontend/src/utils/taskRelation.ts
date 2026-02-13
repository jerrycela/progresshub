import type { Task } from 'shared/types'

// ============================================
// 任務關聯工具函數
// ============================================

/**
 * 取得可選任務清單（排除當前任務）
 * @param allTasks 所有任務
 * @param currentTaskId 當前任務 ID（編輯模式時傳入）
 * @returns 可選任務清單
 */
export const getAvailableTasks = (
  allTasks: Task[],
  currentTaskId?: string
): Task[] => {
  return allTasks.filter((task: Task) => {
    // 排除當前任務
    if (currentTaskId && task.id === currentTaskId) {
      return false
    }
    return true
  })
}

/**
 * 按專案分組任務
 * @param tasks 任務清單
 * @returns 分組後的任務清單 { projectId: Task[] }
 */
export const groupTasksByProject = (
  tasks: Task[]
): Record<string, Task[]> => {
  return tasks.reduce((groups: Record<string, Task[]>, task: Task) => {
    const projectId = task.projectId
    if (!groups[projectId]) {
      groups[projectId] = []
    }
    groups[projectId].push(task)
    return groups
  }, {})
}

/**
 * 取得任務顯示標題（含專案名稱）
 * @param task 任務
 * @returns 顯示標題
 */
export const getTaskDisplayLabel = (task: Task): string => {
  const projectName = task.project?.name || '未知專案'
  return `${task.title} (${projectName})`
}

/**
 * 驗證任務關聯是否會造成循環依賴
 * @param taskId 當前任務 ID
 * @param targetTaskId 目標任務 ID
 * @param allTasks 所有任務
 * @returns 是否有循環依賴
 */
export const hasCircularDependency = (
  taskId: string,
  targetTaskId: string,
  allTasks: Task[]
): boolean => {
  const visited = new Set<string>()

  const checkCircular = (currentId: string): boolean => {
    if (currentId === taskId) {
      return true // 發現循環
    }

    if (visited.has(currentId)) {
      return false // 已檢查過
    }

    visited.add(currentId)

    const currentTask = allTasks.find((t: Task) => t.id === currentId)
    if (!currentTask?.dependsOnTaskIds) {
      return false
    }

    // 遞迴檢查所有依賴任務
    return currentTask.dependsOnTaskIds.some((depId: string) =>
      checkCircular(depId)
    )
  }

  return checkCircular(targetTaskId)
}
