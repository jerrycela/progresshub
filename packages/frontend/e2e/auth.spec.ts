import { test, expect } from '@playwright/test'
import { loginAs, ROLES } from './helpers/auth'

test.describe('登入流程', () => {
  test('未登入時重導至 /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('登入頁面正確載入', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'ProgressHub' })).toBeVisible()
  })

  for (const role of Object.values(ROLES)) {
    test(`${role} 角色登入後進入 Dashboard`, async ({ page }) => {
      await loginAs(page, role)
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('nav')).toBeVisible()
    })
  }

  test('登出後回到登入頁', async ({ page }) => {
    await loginAs(page, 'EMPLOYEE')
    await expect(page).toHaveURL(/\/dashboard/)
    await page.getByText('登出').click()
    await expect(page).toHaveURL(/\/login/)
  })
})
