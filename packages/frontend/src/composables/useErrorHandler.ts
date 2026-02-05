// ============================================
// 錯誤處理 Composable
// ROI 優化：統一錯誤處理機制
// ============================================

import { useToast } from './useToast'

/**
 * 錯誤代碼對應的用戶友好訊息
 */
const ERROR_MESSAGES: Record<string, string> = {
  // 網路錯誤
  NETWORK_ERROR: '網路連線異常，請檢查網路狀態',
  TIMEOUT_ERROR: '請求超時，請稍後再試',

  // 認證錯誤
  UNAUTHORIZED: '登入已過期，請重新登入',
  FORBIDDEN: '您沒有權限執行此操作',
  INVALID_CREDENTIALS: '帳號或密碼錯誤',

  // 資源錯誤
  NOT_FOUND: '找不到請求的資源',
  TASK_NOT_FOUND: '找不到指定的任務',
  PROJECT_NOT_FOUND: '找不到指定的專案',
  USER_NOT_FOUND: '找不到指定的用戶',

  // 驗證錯誤
  VALIDATION_ERROR: '輸入資料有誤，請檢查後重試',
  INVALID_INPUT: '輸入格式不正確',

  // 操作錯誤
  ALREADY_CLAIMED: '此任務已被其他人認領',
  CANNOT_UNCLAIM: '無法退回此任務',
  TASK_UPDATE_FAILED: '任務更新失敗',
  TASK_CREATE_FAILED: '任務建立失敗',

  // 伺服器錯誤
  SERVER_ERROR: '伺服器發生錯誤，請稍後再試',
  SERVICE_UNAVAILABLE: '服務暫時無法使用，請稍後再試',

  // 通用錯誤
  UNKNOWN_ERROR: '發生未知錯誤，請稍後再試',
}

/**
 * 從錯誤代碼取得用戶友好訊息
 */
export const getErrorMessage = (code: string): string => {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * 判斷是否為網路錯誤
 */
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('Network Error') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'NetworkError'
    )
  }
  return false
}

/**
 * 判斷是否為超時錯誤
 */
const isTimeoutError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('timeout') ||
      error.name === 'TimeoutError' ||
      error.message.includes('ETIMEDOUT')
    )
  }
  return false
}

/**
 * 從 HTTP 狀態碼取得錯誤代碼
 */
const getErrorCodeFromStatus = (status: number): string => {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 408:
      return 'TIMEOUT_ERROR'
    case 500:
      return 'SERVER_ERROR'
    case 503:
      return 'SERVICE_UNAVAILABLE'
    default:
      return 'UNKNOWN_ERROR'
  }
}

export interface ErrorHandlerOptions {
  /** 錯誤發生的上下文（用於日誌） */
  context?: string
  /** 是否顯示 Toast 通知 */
  showToast?: boolean
  /** 自訂錯誤訊息（覆蓋預設） */
  customMessage?: string
  /** 錯誤回調 */
  onError?: (error: unknown, message: string) => void
}

/**
 * 錯誤處理 Composable
 * 提供統一的錯誤處理機制
 */
export const useErrorHandler = () => {
  const { showError } = useToast()

  /**
   * 處理錯誤
   * @param error 錯誤物件
   * @param options 選項
   * @returns 用戶友好的錯誤訊息
   */
  const handleError = (error: unknown, options: ErrorHandlerOptions = {}): string => {
    const { context, showToast = true, customMessage, onError } = options

    let message: string
    let code: string = 'UNKNOWN_ERROR'

    // 判斷錯誤類型並取得訊息
    if (customMessage) {
      message = customMessage
    } else if (isNetworkError(error)) {
      code = 'NETWORK_ERROR'
      message = getErrorMessage(code)
    } else if (isTimeoutError(error)) {
      code = 'TIMEOUT_ERROR'
      message = getErrorMessage(code)
    } else if (error instanceof Error) {
      // 檢查是否有 response（axios 錯誤）
      const axiosError = error as Error & { response?: { status: number; data?: { message?: string; code?: string } } }
      if (axiosError.response) {
        code = axiosError.response.data?.code || getErrorCodeFromStatus(axiosError.response.status)
        message = axiosError.response.data?.message || getErrorMessage(code)
      } else {
        message = error.message || getErrorMessage('UNKNOWN_ERROR')
      }
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as { message: unknown }).message)
      if ('code' in error) {
        code = String((error as { code: unknown }).code)
      }
    } else {
      message = getErrorMessage('UNKNOWN_ERROR')
    }

    // 開發環境輸出錯誤日誌
    if (import.meta.env.DEV) {
      console.error(`[ErrorHandler${context ? `:${context}` : ''}]`, error)
    }

    // 顯示 Toast
    if (showToast) {
      showError(message)
    }

    // 執行回調
    if (onError) {
      onError(error, message)
    }

    return message
  }

  /**
   * 包裝 async 函數，自動處理錯誤
   * @param fn 要執行的 async 函數
   * @param options 錯誤處理選項
   */
  const withErrorHandler = <T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): ((...args: Args) => Promise<T | null>) => {
    return async (...args: Args): Promise<T | null> => {
      try {
        return await fn(...args)
      } catch (error) {
        handleError(error, options)
        return null
      }
    }
  }

  /**
   * 處理 API 回應錯誤
   * 用於處理 ActionResult 類型的回應
   */
  const handleApiError = (
    result: { success: boolean; error?: { code?: string; message?: string } },
    options: ErrorHandlerOptions = {}
  ): boolean => {
    if (!result.success && result.error) {
      const message = options.customMessage || result.error.message || getErrorMessage(result.error.code || 'UNKNOWN_ERROR')

      if (options.showToast !== false) {
        showError(message)
      }

      if (options.onError) {
        options.onError(result.error, message)
      }

      return false
    }
    return true
  }

  return {
    handleError,
    handleApiError,
    withErrorHandler,
    getErrorMessage,
  }
}

export default useErrorHandler
