<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { roleLabels, functionTypeLabels } from '@/constants/labels'
import Badge from '@/components/common/Badge.vue'

// ============================================
// 頂部導航列元件 - SG-Arts 精品金屬質感設計
// 加入 Dark mode 切換按鈕
// ============================================

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const router = useRouter()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()

const user = computed(() => authStore.user)
const roleLabel = computed(() => user.value ? roleLabels[user.value.role] : '')
const functionLabel = computed(() => user.value ? functionTypeLabels[user.value.functionType] : '')

// 導向個人設定頁
const goToSettings = (): void => {
  router.push('/settings/profile')
}
</script>

<template>
  <header
    class="h-14 flex items-center justify-between px-4 md:px-6"
    style="background-color: var(--bg-primary); border-bottom: 1px solid var(--border-primary);"
  >
    <!-- 左側：選單按鈕 + Logo -->
    <div class="flex items-center gap-3">
      <!-- 行動裝置選單按鈕 -->
      <button
        class="lg:hidden p-2 -ml-2 rounded-md transition-colors duration-150 hover-bg"
        style="color: var(--text-secondary);"
        @click="emit('toggle-sidebar')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Logo 與標題 -->
      <div class="flex items-center gap-2.5">
        <!-- SG-Arts 風格 Logo：簡約金屬質感 -->
        <div
          class="w-8 h-8 rounded-md flex items-center justify-center"
          style="background-color: var(--accent);"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span class="text-lg font-semibold" style="color: var(--text-primary);">
          ProgressHub
        </span>
      </div>
    </div>

    <!-- 右側：工具列 + 使用者資訊 -->
    <div class="flex items-center gap-2 md:gap-3">
      <!-- 主題切換按鈕 -->
      <button
        class="p-2 rounded-md transition-colors duration-150 hover-bg"
        style="color: var(--text-secondary);"
        :title="isDark ? '切換到淺色模式' : '切換到深色模式'"
        @click="toggleTheme"
      >
        <!-- 太陽圖示 (Light mode) -->
        <svg
          v-if="isDark"
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <!-- 月亮圖示 (Dark mode) -->
        <svg
          v-else
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>

      <!-- 通知鈴鐺 -->
      <button
        class="relative p-2 rounded-md transition-colors duration-150 hover-bg"
        style="color: var(--text-secondary);"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <!-- 通知紅點 -->
        <span
          class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style="background-color: var(--accent);"
        />
      </button>

      <!-- 使用者資訊（可點擊導向設定頁） -->
      <button
        v-if="user"
        class="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 ml-1 rounded-lg transition-colors duration-150 cursor-pointer hover:bg-[var(--bg-secondary)] -mr-2 pr-2 py-1"
        style="border-left: 1px solid var(--border-primary);"
        title="前往個人設定"
        @click="goToSettings"
      >
        <img
          :src="user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`"
          :alt="user.name"
          class="w-8 h-8 rounded-full"
          style="background-color: var(--bg-tertiary);"
        >
        <div class="hidden sm:block text-left">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium" style="color: var(--text-primary);">
              {{ user.name }}
            </span>
            <Badge variant="primary" size="sm">{{ roleLabel }}</Badge>
          </div>
          <span class="text-xs" style="color: var(--text-tertiary);">
            {{ functionLabel }}
          </span>
        </div>
      </button>
    </div>
  </header>
</template>
