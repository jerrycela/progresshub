import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Gantt Chart Page', () => {
  // Run serially to avoid rate-limiting on the dev-login endpoint
  test.describe.configure({ mode: 'serial' })

  test('1. Page loads correctly — should see text "甘特圖"', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('甘特圖').first()).toBeVisible()
  })

  test('2. Zoom buttons exist — "日", "週", or "月"', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')

    const dayBtn = page.getByRole('button', { name: '日' })
    const weekBtn = page.getByRole('button', { name: '週' })
    const monthBtn = page.getByRole('button', { name: '月' })

    const atLeastOne = await dayBtn.isVisible().catch(() => false)
      || await weekBtn.isVisible().catch(() => false)
      || await monthBtn.isVisible().catch(() => false)

    expect(atLeastOne).toBe(true)
  })

  test('3. Filters exist — at least one select element', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')

    const selectCount = await page.locator('select').count()
    expect(selectCount).toBeGreaterThanOrEqual(1)
  })

  test('4. PM can see milestone management button', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')

    const byText = page.getByText('管理里程碑').first()
    const byName = page.getByRole('button', { name: /里程碑/ }).first()

    const visible = await byText.isVisible().catch(() => false)
      || await byName.isVisible().catch(() => false)

    expect(visible).toBe(true)
  })

  test('5. EMPLOYEE cannot see milestone management button', async ({ page }) => {
    await loginAs(page, 'EMPLOYEE')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')

    const byText = page.getByText('管理里程碑').first()
    const byName = page.getByRole('button', { name: /里程碑/ }).first()

    const textVisible = await byText.isVisible().catch(() => false)
    const btnVisible = await byName.isVisible().catch(() => false)

    expect(textVisible || btnVisible).toBe(false)
  })
})
