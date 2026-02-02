import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import { saveToken, getToken, clearAllSensitiveData } from '@/utils/security'
import type { User, PermissionLevel } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const isEmployee = computed(() => user.value?.permissionLevel === 'EMPLOYEE')
  const isPM = computed(() => user.value?.permissionLevel === 'PM' || user.value?.permissionLevel === 'ADMIN')
  const isAdmin = computed(() => user.value?.permissionLevel === 'ADMIN')

  const hasPermission = (level: PermissionLevel) => {
    if (!user.value) return false
    const levels: PermissionLevel[] = ['EMPLOYEE', 'PM', 'ADMIN']
    return levels.indexOf(user.value.permissionLevel) >= levels.indexOf(level)
  }

  /**
   * 初始化：從安全存儲載入 token
   */
  function initialize() {
    const storedToken = getToken()
    // 也檢查舊的 localStorage（向後相容）
    const legacyToken = localStorage.getItem('token')

    if (storedToken) {
      token.value = storedToken
    } else if (legacyToken) {
      // 遷移舊 token 到安全存儲
      token.value = legacyToken
      saveToken(legacyToken)
      localStorage.removeItem('token')
    }
  }

  async function login(code: string) {
    loading.value = true
    try {
      const response = await authApi.slackLogin(code)
      token.value = response.data.token
      user.value = response.data.user
      // 使用安全存儲
      saveToken(response.data.token)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return
    loading.value = true
    try {
      const response = await authApi.getMe()
      user.value = response.data.user
    } catch (error) {
      console.error('Fetch user failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    // 清除所有敏感資料
    clearAllSensitiveData()
  }

  // 初始化時載入 token
  initialize()

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isEmployee,
    isPM,
    isAdmin,
    hasPermission,
    initialize,
    login,
    fetchUser,
    logout,
  }
})
