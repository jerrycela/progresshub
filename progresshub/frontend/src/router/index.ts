import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/oauth/callback',
      name: 'OAuthCallback',
      component: () => import('@/views/OAuthCallback.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-tasks',
      name: 'MyTasks',
      component: () => import('@/views/MyTasks.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/report',
      name: 'Report',
      component: () => import('@/views/Report.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/gantt',
      name: 'Gantt',
      component: () => import('@/views/Gantt.vue'),
      meta: { requiresAuth: true, requiresPM: true },
    },
    {
      path: '/projects',
      name: 'Projects',
      component: () => import('@/views/Projects.vue'),
      meta: { requiresAuth: true, requiresPM: true },
    },
    {
      path: '/projects/:id',
      name: 'ProjectDetail',
      component: () => import('@/views/ProjectDetail.vue'),
      meta: { requiresAuth: true, requiresPM: true },
    },
    {
      path: '/admin/employees',
      name: 'Employees',
      component: () => import('@/views/Employees.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    // 工時追蹤系統
    {
      path: '/timesheet',
      name: 'TimeSheet',
      component: () => import('@/views/TimeSheet.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/timesheet/stats',
      name: 'TimeStats',
      component: () => import('@/views/TimeStats.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reports/utilization',
      name: 'Utilization',
      component: () => import('@/views/Utilization.vue'),
      meta: { requiresAuth: true, requiresPM: true },
    },
    {
      path: '/approval/timesheet',
      name: 'TimeApproval',
      component: () => import('@/views/TimeApproval.vue'),
      meta: { requiresAuth: true, requiresPM: true },
    },
    {
      path: '/projects/:id/timesheet',
      name: 'ProjectTimesheet',
      component: () => import('@/views/ProjectTimesheet.vue'),
      meta: { requiresAuth: true, requiresPM: true },
    },
    {
      path: '/reports/cost',
      name: 'CostReport',
      component: () => import('@/views/CostReport.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Check for stored token
    const token = localStorage.getItem('token')
    if (token) {
      authStore.token = token
      authStore.fetchUser().then(() => {
        checkPermissions()
      }).catch(() => {
        next('/login')
      })
      return
    }
    next('/login')
    return
  }

  checkPermissions()

  function checkPermissions() {
    // Check PM permission
    if (to.meta.requiresPM && !authStore.isPM) {
      next('/dashboard')
      return
    }

    // Check Admin permission
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next('/dashboard')
      return
    }

    next()
  }
})

export default router
