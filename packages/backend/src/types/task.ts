// ============================================
// Task Types
// ============================================

export enum TaskStatus {
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// ============================================
// Status Transition Rules
// ============================================

export type TaskAction =
  | 'claim'
  | 'unclaim'
  | 'start'
  | 'pause'
  | 'resume'
  | 'block'
  | 'unblock'
  | 'complete'

export const StatusTransitions: Record<TaskAction, { from: TaskStatus[]; to: TaskStatus }> = {
  claim: { from: [TaskStatus.UNCLAIMED], to: TaskStatus.CLAIMED },
  unclaim: { from: [TaskStatus.CLAIMED], to: TaskStatus.UNCLAIMED },
  start: { from: [TaskStatus.CLAIMED], to: TaskStatus.IN_PROGRESS },
  pause: { from: [TaskStatus.IN_PROGRESS], to: TaskStatus.PAUSED },
  resume: { from: [TaskStatus.PAUSED, TaskStatus.BLOCKED], to: TaskStatus.IN_PROGRESS },
  block: { from: [TaskStatus.IN_PROGRESS], to: TaskStatus.BLOCKED },
  unblock: { from: [TaskStatus.BLOCKED], to: TaskStatus.IN_PROGRESS },
  complete: { from: [TaskStatus.IN_PROGRESS], to: TaskStatus.DONE }
}

export function canTransition(currentStatus: TaskStatus, action: TaskAction): boolean {
  const transition = StatusTransitions[action]
  return transition.from.includes(currentStatus)
}

export function getNextStatus(currentStatus: TaskStatus, action: TaskAction): TaskStatus | null {
  if (!canTransition(currentStatus, action)) {
    return null
  }
  return StatusTransitions[action].to
}

// ============================================
// DTOs
// ============================================

export interface CreateTaskDto {
  title: string
  description?: string
  priority?: TaskPriority
  estimatedHours?: number
  dueDate?: string
  projectId: string
  milestoneId?: string
  assigneeId?: string
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  priority?: TaskPriority
  estimatedHours?: number
  dueDate?: string
  milestoneId?: string
  assigneeId?: string
  progress?: number
}

export interface TaskQueryParams {
  projectId?: string
  milestoneId?: string
  assigneeId?: string
  status?: TaskStatus
  priority?: TaskPriority
  page?: number
  limit?: number
}

// ============================================
// Response Types
// ============================================

export interface TaskResponse {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  progress: number
  estimatedHours: number | null
  actualHours: number | null
  dueDate: string | null
  startedAt: string | null
  completedAt: string | null
  projectId: string
  milestoneId: string | null
  assigneeId: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}
