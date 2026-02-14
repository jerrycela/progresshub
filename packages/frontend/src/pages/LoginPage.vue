<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/common/Button.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)

const redirectAfterLogin = () => {
  const redirect = route.query.redirect as string
  router.push(redirect || '/dashboard')
}

// Slack OAuth 登入
const handleSlackLogin = async () => {
  isLoading.value = true
  try {
    const result = await authStore.login()
    if (result.success) {
      redirectAfterLogin()
    }
  } finally {
    isLoading.value = false
  }
}

// Demo 快速登入（獨立路徑，不依賴 VITE_USE_MOCK）
const handleDemoLogin = async () => {
  isLoading.value = true
  try {
    const result = await authStore.demoLogin()
    if (result.success) {
      redirectAfterLogin()
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- SG-Arts 精品金屬質感登入頁 -->
  <div
    class="min-h-screen flex items-center justify-center p-4"
    style="background: linear-gradient(135deg, #1a1a1a 0%, #262626 50%, #1a1a1a 100%)"
  >
    <div class="w-full max-w-md">
      <!-- Logo 與標題 - 金屬質感 -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style="
            background: linear-gradient(145deg, #303030, #262626);
            box-shadow:
              4px 4px 8px #1a1a1a,
              -4px -4px 8px #333333;
          "
        >
          <!-- 侍魂赤紅圖示 -->
          <svg class="w-10 h-10 text-samurai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">ProgressHub</h1>
        <p class="text-ink-muted">專案進度管理系統</p>
      </div>

      <!-- 登入卡片 - 精緻金屬風格 -->
      <div
        class="rounded-2xl p-8"
        style="
          background-color: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
        "
      >
        <h2 class="text-xl font-semibold text-center mb-6" style="color: var(--text-primary)">
          歡迎回來
        </h2>

        <p class="text-center mb-8" style="color: var(--text-secondary)">
          請使用公司 Slack 帳號登入系統
        </p>

        <!-- Slack 登入按鈕 -->
        <Button
          :loading="isLoading"
          block
          class="!bg-[#4A154B] hover:!bg-[#611f69] !text-white"
          @click="handleSlackLogin"
        >
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
            />
          </svg>
          使用 Slack 登入
        </Button>

        <!-- 分隔線 -->
        <div class="flex items-center my-6">
          <div class="flex-1 border-t" style="border-color: var(--border-primary)"></div>
          <span class="px-3 text-sm" style="color: var(--text-muted)">或</span>
          <div class="flex-1 border-t" style="border-color: var(--border-primary)"></div>
        </div>

        <!-- Demo 登入按鈕 - 侍魂赤紅 -->
        <Button variant="primary" block :loading="isLoading" @click="handleDemoLogin">
          Demo 模式快速登入
        </Button>

        <p v-if="authStore.error" class="text-red-400 text-sm text-center mt-4">
          {{ authStore.error }}
        </p>

        <p class="text-xs text-center mt-6" style="color: var(--text-muted)">
          登入即表示您同意我們的服務條款與隱私政策
        </p>
      </div>

      <!-- 底部版權 -->
      <p class="text-ink-muted text-sm text-center mt-8">
        © 2026 SG-Arts ProgressHub. All rights reserved.
      </p>
    </div>
  </div>
</template>
