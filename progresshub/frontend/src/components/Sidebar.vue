<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isActive = (path: string) => route.path === path

const getThemeIcon = () => {
  if (themeStore.theme === 'light') return 'sun'
  if (themeStore.theme === 'dark') return 'moon'
  return 'system'
}

const getThemeLabel = () => {
  if (themeStore.theme === 'light') return '淺色模式'
  if (themeStore.theme === 'dark') return '深色模式'
  return '跟隨系統'
}
</script>

<template>
  <aside class="sidebar">
    <!-- Logo Section -->
    <div class="p-5 border-b border-gray-800/50">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-white tracking-tight">ProgressHub</h1>
          <p class="text-xs text-gray-500">專案進度管理</p>
        </div>
      </div>
    </div>

    <nav class="mt-2 px-3">
      <!-- 員工通用選單 -->
      <div class="space-y-1">
        <RouterLink to="/dashboard" class="sidebar-link" :class="{ active: isActive('/dashboard') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>儀表板</span>
        </RouterLink>

        <RouterLink to="/my-tasks" class="sidebar-link" :class="{ active: isActive('/my-tasks') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>我的任務</span>
        </RouterLink>

        <RouterLink to="/report" class="sidebar-link" :class="{ active: isActive('/report') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>進度回報</span>
        </RouterLink>

        <RouterLink to="/timesheet" class="sidebar-link" :class="{ active: isActive('/timesheet') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>工時登記</span>
        </RouterLink>

        <RouterLink to="/timesheet/stats" class="sidebar-link" :class="{ active: isActive('/timesheet/stats') }">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>工時統計</span>
        </RouterLink>
      </div>

      <!-- PM/Admin 選單 -->
      <template v-if="authStore.isPM">
        <div class="mt-6 mb-2">
          <span class="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            專案管理
          </span>
        </div>

        <div class="space-y-1">
          <RouterLink to="/gantt" class="sidebar-link" :class="{ active: isActive('/gantt') }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>甘特圖</span>
          </RouterLink>

          <RouterLink to="/projects" class="sidebar-link" :class="{ active: isActive('/projects') }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>專案管理</span>
          </RouterLink>

          <RouterLink to="/approval/timesheet" class="sidebar-link" :class="{ active: isActive('/approval/timesheet') }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>工時審核</span>
          </RouterLink>

          <RouterLink to="/reports/utilization" class="sidebar-link" :class="{ active: isActive('/reports/utilization') }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>團隊利用率</span>
          </RouterLink>
        </div>
      </template>

      <!-- Admin 選單 -->
      <template v-if="authStore.isAdmin">
        <div class="mt-6 mb-2">
          <span class="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            系統管理
          </span>
        </div>

        <div class="space-y-1">
          <RouterLink to="/admin/employees" class="sidebar-link" :class="{ active: isActive('/admin/employees') }">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>員工管理</span>
          </RouterLink>
        </div>
      </template>
    </nav>

    <!-- 底部區域：主題切換 + 用戶資訊 -->
    <div class="absolute bottom-0 left-0 right-0 border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
      <!-- 主題切換 -->
      <div class="px-4 py-3 border-b border-gray-800/50">
        <button
          @click="themeStore.cycleTheme()"
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg
                 text-gray-400 hover:text-white hover:bg-gray-800/80
                 transition-all duration-200 cursor-pointer group"
          :aria-label="'切換主題: ' + getThemeLabel()"
        >
          <div class="flex items-center gap-3">
            <!-- Sun Icon (Light) -->
            <svg
              v-if="getThemeIcon() === 'sun'"
              class="w-5 h-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <!-- Moon Icon (Dark) -->
            <svg
              v-else-if="getThemeIcon() === 'moon'"
              class="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <!-- System Icon -->
            <svg
              v-else
              class="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span class="text-sm">{{ getThemeLabel() }}</span>
          </div>
          <!-- Indicator -->
          <svg
            class="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- 用戶資訊 -->
      <div class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span class="text-white font-semibold">{{ authStore.user?.name?.charAt(0) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ authStore.user?.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
          </div>
          <button
            @click="authStore.logout()"
            class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 cursor-pointer"
            aria-label="登出"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
