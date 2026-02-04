import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

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
        path: 'backlog',
        redirect: '/task-pool',
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
        meta: { requiresRole: ['PM', 'ADMIN'] },
      },
      {
        path: 'pm/chase',
        name: 'ChaseList',
        component: () => import('@/pages/pm/ChaseListPage.vue'),
        meta: { requiresRole: ['PM', 'ADMIN'] },
      },
      {
        path: 'pm/workload',
        name: 'Workload',
        component: () => import('@/pages/pm/WorkloadPage.vue'),
        meta: { requiresRole: ['PM', 'ADMIN'] },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/pages/admin/UserManagementPage.vue'),
        meta: { requiresRole: ['ADMIN'] },
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

// Navigation guard (will be connected to auth store later)
router.beforeEach((to, _from, next) => {
  // For now, allow all routes (mock mode)
  // TODO: Implement actual auth check when backend is ready
  if (to.path === '/login') {
    next()
  } else {
    next()
  }
})

export default router
