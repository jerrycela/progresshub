import { test, expect } from '@playwright/test'

test.describe('登入頁面', () => {
  test('應能正確載入登入頁面', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/.*login/)
  })

  test('登入頁面應包含必要的表單元素', async ({ page }) => {
    await page.goto('/login')

    // 驗證頁面標題或品牌標識存在
    const heading = page.locator('h1, h2, [data-testid="login-title"]')
    await expect(heading.first()).toBeVisible()
  })

  test('未登入狀態訪問首頁應重導至登入頁', async ({ page }) => {
    await page.goto('/dashboard')

    // 路由守衛應將未認證用戶導向登入頁
    await expect(page).toHaveURL(/.*login/)
  })
})
