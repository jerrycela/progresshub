// ============================================
// Progress Tracking Types
// ============================================

// Create progress log DTO
export interface CreateProgressLogDto {
  taskId: string
  content: string
  progress: number      // 0-100
  hoursSpent?: number
}

// Progress log response
export interface ProgressLogResponse {
  id: string
  content: string
  progress: number
  hoursSpent: number | null
  taskId: string
  taskTitle: string
  projectId: string
  projectName: string
  employeeId: string
  employeeName: string
  createdAt: string
}

// Query params for progress logs
export interface ProgressQueryParams {
  taskId?: string
  startDate?: string    // ISO date string
  endDate?: string      // ISO date string
  page?: number
  limit?: number
}

// Progress summary for a task
export interface TaskProgressSummary {
  taskId: string
  taskTitle: string
  currentProgress: number
  totalHoursSpent: number
  logCount: number
  lastUpdate: string | null
}

// Employee progress summary
export interface EmployeeProgressSummary {
  totalLogs: number
  totalHoursSpent: number
  tasksWorkedOn: number
  averageProgress: number
  recentLogs: ProgressLogResponse[]
}

// Validation helper
export function validateProgress(progress: number): boolean {
  return Number.isInteger(progress) && progress >= 0 && progress <= 100
}

// Validation helper for hours
export function validateHours(hours: number | undefined): boolean {
  if (hours === undefined) return true
  return typeof hours === 'number' && hours >= 0
}
