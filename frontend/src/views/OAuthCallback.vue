<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { verifyOAuthState } from '@/utils/security'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const error = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const errorParam = route.query.error as string

  if (errorParam) {
    error.value = '授權被拒絕或發生錯誤'
    loading.value = false
    return
  }

  if (!code) {
    error.value = '缺少授權碼'
    loading.value = false
    return
  }

  // 驗證 state 參數（CSRF 防護）
  if (!state || !verifyOAuthState(state)) {
    error.value = '安全驗證失敗，請重新登入'
    loading.value = false
    return
  }

  try {
    const success = await authStore.login(code)
    if (success) {
      router.push('/dashboard')
    } else {
      error.value = '登入失敗，請重試'
    }
  } catch (e) {
    error.value = '登入過程發生錯誤'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="card max-w-md w-full mx-4 text-center">
      <template v-if="loading">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">正在登入中...</p>
      </template>

      <template v-else-if="error">
        <div class="text-red-500 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-gray-800 font-medium">{{ error }}</p>
        <RouterLink to="/login" class="btn btn-primary mt-4 inline-block">
          返回登入頁
        </RouterLink>
      </template>
    </div>
  </div>
</template>
