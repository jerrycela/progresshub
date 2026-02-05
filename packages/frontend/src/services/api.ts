// ============================================
// API Client
// ROI 優化：建立統一的 API 客戶端
// ============================================

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'

/**
 * API 基礎配置
 */
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * Token 存取 Key
 */
const TOKEN_KEY = 'progresshub_token'
const REFRESH_TOKEN_KEY = 'progresshub_refresh_token'

/**
 * 取得存儲的 Token
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 設置 Token
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 移除 Token
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * 取得 Refresh Token
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * 設置 Refresh Token
 */
export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

/**
 * 建立 Axios 實例
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create(API_CONFIG)

  // ============================================
  // 請求攔截器 - 添加認證 Token
  // ============================================
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getToken()

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }

      return config
    },
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )

  // ============================================
  // 回應攔截器 - 統一錯誤處理
  // ============================================
  instance.interceptors.response.use(
    (response) => {
      return response
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      // 401 未授權 - Token 過期處理
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        // 嘗試刷新 Token
        const refreshToken = getRefreshToken()
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_CONFIG.baseURL}/auth/refresh`, {
              refreshToken,
            })

            const { token: newToken, refreshToken: newRefreshToken } = response.data

            setToken(newToken)
            if (newRefreshToken) {
              setRefreshToken(newRefreshToken)
            }

            // 重試原始請求
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return instance(originalRequest)
          } catch (refreshError) {
            // Refresh 失敗，清除 Token 並導向登入頁
            removeToken()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        } else {
          // 沒有 Refresh Token，導向登入頁
          removeToken()
          window.location.href = '/login'
        }
      }

      // 403 禁止訪問
      if (error.response?.status === 403) {
        // 可以在這裡觸發權限不足的通知
        console.warn('[API] 權限不足:', error.config?.url)
      }

      // 500 伺服器錯誤
      if (error.response?.status === 500) {
        console.error('[API] 伺服器錯誤:', error.config?.url)
      }

      return Promise.reject(error)
    }
  )

  return instance
}

/**
 * API 客戶端實例（單例）
 */
export const apiClient = createApiClient()

/**
 * API 回應類型
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    total: number
    page: number
    limit: number
  }
}

/**
 * API 方法封裝
 */
export const api = {
  /**
   * GET 請求
   */
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, { params })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  /**
   * POST 請求
   */
  post: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.post<ApiResponse<T>>(url, data)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  /**
   * PUT 請求
   */
  put: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  /**
   * PATCH 請求
   */
  patch: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.patch<ApiResponse<T>>(url, data)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  /**
   * DELETE 請求
   */
  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url)
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

/**
 * 處理 API 錯誤並返回標準格式
 */
const handleApiError = <T>(error: unknown): ApiResponse<T> => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; code?: string }>

    return {
      success: false,
      error: {
        code: axiosError.response?.data?.code || `HTTP_${axiosError.response?.status || 'UNKNOWN'}`,
        message: axiosError.response?.data?.message || axiosError.message || '請求失敗',
      },
    }
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : '發生未知錯誤',
    },
  }
}

export default api
