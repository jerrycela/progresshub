// ============================================
// API Client - 統一的 HTTP 請求層
// 負責 Axios 實例管理、攔截器、錯誤處理
// ============================================

import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'
import { ApiError } from './types'
import type { ApiRequestConfig, CancelTokenSource, ApiResponse } from './types'

// ============================================
// Axios 實例建立
// ============================================

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================
// Request Interceptor
// 自動附加 Authorization header
// ============================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 檢查自訂設定：是否跳過認證 header
    const customConfig = config as InternalAxiosRequestConfig & { skipAuth?: boolean }
    if (customConfig.skipAuth) {
      return config
    }

    // 從 localStorage 讀取 token（避免循環依賴 pinia store）
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ============================================
// Token Refresh 狀態管理
// 防止並發 refresh 請求
// ============================================

type QueueItem = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

const processQueue = (error: unknown, token: string | null): void => {
  failedQueue.forEach(item => {
    if (error) {
      item.reject(error)
    } else {
      item.resolve(token as string)
    }
  })
  failedQueue = []
}

const forceLogout = async (): Promise<void> => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_refresh_token')

  try {
    const { default: router } = await import('@/router')
    const currentPath = router.currentRoute.value.fullPath

    if (currentPath !== '/login') {
      await router.push({
        path: '/login',
        query: { redirect: currentPath },
      })
    }
  } catch {
    window.location.href = '/login'
  }

  showErrorToast('登入已過期，請重新登入')
}

// ============================================
// Response Interceptor
// 統一錯誤處理：401 自動 refresh → 導向登入、其他錯誤 toast 通知
// ============================================

api.interceptors.response.use(
  response => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const customConfig = error.config as ApiRequestConfig | undefined

    // 如果請求設定了跳過錯誤處理，直接拋出
    if (customConfig?.skipErrorHandler) {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const responseData = error.response?.data
    const originalRequest = error.config

    // 401 未認證 → Mock 模式直接登出；API 模式先嘗試 refresh
    if (status === 401) {
      // Mock 模式、refresh 請求本身、登入請求 → 直接登出不嘗試 refresh
      const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh')
      const isLoginRequest =
        originalRequest?.url?.includes('/auth/dev-login') ||
        originalRequest?.url?.includes('/auth/slack')
      const isMockMode = import.meta.env.VITE_USE_MOCK === 'true'

      if (isMockMode || isRefreshRequest || isLoginRequest) {
        await forceLogout()
        return Promise.reject(
          new ApiError({
            message: '登入已過期，請重新登入',
            statusCode: 401,
            errorCode: responseData?.code || 'AUTH_EXPIRED',
          }),
        )
      }

      const refreshToken = localStorage.getItem('auth_refresh_token')

      // 沒有 refresh token → 直接登出
      if (!refreshToken) {
        await forceLogout()
        return Promise.reject(
          new ApiError({
            message: '登入已過期，請重新登入',
            statusCode: 401,
            errorCode: responseData?.code || 'AUTH_EXPIRED',
          }),
        )
      }

      // 已有 refresh 進行中 → 加入等候隊列
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(newToken => {
          if (originalRequest) {
            originalRequest.headers = originalRequest.headers ?? {}
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            return api(originalRequest)
          }
        })
      }

      // 發起 refresh
      isRefreshing = true

      try {
        const response = await axios.post<{
          success: boolean
          data: { token: string; refreshToken: string }
        }>(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        )

        const { token: newToken, refreshToken: newRefreshToken } = response.data.data

        localStorage.setItem('auth_token', newToken)
        localStorage.setItem('auth_refresh_token', newRefreshToken)

        // 同步更新 authStore（若已初始化）
        try {
          const { useAuthStore } = await import('@/stores/auth')
          const authStore = useAuthStore()
          // 重新取得使用者資訊以確保 store 狀態同步
          if (!authStore.user) {
            await authStore.initAuth()
          }
        } catch {
          // store 更新失敗不影響主流程
        }

        processQueue(null, newToken)

        if (originalRequest) {
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        await forceLogout()
        return Promise.reject(
          new ApiError({
            message: '登入已過期，請重新登入',
            statusCode: 401,
            errorCode: 'AUTH_EXPIRED',
          }),
        )
      } finally {
        isRefreshing = false
      }
    }

    // 403 權限不足
    if (status === 403) {
      showErrorToast('您沒有權限執行此操作')

      return Promise.reject(
        new ApiError({
          message: '您沒有權限執行此操作',
          statusCode: 403,
          errorCode: responseData?.code || 'PERM_DENIED',
        }),
      )
    }

    // 網路錯誤（無 response）
    if (!error.response) {
      const message = error.message?.includes('timeout')
        ? '請求超時，請稍後再試'
        : '網路連線異常，請檢查網路狀態'

      showErrorToast(message)

      return Promise.reject(
        new ApiError({
          message,
          statusCode: 0,
          errorCode: error.message?.includes('timeout') ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
        }),
      )
    }

    // 伺服器錯誤（5xx）
    if (status && status >= 500) {
      showErrorToast('伺服器發生錯誤，請稍後再試')

      return Promise.reject(
        new ApiError({
          message: responseData?.message || '伺服器發生錯誤，請稍後再試',
          statusCode: status,
          errorCode: responseData?.code || 'SERVER_ERROR',
        }),
      )
    }

    // 其他客戶端錯誤（4xx）
    const errorMessage = responseData?.message || '請求發生錯誤'
    showErrorToast(errorMessage)

    return Promise.reject(
      new ApiError({
        message: errorMessage,
        statusCode: status || 0,
        errorCode: responseData?.code || 'UNKNOWN_ERROR',
      }),
    )
  },
)

