import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteLocationNormalized } from 'vue-router'
import type { UserRole } from 'shared/types'
import { useToast } from '@/composables/useToast'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
      },
      {
        path: 'my-tasks',
        name: 'MyTasks',
        component: () => import('@/pages/MyTasksPage.vue'),
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/pages/ReportPage.vue'),
      },
      {
        path: 'gantt',
        name: 'Gantt',
        component: () => import('@/pages/GanttPage.vue'),
      },
      {
        path: 'task-pool',
        name: 'TaskPool',
        component: () => import('@/pages/TaskPoolPage.vue'),
      },
      {
        path: 'task-pool/create',
        name: 'TaskCreate',
        component: () => import('@/pages/TaskCreatePage.vue'),
      },
      {
        path: 'task-pool/:id',
        name: 'TaskDetail',
        component: () => import('@/pages/TaskDetailPage.vue'),
      },
      {
        path: 'task-pool/:id/edit',
        name: 'TaskEdit',
        component: () => import('@/pages/TaskEditPage.vue'),
      },
      {
        path: 'roles',
        name: 'RoleDemo',
        component: () => import('@/pages/RoleDemoPage.vue'),
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/pages/ProjectsPage.vue'),
        // 專案管理：PM、製作人可管理，部門主管不行（依 RoleDemoPage 權限矩陣）
        meta: { requiresRole: ['PM', 'PRODUCER', 'ADMIN'] },
      },
      {
        path: 'pm/chase',
        name: 'ChaseList',
        component: () => import('@/pages/pm/ChaseListPage.vue'),
        // 追殺清單：PM、製作人、部門主管皆可查看
        meta: { requiresRole: ['PM', 'PRODUCER', 'MANAGER', 'ADMIN'] },
      },
      {
        path: 'pm/workload',
        name: 'Workload',
        component: () => import('@/pages/pm/WorkloadPage.vue'),
        // 職能負載：PM、製作人、部門主管皆可查看
        meta: { requiresRole: ['PM', 'PRODUCER', 'MANAGER', 'ADMIN'] },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/pages/admin/UserManagementPage.vue'),
        // 員工管理：僅部門主管和管理員
        meta: { requiresRole: ['MANAGER', 'ADMIN'] },
      },
      // 設定頁面
      {
        path: 'settings',
        component: () => import('@/pages/settings/SettingsLayout.vue'),
        children: [
          {
            path: '',
            redirect: '/settings/profile',
          },
          {
            path: 'profile',
            name: 'ProfileSettings',
            component: () => import('@/pages/settings/ProfileSettingsPage.vue'),
          },
          {
            path: 'integrations',
            name: 'IntegrationsSettings',
            component: () => import('@/pages/settings/IntegrationsPage.vue'),
          },
        ],
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ============================================
// 導航守衛 - 認證與權限檢查
// ROI 優化：實作 Router 認證守衛
// ============================================

/**
 * 檢查路由是否需要認證
 */
const requiresAuth = (to: RouteLocationNormalized): boolean => {
  // 檢查路由或其父路由是否需要認證
  return to.matched.some(record => record.meta.requiresAuth === true)
}

/**
 * 檢查路由是否有角色限制
 */
const getRequiredRoles = (to: RouteLocationNormalized): UserRole[] | null => {
  // 取得最近一個有 requiresRole 的路由記錄
  for (let i = to.matched.length - 1; i >= 0; i--) {
    const roles = to.matched[i].meta.requiresRole
    if (roles) {
      return roles as UserRole[]
    }
  }
  return null
}

let authInitialized = false

router.beforeEach(async (to, _from, next) => {
  // 動態導入 auth store（避免循環依賴）
  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()

  // 只在首次導航時嘗試恢復登入狀態
  if (!authInitialized) {
    authInitialized = true
    if (!authStore.isAuthenticated) {
      await authStore.initAuth()
    }
  }

  const isAuthenticated = authStore.isAuthenticated
  const needsAuth = requiresAuth(to)
  const requiredRoles = getRequiredRoles(to)

  // 情況 1：已登入用戶訪問登入頁 → 導向首頁
  if (to.path === '/login' && isAuthenticated) {
    return next({ path: '/dashboard' })
  }

  // 情況 2：需要認證但未登入 → 導向登入頁（保存原目標路徑）
  if (needsAuth && !isAuthenticated) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  // 情況 3：需要特定角色但用戶沒有權限 → 導向 403 或首頁
  if (requiredRoles && isAuthenticated) {
    const hasRequiredRole = authStore.hasRole(requiredRoles)

    if (!hasRequiredRole) {
      // 開發環境顯示警告
      if (import.meta.env.DEV) {
        console.warn(
          `[Router] 權限不足: 需要 ${requiredRoles.join(' 或 ')}，` +
            `當前角色: ${authStore.userRole}`,
        )
      }

      // 顯示權限不足提示
      const { showError } = useToast()
      showError('你沒有權限訪問該頁面')

      // 導向首頁並顯示提示（可改為專門的 403 頁面）
      return next({
        path: '/dashboard',
      })
    }
  }

  // 情況 4：其他情況正常通過
  next()
})

export default router
