<script setup lang="ts">
import { AppHeader, AppSidebar } from '@/components/layout'
import Toast from '@/components/common/Toast.vue'

// ============================================
// 主框架佈局元件 - 包含 Header + Sidebar + 內容區 + Toast
// Ralph Loop 迭代 7: 新增全域 Toast 容器
// Ralph Loop 迭代 11: 使用重構後的 layout 元件
// ============================================
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- 側邊選單 -->
    <AppSidebar />

    <!-- 主內容區 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 頂部導航 -->
      <AppHeader />

      <!-- 頁面內容 -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>

    <!-- 全域 Toast 通知 -->
    <Toast />
  </div>
</template>