// ============================================
// Toast 通知輔助函數
// 使用延遲載入避免循環依賴
// ============================================

const showErrorToast = (message: string): void => {
  // 延遲執行，確保 Vue 應用已初始化
  setTimeout(async () => {
    try {
      const { useToast } = await import('@/composables/useToast')
      const { showError } = useToast()
      showError(message)
    } catch {
      // Toast 載入失敗時，降級為開發環境 console
      if (import.meta.env.DEV) {
        console.error(`[API Error] ${message}`)
      }
    }
  }, 0)
}

// ============================================
// 泛型 Request Helper
// 提供型別安全的 API 呼叫方法
// ============================================

/**
 * 發送 GET 請求並解析回應資料
 * @param url - API 路徑
 * @param config - 可選的請求設定
 * @returns 解析後的資料
 */
export const apiGet = async <T>(url: string, config?: ApiRequestConfig): Promise<T> => {
  const { data } = await api.get<T>(url, config)
  return data
}

/**
 * 發送 POST 請求並解析回應資料
 * @param url - API 路徑
 * @param payload - 請求資料
 * @param config - 可選的請求設定
 * @returns 解析後的資料
 */
export const apiPost = async <T>(
  url: string,
  payload?: unknown,
  config?: ApiRequestConfig,
): Promise<T> => {
  const { data } = await api.post<T>(url, payload, config)
  return data
}

/**
 * 發送 PATCH 請求並解析回應資料
 * @param url - API 路徑
 * @param payload - 請求資料
 * @param config - 可選的請求設定
 * @returns 解析後的資料
 */
export const apiPatch = async <T>(
  url: string,
  payload?: unknown,
  config?: ApiRequestConfig,
): Promise<T> => {
  const { data } = await api.patch<T>(url, payload, config)
  return data
}

/**
 * 發送 PUT 請求並解析回應資料
 * @param url - API 路徑
 * @param payload - 請求資料
 * @param config - 可選的請求設定
 * @returns 解析後的資料
 */
export const apiPut = async <T>(
  url: string,
  payload?: unknown,
  config?: ApiRequestConfig,
): Promise<T> => {
  const { data } = await api.put<T>(url, payload, config)
  return data
}

/**
 * 發送 DELETE 請求並解析回應資料
 * @param url - API 路徑
 * @param config - 可選的請求設定
 * @returns 解析後的資料
 */
export const apiDelete = async <T>(url: string, config?: ApiRequestConfig): Promise<T> => {
  const { data } = await api.delete<T>(url, config)
  return data
}

// ============================================
// 後端 ApiResponse 格式的包裝方法
// 自動解包 { success, data, error } 結構
// ============================================

/**
 * 發送請求並解包後端 ApiResponse 格式
 * 若回應為 { success: true, data: T }，直接回傳 data
 * 若回應為 { success: false, error }，拋出 ApiError
 *
 * @param url - API 路徑
 * @param config - 可選的請求設定
 * @returns 解包後的資料
 */
export const apiGetUnwrap = async <T>(url: string, config?: ApiRequestConfig): Promise<T> => {
  const response = await apiGet<ApiResponse<T>>(url, config)
  return unwrapApiResponse(response)
}

/**
 * 發送 POST 請求並解包後端 ApiResponse 格式
 */
export const apiPostUnwrap = async <T>(
  url: string,
  payload?: unknown,
  config?: ApiRequestConfig,
): Promise<T> => {
  const response = await apiPost<ApiResponse<T>>(url, payload, config)
  return unwrapApiResponse(response)
}

/**
 * 發送 PATCH 請求並解包後端 ApiResponse 格式
 */
export const apiPatchUnwrap = async <T>(
  url: string,
  payload?: unknown,
  config?: ApiRequestConfig,
): Promise<T> => {
  const response = await apiPatch<ApiResponse<T>>(url, payload, config)
  return unwrapApiResponse(response)
}

/**
 * 發送 PUT 請求並解包後端 ApiResponse 格式
 */
export const apiPutUnwrap = async <T>(
  url: string,
  payload?: unknown,
  config?: ApiRequestConfig,
): Promise<T> => {
  const response = await apiPut<ApiResponse<T>>(url, payload, config)
  return unwrapApiResponse(response)
}

/**
 * 發送 DELETE 請求並解包後端 ApiResponse 格式
 */
export const apiDeleteUnwrap = async <T>(url: string, config?: ApiRequestConfig): Promise<T> => {
  const response = await apiDelete<ApiResponse<T>>(url, config)
  return unwrapApiResponse(response)
}

/**
 * 解包 ApiResponse 結構
 * 成功時回傳 data，失敗時拋出 ApiError
 */
const unwrapApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.success && response.data !== undefined) {
    return response.data
  }

  throw new ApiError({
    message: response.error?.message || '未知錯誤',
    statusCode: 0,
    errorCode: response.error?.code || 'UNKNOWN_ERROR',
    errorDetails: response.error?.details,
  })
}

// ============================================
// 請求取消工具
// ============================================

/**
 * 建立可取消的請求 token
 * 用於在元件卸載時取消進行中的請求
 *
 * @example
 * ```ts
 * const { controller, cancel } = createCancelToken()
 * apiGet('/tasks', { signal: controller.signal })
 * // 取消請求
 * cancel('元件已卸載')
 * ```
 */
export const createCancelToken = (): CancelTokenSource => {
  const controller = new AbortController()

  return {
    controller,
    cancel: (reason?: string) => {
      controller.abort(reason || '請求已取消')
    },
  }
}

// ============================================
// 預設匯出 Axios 實例（向後相容）
// 既有的 Service 仍可透過 import api from './api' 使用
// ============================================

export default api
