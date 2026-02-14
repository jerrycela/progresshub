import { computed, type Ref } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { topologicalSort } from '@/utils/topologicalSort'
import type { Task, MilestoneData, FunctionType } from 'shared/types'

export type TreeConnector = 'line' | 'branch' | 'last' | 'empty'

export function useGanttData(
  selectedProject: Ref<string>,
  selectedFunction: Ref<FunctionType | 'ALL'>,
  selectedEmployee: Ref<string>,
  selectedStatus: Ref<string>,
  showOverdueOnly: Ref<boolean>,
  groupByProject: Ref<boolean>,
  milestones: Ref<MilestoneData[]>,
  getProjectName: (id: string) => string | undefined,
) {
  const taskStore = useTaskStore()

  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.status === 'DONE') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  }

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

  const treeInfoMap = computed(() => {
    const tasks = filteredTasks.value
    const taskIdxMap = new Map<string, number>()
    tasks.forEach((t, i) => taskIdxMap.set(t.id, i))

    const parentMap = new Map<string, string>()
    const childrenMap = new Map<string, string[]>()

    for (const task of tasks) {
      if (!task.dependsOnTaskIds?.length) continue
      let primaryParent = ''
      let highestIdx = -1
      for (const depId of task.dependsOnTaskIds) {
        const idx = taskIdxMap.get(depId)
        if (idx !== undefined && idx > highestIdx) {
          highestIdx = idx
          primaryParent = depId
        }
      }
      if (primaryParent) {
        parentMap.set(task.id, primaryParent)
        const children = childrenMap.get(primaryParent) ?? []
        children.push(task.id)
        childrenMap.set(primaryParent, children)
      }
    }

    function getAncestorChain(taskId: string): string[] {
      const chain: string[] = []
      let current = taskId
      while (parentMap.has(current)) {
        chain.unshift(current)
        current = parentMap.get(current)!
      }
      return chain
    }

    const result = new Map<string, TreeConnector[]>()
    for (const task of tasks) {
      const chain = getAncestorChain(task.id)
      if (chain.length === 0) {
        result.set(task.id, [])
        continue
      }
      const connectors: TreeConnector[] = []
      for (let i = 0; i < chain.length; i++) {
        const node = chain[i]
        const parent = parentMap.get(node)!
        const siblings = childrenMap.get(parent) ?? []
        const isLast = siblings[siblings.length - 1] === node
        if (i === chain.length - 1) {
          connectors.push(isLast ? 'last' : 'branch')
        } else {
          connectors.push(isLast ? 'empty' : 'line')
        }
      }
      result.set(task.id, connectors)
    }
    return result
  })

  const filteredMilestones = computed(() => {
    if (selectedProject.value === 'ALL') return milestones.value
    return milestones.value.filter((ms: MilestoneData) => ms.projectId === selectedProject.value)
  })

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

  return {
    filteredTasks,
    filteredMilestones,
    treeInfoMap,
    taskStats,
    hasFilters,
    groupedTasks,
    isTaskOverdue,
    clearFilters,
  }
}
