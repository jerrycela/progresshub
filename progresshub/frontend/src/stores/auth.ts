import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
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

  async function login(code: string) {
    loading.value = true
    try {
      const response = await authApi.slackLogin(code)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', response.data.token)
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
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isEmployee,
    isPM,
    isAdmin,
    hasPermission,
    login,
    fetchUser,
    logout,
  }
})
