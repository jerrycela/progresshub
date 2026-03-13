import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

// Routes that require elevated roles — EMPLOYEE should be redirected away
const EMPLOYEE_BLOCKED_ROUTES = [
  { path: '/projects', description: 'Projects (PM/PRODUCER/ADMIN only)' },
  { path: '/pm/chase', description: 'PM Chase (PM/PRODUCER/MANAGER/ADMIN only)' },
  { path: '/pm/workload', description: 'PM Workload (PM/PRODUCER/MANAGER/ADMIN only)' },
  { path: '/admin/users', description: 'Admin Users (MANAGER/ADMIN only)' },
]

// Routes accessible to all authenticated users
const ALL_ROLES_ROUTES = [
  '/dashboard',
  '/task-pool',
  '/my-tasks',
  '/gantt',
  '/settings/profile',
]

// Each test uses a unique display name to avoid DB upsert race conditions
// when parallel workers try to update the same demo account simultaneously.
function uniqueName(role: string, suffix: string): string {
  return `E2E-${role}-${suffix}`
}

test.describe('Route Permission Control', () => {
  test.describe('EMPLOYEE — blocked routes redirect away', () => {
    for (const { path, description } of EMPLOYEE_BLOCKED_ROUTES) {
      test(`EMPLOYEE cannot access ${description}`, async ({ page }) => {
        const slug = path.replace(/\//g, '-').replace(/^-/, '')
        await loginAs(page, 'EMPLOYEE', uniqueName('EMPLOYEE', slug))
        await page.goto(path)
        await page.waitForURL((url) => !url.pathname.startsWith(path), { timeout: 5000 })
        expect(page.url()).not.toContain(path)
      })
    }
  })

  test.describe('Authorized access', () => {
    test('PM can access /projects', async ({ page }) => {
      await loginAs(page, 'PM', uniqueName('PM', 'projects'))
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/projects')
    })

    test('MANAGER can access /admin/users', async ({ page }) => {
      await loginAs(page, 'MANAGER', uniqueName('MANAGER', 'admin'))
      await page.goto('/admin/users')
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/admin/users')
    })

    test('ADMIN can access /admin/users', async ({ page }) => {
      await loginAs(page, 'ADMIN', uniqueName('ADMIN', 'admin'))
      await page.goto('/admin/users')
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/admin/users')
    })
  })

  test.describe('All roles — open routes', () => {
    for (const path of ALL_ROLES_ROUTES) {
      test(`EMPLOYEE can access ${path}`, async ({ page }) => {
        const slug = path.replace(/\//g, '-').replace(/^-/, '')
        await loginAs(page, 'EMPLOYEE', uniqueName('EMPLOYEE', slug))
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        expect(page.url()).toContain(path)
      })
    }
  })
})
