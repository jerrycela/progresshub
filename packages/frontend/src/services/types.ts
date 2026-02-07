// ============================================
// API Service 層型別定義
// 統一 API 請求與回應的型別
// ============================================

import type { AxiosRequestConfig, AxiosResponse } from 'axios'

/**
 * API 回應的統一包裝格式
 * 與後端 ApiResponse<T> 保持一致
 */
export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: ApiErrorInfo
  readonly meta?: PaginationMeta
}

/**
 * API 錯誤資訊
 */
export interface ApiErrorInfo {
  readonly code: string
  readonly message: string
  readonly details?: Record<string, unknown>
}

/**
 * 分頁元資料
 */
export interface PaginationMeta {
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly hasMore: boolean
}

/**
 * 擴充的請求設定
 * 在 Axios 原有設定上新增自訂選項
 */
export interface ApiRequestConfig extends AxiosRequestConfig {
  /** 是否跳過全域錯誤處理（由呼叫者自行處理） */
  readonly skipErrorHandler?: boolean
  /** 是否跳過 Authorization header */
  readonly skipAuth?: boolean
  /** 重試次數（預設不重試） */
  readonly retryCount?: number
  /** 重試延遲（毫秒，預設 1000） */
  readonly retryDelay?: number
}

/**
 * API Client 建構選項
 */
export interface ApiClientOptions {
  /** API 基礎 URL */
  readonly baseURL: string
  /** 請求超時時間（毫秒） */
  readonly timeout: number
  /** 預設 headers */
  readonly headers: Record<string, string>
}

/**
 * API 錯誤類別
 * 封裝 Axios 錯誤為結構化的 API 錯誤
 */
export class ApiError extends Error {
  readonly statusCode: number
  readonly errorCode: string
  readonly errorDetails?: Record<string, unknown>

  constructor(params: {
    readonly message: string
    readonly statusCode: number
    readonly errorCode: string
    readonly errorDetails?: Record<string, unknown>
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.statusCode = params.statusCode
    this.errorCode = params.errorCode
    this.errorDetails = params.errorDetails
  }

  /**
   * 判斷是否為認證錯誤
   */
  get isAuthError(): boolean {
    return this.statusCode === 401
  }

  /**
   * 判斷是否為權限錯誤
   */
  get isForbiddenError(): boolean {
    return this.statusCode === 403
  }

  /**
   * 判斷是否為驗證錯誤
   */
  get isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422
  }

  /**
   * 判斷是否為伺服器錯誤
   */
  get isServerError(): boolean {
    return this.statusCode >= 500
  }
}

/**
 * 取消請求的 token 介面
 */
export interface CancelTokenSource {
  readonly controller: AbortController
  readonly cancel: (reason?: string) => void
}

/**
 * Axios Response 的型別別名（方便使用）
 */
export type ApiAxiosResponse<T = unknown> = AxiosResponse<T>
