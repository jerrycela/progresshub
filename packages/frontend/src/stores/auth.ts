import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole, ActionResult } from 'shared/types'
import { createAuthService } from '@/services/authService'
import { mockUsers } from '@/mocks/unified'

// ============================================
// Auth Store - Service Layer 重構
// 透過 AuthService 抽象層處理認證邏輯
// ============================================

const service = createAuthService()

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null) // 初始為 null，透過 initAuth() 載入
  const error = ref<string | null>(null)

  // Loading 狀態（細粒度）
  const loading = ref({
    login: false,
    logout: false,
  })

  // 相容舊版 isLoading
  const isLoading = computed(() => loading.value.login || loading.value.logout)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => user.value?.role || null)
  const userName = computed(() => user.value?.name || '')
  const userFunctionType = computed(() => user.value?.functionType || null)

  const isPM = computed(() => user.value?.role === 'PM' || user.value?.role === 'ADMIN')

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  // Actions
  const initAuth = async (): Promise<ActionResult<User>> => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: '未找到認證 token' },
      }
    }

    try {
      const result = await service.getCurrentUser()
      if (result.success && result.data) {
        user.value = result.data
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : '初始化認證失敗'
      return {
        success: false,
        error: { code: 'AUTH_LOGIN_FAILED', message },
      }
    }
  }

  const login = async (slackCode?: string): Promise<ActionResult<User>> => {
    loading.value.login = true
    error.value = null

    try {
      const result = await service.loginWithSlack(slackCode || '')
      if (result.success && result.data) {
        user.value = result.data.user
        localStorage.setItem('auth_token', result.data.token)
        return { success: true, data: result.data.user }
      }

      return {
        success: false,
        error: result.error || { code: 'AUTH_LOGIN_FAILED', message: '登入失敗' },
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '登入失敗，請稍後再試'
      error.value = message

      return {
        success: false,
        error: {
          code: 'AUTH_LOGIN_FAILED',
          message,
        },
      }
    } finally {
      loading.value.login = false
    }
  }

  const logout = async (): Promise<ActionResult> => {
    loading.value.logout = true
    error.value = null

    try {
      await service.logout()
      user.value = null
      localStorage.removeItem('auth_token')

      return { success: true }
    } catch (e) {
      const message = e instanceof Error ? e.message : '登出失敗'
      error.value = message

      return {
        success: false,
        error: {
          code: 'AUTH_LOGOUT_FAILED',
          message,
        },
      }
    } finally {
      loading.value.logout = false
    }
  }

  const switchUser = (userId: string): ActionResult<User> => {
    // Dev-only: 切換使用者（方便測試不同角色）
    const newUser = mockUsers.find((u: User) => u.id === userId)
    if (newUser) {
      user.value = newUser
      return { success: true, data: newUser }
    }

    return {
      success: false,
      error: {
        code: 'AUTH_UNAUTHORIZED',
        message: '找不到指定的使用者',
      },
    }
  }

  const hasRole = (roles: UserRole[]) => {
    return user.value ? roles.includes(user.value.role) : false
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    user,
    error,
    loading,
    isLoading,
    // Getters
    isAuthenticated,
    userRole,
    userName,
    userFunctionType,
    isPM,
    isAdmin,
    // Actions
    login,
    logout,
    initAuth,
    switchUser,
    hasRole,
    clearError,
  }
})
