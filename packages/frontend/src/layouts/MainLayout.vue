<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { AppHeader, AppSidebar } from '@/components/layout'
import Toast from '@/components/common/Toast.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useProjectStore } from '@/stores/projects'
import { useEmployeeStore } from '@/stores/employees'
import { useTaskStore } from '@/stores/tasks'
import { useDepartmentStore } from '@/stores/departments'
import { useDashboardStore } from '@/stores/dashboard'
import { useMilestoneStore } from '@/stores/milestones'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

// ============================================
// 主框架佈局元件 - 包含 Header + Sidebar + 內容區 + Toast
// Ralph Loop 迭代 7: 新增全域 Toast 容器
// Ralph Loop 迭代 11: 使用重構後的 layout 元件
// Ralph Loop 迭代 16: RWD - 行動裝置側邊欄切換
// ============================================

const route = useRoute()
const projectStore = useProjectStore()
const employeeStore = useEmployeeStore()
const taskStore = useTaskStore()
const departmentStore = useDepartmentStore()
const dashboardStore = useDashboardStore()
const milestoneStore = useMilestoneStore()
const authStore = useAuthStore()

// 等待式初始化狀態
const isInitializing = ref(true)

const { showError } = useToast()

// 初始化 Store 資料（確保 API 模式下載入後端資料）
onMounted(async () => {
  // Phase 1: 導覽列所需的關鍵資料，優先載入
  const criticalFetches = [
    { label: '專案', fn: () => projectStore.fetchProjects() },
    { label: '員工', fn: () => employeeStore.fetchEmployees() },
    { label: '任務', fn: () => taskStore.fetchTasks() },
  ]

  const criticalResults = await Promise.allSettled(criticalFetches.map(f => f.fn()))
  const criticalFailed = criticalResults
    .map((r, i) => (r.status === 'rejected' ? criticalFetches[i].label : null))
    .filter((l): l is string => l !== null)

  if (criticalFailed.length > 0) {
    showError(`部分資料載入失敗：${criticalFailed.join('、')}，請重新整理頁面`)
  }

  isInitializing.value = false

  // Phase 2: 次要資料延遲載入，分散伺服器壓力
  setTimeout(() => {
    Promise.allSettled([
      taskStore.fetchPoolTasks(),
      departmentStore.fetchDepartments(),
      dashboardStore.fetchStats(),
      authStore.userRole !== 'EMPLOYEE' ? dashboardStore.fetchWorkloads() : Promise.resolve(),
      milestoneStore.fetchMilestones(),
    ])
  }, 1000)
})

// 側邊欄展開狀態（行動裝置）
const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

// 路由變更時自動關閉側邊欄（行動裝置）
watch(
  () => route.path,
  () => {
    closeSidebar()
  },
)
</script>

<template>
  <!-- 載入畫面 -->
  <div
    v-if="isInitializing"
    class="min-h-screen flex items-center justify-center"
    style="background-color: var(--bg-primary)"
  >
    <div class="flex flex-col items-center gap-4">
      <div
        class="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style="border-color: var(--text-secondary); border-top-color: transparent"
      ></div>
      <span class="text-sm" style="color: var(--text-secondary)">載入中...</span>
    </div>
  </div>

  <!-- 主佈局 -->
  <div v-else class="min-h-screen flex" style="background-color: var(--bg-primary)">
    <!-- Skip navigation link (WCAG 2.4.1) -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-600 focus:rounded focus:shadow-lg"
    >
      跳到主要內容
    </a>
    <!-- 側邊選單 -->
    <AppSidebar :is-open="isSidebarOpen" @close="closeSidebar" />

    <!-- 主內容區 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 頂部導航 -->
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <!-- 頁面內容 -->
      <main
        id="main-content"
        class="flex-1 p-4 md:p-6 overflow-auto"
        style="background-color: var(--bg-secondary)"
      >
        <router-view />
      </main>
    </div>

    <!-- 全域 Toast 通知 -->
    <Toast />

    <!-- 全域確認對話框 -->
    <ConfirmDialog />
  </div>
</template>
