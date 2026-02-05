// ============================================
// Gantt Chart Types
// ============================================

import { TaskStatus, TaskPriority } from './task'

// Query parameters for Gantt API
export interface GanttQueryParams {
  projectId?: string
  milestoneId?: string
  assigneeId?: string
  status?: TaskStatus
  startDate?: string  // ISO date string
  endDate?: string    // ISO date string
}

// Gantt task response
export interface GanttTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  progress: number
  startDate: string | null   // ISO date string
  dueDate: string | null     // ISO date string
  projectId: string
  projectName: string
  milestoneId: string | null
  milestoneName: string | null
  assigneeId: string | null
  assigneeName: string | null
  isOverdue: boolean
}

// Gantt milestone response
export interface GanttMilestone {
  id: string
  name: string
  description: string | null
  date: string              // ISO date string (dueDate)
  projectId: string
  projectName: string
  color?: string            // For UI display
  taskCount: number         // Number of tasks in this milestone
  completedTaskCount: number
}

// Gantt project summary
export interface GanttProject {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  taskCount: number
  milestoneCount: number
  progress: number          // Average progress of all tasks
}

// Statistics response
export interface GanttStats {
  total: number
  unclaimed: number
  claimed: number
  inProgress: number
  paused: number
  blocked: number
  completed: number
  overdue: number
  // Progress distribution
  progressDistribution: {
    notStarted: number     // 0%
    early: number          // 1-25%
    midway: number         // 26-50%
    advanced: number       // 51-75%
    nearComplete: number   // 76-99%
    complete: number       // 100%
  }
  // By priority
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
}

// Full Gantt response
export interface GanttResponse {
  projects: GanttProject[]
  milestones: GanttMilestone[]
  tasks: GanttTask[]
  dateRange: {
    start: string
    end: string
  }
}

// Helper function to check if a task is overdue
export function isTaskOverdue(dueDate: Date | string | null, status: TaskStatus): boolean {
  if (!dueDate || status === TaskStatus.DONE) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  return due < today
}

// Helper function to calculate progress distribution
export function getProgressBucket(progress: number): keyof GanttStats['progressDistribution'] {
  if (progress === 0) return 'notStarted'
  if (progress <= 25) return 'early'
  if (progress <= 50) return 'midway'
  if (progress <= 75) return 'advanced'
  if (progress < 100) return 'nearComplete'
  return 'complete'
}
