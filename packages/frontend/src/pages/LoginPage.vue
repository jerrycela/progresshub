<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { apiGetUnwrap } from '@/services/api'
import Button from '@/components/common/Button.vue'
import type { UserRole } from 'shared/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { showError } = useToast()
const isLoading = ref(false)

const demoName = ref('')
const demoRole = ref<UserRole>('EMPLOYEE')

const demoRoleOptions: { label: string; value: UserRole }[] = [
  { label: 'PM', value: 'PM' },
  { label: '一般同仁', value: 'EMPLOYEE' },
  { label: '製作人', value: 'PRODUCER' },
  { label: '管理者', value: 'ADMIN' },
]

interface ProjectName {
  id: string
  name: string
}
const projectOptions = ref<ProjectName[]>([])
const selectedProjects = ref<string[]>([])

const redirectAfterLogin = () => {
  const redirect = route.query.redirect as string
  // Prevent open redirect: only allow internal paths
  const safeRedirect =
    redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'
  router.push(safeRedirect)
}

const isDemoEnvironment = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true'

// Handle Slack OAuth callback — detect code+state in URL query params
onMounted(async () => {
  const code = route.query.code as string | undefined
  const state = route.query.state as string | undefined
  const errorMsg = route.query.error as string | undefined

  if (errorMsg) {
    showError(errorMsg)
    router.replace({ path: '/login' })
    return
  }

  if (code && state) {
    isLoading.value = true
    // Clean URL immediately to prevent resubmission
    router.replace({ path: '/login' })
    try {
      const result = await authStore.login(code, state)
      if (result.success) {
        redirectAfterLogin()
      } else {
        showError(result.error?.message || 'Slack 登入失敗')
      }
    } finally {
      isLoading.value = false
    }
  }

  // Load project names for demo login
  if (isDemoEnvironment) {
    try {
      projectOptions.value = await apiGetUnwrap<ProjectName[]>('/projects/names')
    } catch {
      // Silently fail
    }
  }
})

// Slack OAuth 登入 — redirect to Slack authorization page
const handleSlackLogin = async () => {
  isLoading.value = true
  try {
    const data = await apiGetUnwrap<{ authUrl: string }>('/auth/slack/authorize')
    // Redirect to Slack OAuth page
    window.location.href = data.authUrl
  } catch {
    showError('無法取得 Slack 授權連結，請稍後再試')
    isLoading.value = false
  }
}

// Demo 快速登入（獨立路徑，不依賴 VITE_USE_MOCK）
const handleDemoLogin = async () => {
  isLoading.value = true
  try {
    const result = await authStore.demoLogin(
      demoName.value.trim(),
      demoRole.value,
      selectedProjects.value,
    )
    if (result.success) {
      redirectAfterLogin()
    } else {
      const message = result.error?.message || 'Demo 登入失敗，請稍後再試'
      showError(message)
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

        <!-- 分隔線與 Demo 登入表單 - 僅在開發/測試環境顯示 -->
        <template v-if="isDemoEnvironment">
          <div class="flex items-center my-6">
            <div class="flex-1 border-t" style="border-color: var(--border-primary)"></div>
            <span class="px-3 text-sm" style="color: var(--text-muted)">或使用 Demo 登入</span>
            <div class="flex-1 border-t" style="border-color: var(--border-primary)"></div>
          </div>

          <!-- Demo 登入表單 -->
          <div class="space-y-4">
            <!-- 姓名輸入 -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--text-secondary)">
                姓名
              </label>
              <input
                v-model="demoName"
                type="text"
                class="input w-full"
                placeholder="請輸入您的姓名"
              />
            </div>

            <!-- 角色選擇 -->
            <div>
              <label class="block text-sm font-medium mb-1" style="color: var(--text-secondary)">
                角色
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="option in demoRoleOptions"
                  :key="option.value"
                  type="button"
                  class="px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
                  :class="
                    demoRole === option.value
                      ? 'border-samurai text-samurai bg-samurai/10'
                      : 'hover:border-samurai/50'
                  "
                  :style="
                    demoRole !== option.value
                      ? 'border-color: var(--border-primary); color: var(--text-secondary)'
                      : ''
                  "
                  @click="demoRole = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- 專案選擇 (ADMIN has global access, no project scoping needed) -->
            <div v-if="projectOptions.length > 0 && demoRole !== 'ADMIN'">
              <label class="block text-sm font-medium mb-1" style="color: var(--text-secondary)">
                所屬專案（可複選）
              </label>
              <div class="space-y-2">
                <label
                  v-for="project in projectOptions"
                  :key="project.id"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border"
                  :class="
                    selectedProjects.includes(project.id) ? 'border-samurai bg-samurai/10' : ''
                  "
                  :style="
                    !selectedProjects.includes(project.id)
                      ? 'border-color: var(--border-primary); color: var(--text-secondary)'
                      : ''
                  "
                >
                  <input
                    v-model="selectedProjects"
                    type="checkbox"
                    :value="project.id"
                    class="accent-samurai"
                  />
                  <span style="color: var(--text-primary)">{{ project.name }}</span>
                </label>
              </div>
            </div>

            <!-- Demo 登入按鈕 -->
            <Button
              variant="primary"
              block
              :loading="isLoading"
              :disabled="!demoName.trim()"
              @click="handleDemoLogin"
            >
              以 Demo 身分登入
            </Button>
          </div>
        </template>

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
