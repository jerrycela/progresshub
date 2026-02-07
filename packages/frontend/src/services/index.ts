// ============================================
// Services 匯出
// Phase 4: API Service Layer
// ============================================

export { default as api } from './api'
export { createTaskService, type TaskServiceInterface } from './taskService'
export { createProjectService, type ProjectServiceInterface } from './projectService'
export { createEmployeeService, type EmployeeServiceInterface } from './employeeService'
export { createMilestoneService, type MilestoneServiceInterface } from './milestoneService'
export { createNoteService, type NoteServiceInterface } from './noteService'
export { createProgressService, type ProgressServiceInterface } from './progressService'
export { createDashboardService, type DashboardServiceInterface } from './dashboardService'
export { createAuthService, type AuthServiceInterface } from './authService'
export { createUserSettingsService, type UserSettingsServiceInterface } from './userSettingsService'
