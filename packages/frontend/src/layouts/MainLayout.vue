<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'

// 主框架佈局元件 - 包含 Header + Sidebar + 內容區
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
  </div>
</template>
