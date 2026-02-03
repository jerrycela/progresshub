<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AppHeader, AppSidebar } from '@/components/layout'
import Toast from '@/components/common/Toast.vue'

// ============================================
// 主框架佈局元件 - 包含 Header + Sidebar + 內容區 + Toast
// Ralph Loop 迭代 7: 新增全域 Toast 容器
// Ralph Loop 迭代 11: 使用重構後的 layout 元件
// Ralph Loop 迭代 16: RWD - 行動裝置側邊欄切換
// ============================================

const route = useRoute()

// 側邊欄展開狀態（行動裝置）
const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

// 路由變更時自動關閉側邊欄（行動裝置）
watch(() => route.path, () => {
  closeSidebar()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- 行動裝置遮罩 -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 bg-black/50 z-40 lg:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <!-- 側邊選單 -->
    <AppSidebar
      :is-open="isSidebarOpen"
      @close="closeSidebar"
    />

    <!-- 主內容區 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 頂部導航 -->
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <!-- 頁面內容 -->
      <main class="flex-1 p-4 md:p-6 overflow-auto">
        <slot />
      </main>
    </div>

    <!-- 全域 Toast 通知 -->
    <Toast />
  </div>
</template>
