<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { roleLabels, functionTypeLabels } from '@/mocks/data'
import Badge from '@/components/common/Badge.vue'

// ============================================
// 頂部導航列元件 - Ralph Loop 迭代 11 重構
// 移至 layout 目錄，使用共用標籤常數
// Ralph Loop 迭代 16: RWD - 行動裝置選單按鈕
// ============================================

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const authStore = useAuthStore()

const user = computed(() => authStore.user)
const roleLabel = computed(() => user.value ? roleLabels[user.value.role] : '')
const functionLabel = computed(() => user.value ? functionTypeLabels[user.value.functionType] : '')
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
    <!-- 左側：選單按鈕 + Logo -->
    <div class="flex items-center gap-3">
      <!-- 行動裝置選單按鈕 -->
      <button
        class="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        @click="emit('toggle-sidebar')"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Logo 與標題 -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span class="text-lg md:text-xl font-bold text-gray-900">ProgressHub</span>
      </div>
    </div>

    <!-- 右側：使用者資訊 -->
    <div v-if="user" class="flex items-center gap-2 md:gap-4">
      <!-- 通知鈴鐺 -->
      <button class="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <!-- 通知紅點 -->
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      <!-- 使用者資訊 -->
      <div class="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-gray-200">
        <img
          :src="user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`"
          :alt="user.name"
          class="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100"
        >
        <div class="hidden sm:block">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">{{ user.name }}</span>
            <Badge variant="primary" size="sm">{{ roleLabel }}</Badge>
          </div>
          <span class="text-sm text-gray-500">{{ functionLabel }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
