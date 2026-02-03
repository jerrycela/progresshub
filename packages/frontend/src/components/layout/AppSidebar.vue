<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { SIDEBAR_MENU_CLASSES } from '@/constants/ui'

// ============================================
// 側邊選單元件 - Ralph Loop 迭代 11 重構
// 移至 layout 目錄，使用 SIDEBAR_MENU_CLASSES 常數
// Ralph Loop 迭代 16: RWD - 行動裝置響應式側邊欄
// ============================================

interface Props {
  /** 行動裝置側邊欄展開狀態 */
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
})

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 選單項目定義
interface MenuItem {
  name: string
  path: string
  icon: string
  roles?: ('MEMBER' | 'PM' | 'ADMIN')[]
}

const menuItems: MenuItem[] = [
  {
    name: '儀表板',
    path: '/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: '需求池',
    path: '/backlog',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    name: '我的任務',
    path: '/my-tasks',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    name: '進度回報',
    path: '/report',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  {
    name: '甘特圖',
    path: '/gantt',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
]

const pmMenuItems: MenuItem[] = [
  {
    name: '追殺清單',
    path: '/pm/chase',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    roles: ['PM', 'ADMIN'],
  },
  {
    name: '職能負載',
    path: '/pm/workload',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    roles: ['PM', 'ADMIN'],
  },
  {
    name: '專案管理',
    path: '/projects',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    roles: ['PM', 'ADMIN'],
  },
]

const adminMenuItems: MenuItem[] = [
  {
    name: '員工管理',
    path: '/admin/users',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['ADMIN'],
  },
]

// 根據使用者角色過濾選單
const filteredPmMenuItems = computed(() => {
  if (!authStore.user) return []
  return pmMenuItems.filter(
    item => !item.roles || item.roles.includes(authStore.user!.role)
  )
})

const filteredAdminMenuItems = computed(() => {
  if (!authStore.user) return []
  return adminMenuItems.filter(
    item => !item.roles || item.roles.includes(authStore.user!.role)
  )
})

const isActive = (path: string) => route.path === path

// 使用常數組合樣式類別
const getMenuItemClass = (path: string) => [
  SIDEBAR_MENU_CLASSES.base,
  isActive(path) ? SIDEBAR_MENU_CLASSES.active : SIDEBAR_MENU_CLASSES.inactive,
]

const navigateTo = (path: string) => {
  router.push(path)
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <!-- 行動裝置側邊欄 (滑入式) -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
      props.isOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <!-- 行動裝置關閉按鈕 -->
    <div class="lg:hidden flex items-center justify-between h-16 px-4 border-b border-gray-800">
      <span class="text-lg font-bold">選單</span>
      <button
        class="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        @click="emit('close')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 選單區域 -->
    <nav class="flex-1 py-4 overflow-y-auto">
      <!-- 主選單 -->
      <div class="px-3 mb-6">
        <p class="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          主選單
        </p>
        <ul class="space-y-1">
          <li v-for="item in menuItems" :key="item.path">
            <button
              :class="getMenuItemClass(item.path)"
              @click="navigateTo(item.path)"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
              </svg>
              <span class="font-medium">{{ item.name }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- PM 選單 -->
      <div v-if="filteredPmMenuItems.length > 0" class="px-3 mb-6">
        <p class="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          PM 專區
        </p>
        <ul class="space-y-1">
          <li v-for="item in filteredPmMenuItems" :key="item.path">
            <button
              :class="getMenuItemClass(item.path)"
              @click="navigateTo(item.path)"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
              </svg>
              <span class="font-medium">{{ item.name }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Admin 選單 -->
      <div v-if="filteredAdminMenuItems.length > 0" class="px-3 mb-6">
        <p class="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          系統管理
        </p>
        <ul class="space-y-1">
          <li v-for="item in filteredAdminMenuItems" :key="item.path">
            <button
              :class="getMenuItemClass(item.path)"
              @click="navigateTo(item.path)"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
              </svg>
              <span class="font-medium">{{ item.name }}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- 底部登出按鈕 -->
    <div class="p-3 border-t border-gray-800">
      <button
        :class="[SIDEBAR_MENU_CLASSES.base, SIDEBAR_MENU_CLASSES.inactive]"
        @click="handleLogout"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span class="font-medium">登出</span>
      </button>
    </div>
  </aside>
</template>
