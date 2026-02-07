import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole, ActionResult } from 'shared/types'
import { mockCurrentUser, mockUsers } from '@/mocks/unified'

// ============================================
// Auth Store - Ralph Loop 迭代 6 重構
// 新增錯誤處理與細粒度 Loading 狀態
// ============================================

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(mockCurrentUser) // Mock: 預設已登入
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
  const login = async (_slackCode?: string): Promise<ActionResult<User>> => {
    // Mock login - 實際會呼叫 Slack OAuth API
    loading.value.login = true
    error.value = null

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      user.value = mockCurrentUser

      return {
        success: true,
        data: mockCurrentUser,
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
      await new Promise(resolve => setTimeout(resolve, 300))
      user.value = null

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
    // Mock: 切換使用者（方便測試不同角色）
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
    switchUser,
    hasRole,
    clearError,
  }
})
