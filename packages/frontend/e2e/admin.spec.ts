/**
 * ProgressHub E2E: Project Management + User Management
 * Target: https://progresshub-cb.zeabur.app
 */

import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

// ======================================================
// Project Management (/projects, PM role)
// Serial mode to avoid auth rate limiter
// ======================================================
test.describe('Project Management (/projects)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'PM')
  })

  test('1. Page loads and shows project cards', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const card = page.locator('.card').first()
    await expect(card).toBeVisible({ timeout: 15000 })
  })

  test('2. "新增專案" button exists', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const btn = page.locator('button:has-text("新增專案")').first()
    await expect(btn).toBeVisible({ timeout: 15000 })
  })

  test('3. Member management modal can open', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const memberBtn = page.locator('button:has-text("成員")').first()
    await expect(memberBtn).toBeVisible({ timeout: 15000 })
    await memberBtn.click()

    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first()
    await expect(modal).toBeVisible({ timeout: 8000 })
  })
})

// ======================================================
// User Management (/admin/users, ADMIN role)
// Serial mode to avoid auth rate limiter
// ======================================================
test.describe('User Management (/admin/users)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ADMIN')
  })

  test('4. Page loads with user table', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const tableOrUserEl = page.locator('table, [class*="user"]').first()
    await expect(tableOrUserEl).toBeVisible({ timeout: 15000 })
  })

  test('5. Search input exists', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[placeholder*="搜尋"], input[placeholder*="姓名"], input[placeholder*="信箱"]')
      .first()
    await expect(searchInput).toBeVisible({ timeout: 15000 })
  })

  test('6. Edit modal can open', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const editBtn = page.locator('button:has-text("編輯")').first()
    await expect(editBtn).toBeVisible({ timeout: 15000 })
    await editBtn.click()

    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first()
    await expect(modal).toBeVisible({ timeout: 8000 })
  })
})
