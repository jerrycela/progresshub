import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Role } from 'shared/types'
import { mockCurrentUser, mockUsers } from '@/mocks/data'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(mockCurrentUser) // Mock: 預設已登入
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => user.value?.role || null)
  const userName = computed(() => user.value?.name || '')
  const userFunctionType = computed(() => user.value?.functionType || null)

  const isPM = computed(() =>
    user.value?.role === 'PM' || user.value?.role === 'ADMIN'
  )

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  // Actions
  const login = async (_slackCode?: string) => {
    // Mock login - 實際會呼叫 Slack OAuth API
    isLoading.value = true
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      user.value = mockCurrentUser
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  const switchUser = (userId: string) => {
    // Mock: 切換使用者（方便測試不同角色）
    const newUser = mockUsers.find(u => u.id === userId)
    if (newUser) {
      user.value = newUser
    }
  }

  const hasRole = (roles: Role[]) => {
    return user.value ? roles.includes(user.value.role) : false
  }

  return {
    // State
    user,
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
  }
})
