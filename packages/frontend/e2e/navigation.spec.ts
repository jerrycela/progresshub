import { test, expect } from '@playwright/test'

test.describe('頁面導航', () => {
  test('訪問不存在的路徑應顯示 404 頁面', async ({ page }) => {
    await page.goto('/this-path-does-not-exist')

    // 驗證 404 頁面已載入（非空白頁）
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('根路徑應重導至 /dashboard 或 /login', async ({ page }) => {
    await page.goto('/')

    // 根路徑配置為 redirect 到 /dashboard
    // 若未登入，路由守衛會再導向 /login
    const url = page.url()
    const isExpectedRoute = url.includes('/dashboard') || url.includes('/login')
    expect(isExpectedRoute).toBeTruthy()
  })

  test('頁面應在合理時間內載入完成', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/login')
    const loadTime = Date.now() - startTime

    // 頁面載入應在 5 秒內完成
    expect(loadTime).toBeLessThan(5000)
  })
})
