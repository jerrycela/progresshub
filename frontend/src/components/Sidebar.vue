<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const isActive = (path: string) => route.path === path
</script>

<template>
  <aside class="sidebar">
    <div class="p-4 border-b border-gray-800">
      <h1 class="text-xl font-bold text-white">ProgressHub</h1>
      <p class="text-sm text-gray-400">專案進度回報系統</p>
    </div>

    <nav class="mt-4">
      <!-- 員工通用選單 -->
      <RouterLink to="/dashboard" class="sidebar-link" :class="{ active: isActive('/dashboard') }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        儀表板
      </RouterLink>

      <RouterLink to="/my-tasks" class="sidebar-link" :class="{ active: isActive('/my-tasks') }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        我的任務
      </RouterLink>

      <RouterLink to="/report" class="sidebar-link" :class="{ active: isActive('/report') }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        進度回報
      </RouterLink>

      <!-- 工時追蹤 -->
      <div class="px-4 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase">
        工時追蹤
      </div>

      <RouterLink to="/timesheet" class="sidebar-link" :class="{ active: isActive('/timesheet') }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        工時填報
      </RouterLink>

      <RouterLink to="/timesheet/stats" class="sidebar-link" :class="{ active: isActive('/timesheet/stats') }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        工時統計
      </RouterLink>

      <!-- PM/Admin 選單 -->
      <template v-if="authStore.isPM">
        <div class="px-4 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase">
          專案管理
        </div>

        <RouterLink to="/gantt" class="sidebar-link" :class="{ active: isActive('/gantt') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          甘特圖
        </RouterLink>

        <RouterLink to="/projects" class="sidebar-link" :class="{ active: isActive('/projects') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          專案管理
        </RouterLink>

        <RouterLink to="/approval/timesheet" class="sidebar-link" :class="{ active: isActive('/approval/timesheet') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          工時審核
        </RouterLink>

        <RouterLink to="/reports/utilization" class="sidebar-link" :class="{ active: isActive('/reports/utilization') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          利用率分析
        </RouterLink>
      </template>

      <!-- Admin 選單 -->
      <template v-if="authStore.isAdmin">
        <div class="px-4 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase">
          系統管理
        </div>

        <RouterLink to="/admin/employees" class="sidebar-link" :class="{ active: isActive('/admin/employees') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          員工管理
        </RouterLink>

        <RouterLink to="/reports/cost" class="sidebar-link" :class="{ active: isActive('/reports/cost') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          成本報表
        </RouterLink>
      </template>
    </nav>

    <!-- 用戶資訊 -->
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
          <span class="text-white font-medium">{{ authStore.user?.name?.charAt(0) }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">{{ authStore.user?.name }}</p>
          <p class="text-xs text-gray-400 truncate">{{ authStore.user?.email }}</p>
        </div>
        <button @click="authStore.logout()" class="text-gray-400 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
