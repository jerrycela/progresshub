<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// ============================================
// 側邊選單元件 - SG-Arts 精品金屬質感設計
// 淺色側邊欄 + Dark mode 支援
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
  roles?: ('EMPLOYEE' | 'PM' | 'PRODUCER' | 'MANAGER' | 'ADMIN')[]
}

const menuItems: MenuItem[] = [
  {
    name: '儀表板',
    path: '/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: '任務池',
    path: '/task-pool',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    name: '我的任務',
    path: '/my-tasks',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    name: '甘特圖',
    path: '/gantt',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    name: '角色權限',
    path: '/roles',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
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
    (item: MenuItem) => !item.roles || item.roles.includes(authStore.user!.role),
  )
})

const filteredAdminMenuItems = computed(() => {
  if (!authStore.user) return []
  return adminMenuItems.filter(
    (item: MenuItem) => !item.roles || item.roles.includes(authStore.user!.role),
  )
})

const isActive = (path: string): boolean => {
  // 精確匹配或前綴匹配（用於子路由）
  if (route.path === path) return true
  // 對於像 /task-pool 這樣的路由，也要匹配 /task-pool/create、/task-pool/:id 等子路由
  if (path !== '/' && route.path.startsWith(path + '/')) return true
  return false
}

const navigateTo = (path: string): void => {
  router.push(path)
  // 行動裝置點擊後自動關閉側邊欄
  emit('close')
}

const handleLogout = async (): Promise<void> => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <!-- 行動裝置遮罩 -->
  <div
    v-if="props.isOpen"
    class="fixed inset-0 bg-black/20 z-40 lg:hidden"
    @click="emit('close')"
  />

  <!-- 側邊欄 -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200 ease-out',
      'lg:relative lg:translate-x-0',
      props.isOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
    style="background-color: var(--sidebar-bg); border-right: 1px solid var(--border-primary)"
  >
    <!-- 行動裝置標題列 -->
    <div
      class="lg:hidden flex items-center justify-between h-14 px-4"
      style="border-bottom: 1px solid var(--border-primary)"
    >
      <span class="text-sm font-semibold" style="color: var(--text-primary)">選單</span>
      <button
        class="p-2 rounded-md transition-colors duration-150"
        style="color: var(--text-tertiary)"
        @click="emit('close')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- 選單區域 -->
    <nav class="flex-1 py-4 overflow-y-auto">
      <!-- 主選單 -->
      <div class="px-3 mb-6">
        <p
          class="px-3 mb-2 text-xs font-medium uppercase tracking-wider"
          style="color: var(--text-muted)"
        >
          主選單
        </p>
        <ul class="space-y-1">
          <li v-for="item in menuItems" :key="item.path">
            <button
              :class="['sidebar-item w-full', isActive(item.path) ? 'active' : '']"
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
          </li>
        </ul>
      </div>

      <!-- PM 選單 -->
      <div v-if="filteredPmMenuItems.length > 0" class="px-3 mb-6">
        <p
          class="px-3 mb-2 text-xs font-medium uppercase tracking-wider"
          style="color: var(--text-muted)"
        >
          PM 專區
        </p>
        <ul class="space-y-1">
          <li v-for="item in filteredPmMenuItems" :key="item.path">
            <button
              :class="['sidebar-item w-full', isActive(item.path) ? 'active' : '']"
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
          </li>
        </ul>
      </div>

      <!-- Admin 選單 -->
      <div v-if="filteredAdminMenuItems.length > 0" class="px-3 mb-6">
        <p
          class="px-3 mb-2 text-xs font-medium uppercase tracking-wider"
          style="color: var(--text-muted)"
        >
          系統管理
        </p>
        <ul class="space-y-1">
          <li v-for="item in filteredAdminMenuItems" :key="item.path">
            <button
              :class="['sidebar-item w-full', isActive(item.path) ? 'active' : '']"
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
          </li>
        </ul>
      </div>
    </nav>

    <!-- 底部選單：個人設定 + 登出 -->
    <div class="p-3 space-y-1" style="border-top: 1px solid var(--border-primary)">
      <!-- 個人設定 -->
      <button
        :class="['sidebar-item w-full', isActive('/settings') ? 'active' : '']"
        @click="navigateTo('/settings/profile')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span class="text-sm font-medium">個人設定</span>
      </button>

      <!-- 登出 -->
      <button class="sidebar-item w-full" @click="handleLogout">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span class="text-sm font-medium">登出</span>
      </button>
    </div>
  </aside>
</template>
