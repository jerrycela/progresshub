// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: PaginationMeta
}

export interface ApiError {
  code: string
  message: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ============================================
// 統一錯誤代碼（合併 api.ts + index.ts 的定義）
// ============================================
export const ErrorCodes = {
  // 認證相關
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT_FAILED: 'AUTH_LOGOUT_FAILED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // 權限相關
  PERM_DENIED: 'PERM_DENIED',
  PERM_ROLE_REQUIRED: 'PERM_ROLE_REQUIRED',

  // 資源相關
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // 任務相關
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_NOT_UNCLAIMED: 'TASK_NOT_UNCLAIMED',
  TASK_ALREADY_CLAIMED: 'TASK_ALREADY_CLAIMED',
  TASK_UPDATE_FAILED: 'TASK_UPDATE_FAILED',
  TASK_CREATE_FAILED: 'TASK_CREATE_FAILED',

  // 專案相關
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',

  // 驗證相關
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 網路與伺服器
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
