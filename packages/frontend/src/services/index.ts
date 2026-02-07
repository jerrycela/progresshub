// ============================================
// Services 統一匯出
// API Service Layer
// ============================================

// API Client 與 Helper 方法
export { default as api } from './api'
export {
  apiGet,
  apiPost,
  apiPatch,
  apiPut,
  apiDelete,
  apiGetUnwrap,
  apiPostUnwrap,
  createCancelToken,
} from './api'

// API 型別定義
export { ApiError } from './types'
export type {
  ApiResponse,
  ApiErrorInfo,
  PaginationMeta,
  ApiRequestConfig,
  ApiClientOptions,
  CancelTokenSource,
} from './types'

// Service 工廠函數與介面
export { createTaskService, type TaskServiceInterface } from './taskService'
export { createProjectService, type ProjectServiceInterface } from './projectService'
export { createEmployeeService, type EmployeeServiceInterface } from './employeeService'
export { createMilestoneService, type MilestoneServiceInterface } from './milestoneService'
export { createNoteService, type NoteServiceInterface } from './noteService'
export { createProgressService, type ProgressServiceInterface } from './progressService'
export { createDashboardService, type DashboardServiceInterface } from './dashboardService'
export { createAuthService, type AuthServiceInterface } from './authService'
export { createUserSettingsService, type UserSettingsServiceInterface } from './userSettingsService'
