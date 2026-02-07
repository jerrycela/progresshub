<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// ============================================
// 設定頁面佈局 - 側邊選單 + 內容區
// ============================================

const route = useRoute()
const router = useRouter()

interface SettingsMenuItem {
  name: string
  path: string
  icon: string
}

const menuItems: SettingsMenuItem[] = [
  {
    name: '個人資料',
    path: '/settings/profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    name: '整合設定',
    path: '/settings/integrations',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
]

const isActive = (path: string): boolean => {
  return route.path === path
}

const navigateTo = (path: string): void => {
  router.push(path)
}

const goBack = (): void => {
  router.push('/dashboard')
}

const currentPageTitle = computed(() => {
  const currentItem = menuItems.find((item: SettingsMenuItem) => item.path === route.path)
  return currentItem?.name || '設定'
})
</script>

<template>
  <div class="space-y-6">
    <!-- 返回按鈕與標題 -->
    <div class="flex items-center gap-4">
      <button
        class="flex items-center gap-2 transition-colors cursor-pointer"
        style="color: var(--text-secondary)"
        @click="goBack"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>返回</span>
      </button>
      <h1 class="text-2xl font-bold" style="color: var(--text-primary)">
        {{ currentPageTitle }}
      </h1>
    </div>

    <!-- 主要內容區 -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 側邊選單 -->
      <div class="lg:col-span-1">
        <div class="card p-4">
          <nav class="space-y-1">
            <button
              v-for="item in menuItems"
              :key="item.path"
              :class="[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-left cursor-pointer',
                isActive(item.path)
                  ? 'bg-[var(--accent-primary)]/10'
                  : 'hover:bg-[var(--bg-secondary)]',
              ]"
              :style="{
                color: isActive(item.path) ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }"
              @click="navigateTo(item.path)"
            >
              <svg
                class="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  :d="item.icon"
                />
              </svg>
              <span class="text-sm font-medium">{{ item.name }}</span>
            </button>
          </nav>
        </div>
      </div>

      <!-- 內容區 -->
      <div class="lg:col-span-3">
        <router-view />
      </div>
    </div>
  </div>
</template>
