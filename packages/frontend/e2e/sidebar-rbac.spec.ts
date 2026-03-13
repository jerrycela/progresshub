/**
 * Sidebar RBAC tests — verify correct menu items per role
 * Target: https://progresshub-cb.zeabur.app
 *
 * Login is called once per role-block (not before every test) to avoid
 * hitting the backend auth rate limiter (10 req / 15 min).
 *
 * Run with:
 *   cd packages/frontend && npx playwright test e2e/sidebar-rbac.spec.ts --reporter=list
 */

import { test, expect, type Page } from '@playwright/test'
import { loginAs, type Role } from './helpers/auth'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToDashboard(page: Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}

async function expectVisible(page: Page, label: string) {
  await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({
    timeout: 5000,
  })
}

async function expectHidden(page: Page, label: string) {
  await expect(page.getByRole('button', { name: label, exact: true })).not.toBeVisible({
    timeout: 5000,
  })
}

// Common items every authenticated role should see
const COMMON = ['儀表板', '任務池', '我的任務', '甘特圖', '個人設定']
// PM-zone items (PM / PRODUCER / MANAGER / ADMIN)
const PM_ZONE = ['追殺清單', '職能負載']

// ── EMPLOYEE ──────────────────────────────────────────────────────────────────
test.describe('EMPLOYEE 側邊選單', () => {
  // Serial mode: share one browser page across tests so login only happens once
  test.describe.configure({ mode: 'serial' })

  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()
    await loginAs(sharedPage, 'EMPLOYEE')
    await goToDashboard(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  // Should see
  for (const item of COMMON) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  // Should NOT see
  for (const item of ['追殺清單', '職能負載', '專案管理', '員工管理']) {
    test(`看不見「${item}」`, async () => {
      await expectHidden(sharedPage, item)
    })
  }
})

// ── PM ────────────────────────────────────────────────────────────────────────
test.describe('PM 側邊選單', () => {
  test.describe.configure({ mode: 'serial' })

  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()
    await loginAs(sharedPage, 'PM')
    await goToDashboard(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  for (const item of COMMON) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  for (const item of PM_ZONE) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  test('看得見「專案管理」', async () => {
    await expectVisible(sharedPage, '專案管理')
  })

  test('看不見「員工管理」', async () => {
    await expectHidden(sharedPage, '員工管理')
  })
})

// ── PRODUCER ──────────────────────────────────────────────────────────────────
test.describe('PRODUCER 側邊選單', () => {
  test.describe.configure({ mode: 'serial' })

  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()
    await loginAs(sharedPage, 'PRODUCER')
    await goToDashboard(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  for (const item of COMMON) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  for (const item of PM_ZONE) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  test('看得見「專案管理」', async () => {
    await expectVisible(sharedPage, '專案管理')
  })

  test('看不見「員工管理」', async () => {
    await expectHidden(sharedPage, '員工管理')
  })
})

// ── MANAGER ───────────────────────────────────────────────────────────────────
test.describe('MANAGER 側邊選單', () => {
  test.describe.configure({ mode: 'serial' })

  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()
    await loginAs(sharedPage, 'MANAGER')
    await goToDashboard(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  for (const item of COMMON) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  for (const item of PM_ZONE) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  test('看得見「員工管理」', async () => {
    await expectVisible(sharedPage, '員工管理')
  })

  test('看不見「專案管理」', async () => {
    await expectHidden(sharedPage, '專案管理')
  })
})

// ── ADMIN ─────────────────────────────────────────────────────────────────────
test.describe('ADMIN 側邊選單', () => {
  test.describe.configure({ mode: 'serial' })

  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()
    await loginAs(sharedPage, 'ADMIN')
    await goToDashboard(sharedPage)
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  for (const item of COMMON) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  for (const item of PM_ZONE) {
    test(`看得見「${item}」`, async () => {
      await expectVisible(sharedPage, item)
    })
  }

  test('看得見「專案管理」', async () => {
    await expectVisible(sharedPage, '專案管理')
  })

  test('看得見「員工管理」', async () => {
    await expectVisible(sharedPage, '員工管理')
  })
})
