import { test, expect } from '@playwright/test'
import { loginAs, ROLES, type Role } from './helpers/auth'

// Run serially to avoid hitting the auth rate limiter (10 req / 15 min)
test.describe.configure({ mode: 'serial' })

test.describe('Dashboard — all roles can load', () => {
  const roles: Role[] = [ROLES.EMPLOYEE, ROLES.PM, ROLES.PRODUCER, ROLES.MANAGER, ROLES.ADMIN]

  for (const role of roles) {
    test(`${role} can load Dashboard`, async ({ page }) => {
      await loginAs(page, role)
      // After loginAs, page is at / which redirects to /dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 })
      // Verify main content area is visible
      const mainContent = page.locator('main, [class*="dashboard"]').first()
      await expect(mainContent).toBeVisible({ timeout: 10000 })
    })
  }
})

test.describe('Settings page', () => {
  test('can view profile page', async ({ page }) => {
    await loginAs(page, ROLES.EMPLOYEE)
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')
    const settingsText = page.getByText(/設定|個人/u)
    await expect(settingsText.first()).toBeVisible({ timeout: 10000 })
  })

  test('theme toggle button exists in navbar', async ({ page }) => {
    await loginAs(page, ROLES.EMPLOYEE)
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    const themeButton = page.locator('nav button').filter({ has: page.locator('svg') }).first()
    await expect(themeButton).toBeVisible({ timeout: 10000 })
  })
})
