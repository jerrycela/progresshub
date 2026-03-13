import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Task Pool Page', () => {
  test('page loads correctly — should see 任務池', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toContainText('任務池')
  })

  test('search function — non-matching string hides tasks or shows empty state', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="搜尋"]').first()
    await expect(searchInput).toBeVisible()

    await searchInput.fill('不存在的任務XYZ99999')
    await page.waitForTimeout(500)

    // Either tasks disappear or an empty state message appears
    const taskCards = page.locator('[class*="task-card"], [class*="task_card"]')
    const emptyState = page.locator('body')

    const cardCount = await taskCards.count()
    const bodyText = await emptyState.textContent()

    const hasEmptyIndicator =
      cardCount === 0 ||
      (bodyText?.includes('沒有') ?? false) ||
      (bodyText?.includes('無任務') ?? false) ||
      (bodyText?.includes('找不到') ?? false) ||
      (bodyText?.includes('暫無') ?? false)

    expect(hasEmptyIndicator).toBeTruthy()
  })

  test('filters exist — at least 3 select elements', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool')
    await page.waitForLoadState('networkidle')

    const selects = page.locator('select')
    const count = await selects.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('can navigate to create task page', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool')
    await page.waitForLoadState('networkidle')

    // The create button is a router-link rendered as <a href="/task-pool/create">
    const createLink = page.locator('a[href*="/task-pool/create"], a[href="/task-pool/create"]').first()
    const fallbackLink = page.locator('a, button').filter({ hasText: '建立任務' }).first()

    const hasDirectLink = await createLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasDirectLink) {
      await createLink.click()
    } else {
      await expect(fallbackLink).toBeVisible()
      await fallbackLink.click()
    }

    // SPA navigation via Vue Router may not trigger networkidle; wait for URL change
    await page.waitForURL('**/task-pool/create', { timeout: 10000 })
    expect(page.url()).toContain('/task-pool/create')
  })
})

test.describe('Task Create Page', () => {
  test('form loads — should see text containing 任務 or 建立', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool/create')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    const hasExpectedText = bodyText?.includes('任務') || bodyText?.includes('建立')
    expect(hasExpectedText).toBeTruthy()
  })

  test('required fields exist — title input is present', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool/create')
    await page.waitForLoadState('networkidle')

    // Look for a title input by placeholder or by position
    const titleInput = page
      .locator('input[placeholder*="標題"], input[placeholder*="任務"], input[type="text"]')
      .first()
    await expect(titleInput).toBeVisible()
  })
})
