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
// Error Codes
// ============================================
export const ErrorCodes = {
  // Auth
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',

  // Permission
  PERM_DENIED: 'PERM_DENIED',
  PERM_ROLE_REQUIRED: 'PERM_ROLE_REQUIRED',

  // Resource
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',

  // Server
  SERVER_ERROR: 'SERVER_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
