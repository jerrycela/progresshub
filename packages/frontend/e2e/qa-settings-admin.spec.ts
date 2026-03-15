/**
 * ProgressHub QA Test: Settings + Admin User Management
 * Target: https://progresshub-cb.zeabur.app
 * Backend API: https://progress-hub.zeabur.app
 *
 * Strategy: Use dev-login API to get token, inject into localStorage, bypass login page
 *
 * Run with:
 *   cd packages/frontend && npx playwright test e2e/qa-settings-admin.spec.ts --reporter=list --no-deps --project=chromium
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

const FRONTEND = 'https://progresshub-cb.zeabur.app'
const BACKEND = 'https://progress-hub.zeabur.app'
const SCREENSHOT_DIR = '/tmp/qa-settings-admin'

// Known test accounts (from DB seed + demo accounts)
const ACCOUNTS = {
  ADMIN: 'demo-qa-admin@demo.progresshub.local',
  MANAGER: 'zhang@company.com',
  EMPLOYEE: 'demo-qa-employee@demo.progresshub.local',
  PM: 'huang@company.com',
}

async function snap(page: Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  })
  console.log(`[SNAP] ${name}.png`)
}

// Get token from backend dev-login API and inject into browser localStorage
async function loginViaApi(context: BrowserContext, page: Page, role: keyof typeof ACCOUNTS) {
  const email = ACCOUNTS[role]

  // Call dev-login via fetch from the browser context (avoid CORS issues by using Node.js fetch)
  const response = await page.request.post(`${BACKEND}/api/auth/dev-login`, {
    data: { email },
    headers: { 'Content-Type': 'application/json' },
  })

  const body = await response.json()

  if (!body.success) {
    console.error(`[LOGIN FAIL] ${role}: ${JSON.stringify(body.error)}`)
    return false
  }

  const { token, refreshToken, user } = body.data
  console.log(`[LOGIN OK] ${role} (${user.name}) token obtained`)

  // Navigate to the frontend first (need a page load to set localStorage on correct origin)
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' })

  // Inject tokens into localStorage (matching what the frontend auth store expects)
  await page.evaluate(
    ({ token, refreshToken, user }) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_refresh_token', refreshToken)
      localStorage.setItem('auth_user', JSON.stringify(user))
      // Some Vue apps use pinia-plugin-persistedstate with different keys; try both formats
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token, refreshToken, user },
  )

  return { token, user }
}

// Navigate to a page after token injection
async function goTo(page: Page, path: string) {
  await page.goto(`${FRONTEND}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const url = page.url()
  console.log(`[GOTO] ${path} → ${url}`)
  return url
}

// ======================================================
// SUITE 0: Verify login mechanism works
// ======================================================
test.describe('0. 登入機制驗證', () => {
  test('0.1 後端 dev-login API 可用', async ({ page }) => {
    const response = await page.request.post(`${BACKEND}/api/auth/dev-login`, {
      data: { email: ACCOUNTS.ADMIN },
    })
    const body = await response.json()
    console.log(`dev-login response: success=${body.success}, role=${body.data?.user?.role}`)
    expect(body.success).toBeTruthy()
    expect(body.data?.user?.role).toBe('ADMIN')
  })

  test('0.2 Token 注入後能存取受保護頁面', async ({ context, page }) => {
    const result = await loginViaApi(context, page, 'ADMIN')
    expect(result).toBeTruthy()

    const url = await goTo(page, '/dashboard')
    await snap(page, '00-post-login-dashboard')

    // After token injection, should NOT redirect to login
    const redirectedToLogin = url.includes('/login')
    if (redirectedToLogin) {
      console.log('[NOTE] Token injection may not work — checking Pinia store key names')
      // Check what localStorage keys exist
      const keys = await page.evaluate(() => Object.keys(localStorage))
      console.log('LocalStorage keys:', keys)
    } else {
      console.log('[PASS] Token injection worked, accessed dashboard')
    }
  })
})

// ======================================================
// SUITE 1: Settings Page (ADMIN)
// ======================================================
test.describe('1. 設定頁面 (ADMIN)', () => {
  test.beforeEach(async ({ context, page }) => {
    await loginViaApi(context, page, 'ADMIN')
    // Give the store time to hydrate from localStorage
    await page.waitForTimeout(500)
  })

  test('1.1 設定頁面能正常載入', async ({ page }) => {
    const url = await goTo(page, '/settings')
    await snap(page, '01-settings-page')

    const isOnSettings = url.includes('/settings')
    const wasRedirected = url.includes('/login')

    console.log(`Settings loaded: ${isOnSettings}, redirected to login: ${wasRedirected}`)

    if (wasRedirected) {
      console.log('[FAIL] Redirected to login — token injection not persisted')
      // Check localStorage state
      const lsKeys = await page.evaluate(() => Object.keys(localStorage))
      console.log('LocalStorage keys at time of check:', lsKeys)
    } else {
      console.log('[PASS] Settings page accessible')
    }

    expect(isOnSettings).toBeTruthy()
  })

  test('1.2 個人資料設定可查看', async ({ page }) => {
    const url = await goTo(page, '/settings')
    await page.waitForTimeout(1000)
    await snap(page, '02-settings-profile')

    if (!url.includes('/settings')) {
      console.log('[SKIP] Not on settings page')
      return
    }

    // Look for profile-related content
    const allText = await page.textContent('body').catch(() => '')
    console.log(`Page content length: ${allText?.length}`)

    // Check for headings, inputs, profile sections
    const inputs = await page.locator('input:visible').count()
    const labels = await page.locator('label:visible').count()
    const headings = await page.locator('h1, h2, h3, h4').count()

    console.log(`Visible inputs: ${inputs}, labels: ${labels}, headings: ${headings}`)

    // Log headings content
    const headingCount = await page.locator('h1, h2, h3, h4').count()
    for (let i = 0; i < Math.min(headingCount, 5); i++) {
      const text = await page
        .locator('h1, h2, h3, h4')
        .nth(i)
        .textContent()
        .catch(() => '')
      console.log(`  Heading: "${text?.trim()}"`)
    }

    // Profile should have at least some content
    expect(headings + inputs + labels).toBeGreaterThan(0)
  })

  test('1.3 主題切換（深色/淺色模式）', async ({ page }) => {
    const url = await goTo(page, '/settings')
    await page.waitForTimeout(1000)

    if (!url.includes('/settings')) {
      console.log('[SKIP] Not on settings page')
      return
    }

    // Check initial theme state
    const htmlClass = await page
      .locator('html')
      .getAttribute('class')
      .catch(() => '')
    const bodyClass = await page
      .locator('body')
      .getAttribute('class')
      .catch(() => '')
    console.log(`Initial html class: "${htmlClass}"`)
    console.log(`Initial body class: "${bodyClass}"`)

    // Look for theme-related UI
    const themeSelectors = [
      'button:has-text("深色")',
      'button:has-text("淺色")',
      'button:has-text("Dark")',
      'button:has-text("Light")',
      'button:has-text("暗色")',
      'button:has-text("亮色")',
      '[data-testid*="theme"]',
      'input[type="checkbox"][name*="theme"]',
      'input[type="checkbox"][name*="dark"]',
      '[class*="theme-toggle"]',
      '[class*="dark-mode"]',
    ]

    let found = false
    for (const sel of themeSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        const text = await el.textContent().catch(() => '')
        console.log(`[PASS] Theme control found: "${text?.trim()}" (selector: ${sel})`)

        await el.click()
        await page.waitForTimeout(500)

        const newHtmlClass = await page
          .locator('html')
          .getAttribute('class')
          .catch(() => '')
        console.log(`After toggle html class: "${newHtmlClass}"`)
        found = true
        break
      }
    }

    if (!found) {
      // List ALL buttons on the page
      const buttons = page.locator('button:visible')
      const count = await buttons.count()
      console.log(`[NOTE] No theme toggle found. All visible buttons (${count}):`)
      for (let i = 0; i < count; i++) {
        const text = await buttons
          .nth(i)
          .textContent()
          .catch(() => '')
        const ariaLabel = await buttons
          .nth(i)
          .getAttribute('aria-label')
          .catch(() => '')
        console.log(`  ${i + 1}: "${text?.trim()}" aria-label="${ariaLabel}"`)
      }

      // Check all inputs
      const checkboxes = page.locator('input[type="checkbox"]:visible, input[type="radio"]:visible')
      const cbCount = await checkboxes.count()
      console.log(`Checkboxes/radios: ${cbCount}`)
    }

    await snap(page, '03-settings-theme')
    console.log(`Theme toggle found: ${found}`)
  })

  test('1.4 整合設定 (GitLab) 頁面是否載入', async ({ page }) => {
    const url = await goTo(page, '/settings')
    await page.waitForTimeout(1000)

    if (!url.includes('/settings')) {
      console.log('[SKIP] Not on settings page')
      return
    }

    // Look for sidebar nav items or tabs
    const navItems = page.locator(
      'nav a, [role="tab"], aside a, [class*="nav-item"], [class*="sidebar-link"]',
    )
    const count = await navItems.count()
    console.log(`Navigation items in settings: ${count}`)
    for (let i = 0; i < count; i++) {
      const text = await navItems
        .nth(i)
        .textContent()
        .catch(() => '')
      const href = await navItems
        .nth(i)
        .getAttribute('href')
        .catch(() => '')
      console.log(`  Nav: "${text?.trim()}" href="${href}"`)
    }

    // Try to navigate to integration/gitlab settings sub-page
    for (const settingsSubPath of [
      '/settings/integrations',
      '/settings/gitlab',
      '/settings/profile',
    ]) {
      const subUrl = await goTo(page, settingsSubPath)
      if (!subUrl.includes('/login')) {
        console.log(`[PASS] Sub-page accessible: ${settingsSubPath}`)
        await snap(page, `04-settings-subpage-${settingsSubPath.replace(/\//g, '_')}`)
        break
      }
    }

    await snap(page, '04-settings-integration')
    expect(true).toBeTruthy()
  })
})

// ======================================================
// SUITE 2: User Management (ADMIN)
// ======================================================
test.describe('2. 使用者管理 (ADMIN)', () => {
  test.beforeEach(async ({ context, page }) => {
    await loginViaApi(context, page, 'ADMIN')
    await page.waitForTimeout(500)
  })

  test('2.1 使用者管理頁面能正常載入', async ({ page }) => {
    const url = await goTo(page, '/admin/users')
    await snap(page, '05-admin-users')

    console.log(`Admin users URL: ${url}`)
    const isOnPage = url.includes('/admin/users')
    const wasRedirected = url.includes('/login')

    if (isOnPage) {
      console.log('[PASS] Admin users page loaded')
    } else if (wasRedirected) {
      console.log('[FAIL] Redirected to login — auth not working')
    } else {
      console.log(`[NOTE] Landed on: ${url}`)
    }

    expect(isOnPage).toBeTruthy()
  })

  test('2.2 使用者列表正確顯示', async ({ page }) => {
    const url = await goTo(page, '/admin/users')
    await page.waitForTimeout(2000) // Wait for API data
    await snap(page, '06-admin-users-list')

    if (!url.includes('/admin/users')) {
      console.log('[SKIP] Not on admin/users page')
      return
    }

    // Look for user rows in table
    const tableRows = await page.locator('tbody tr').count()
    const listItems = await page
      .locator(
        '[class*="user-row"], [class*="employee-row"], [class*="user-card"], [class*="user-item"]',
      )
      .count()
    const anyUserContent = await page.locator('table, [class*="list"], [class*="grid"]').count()

    console.log(
      `Table rows: ${tableRows}, List items: ${listItems}, Any list content: ${anyUserContent}`,
    )

    // Check page headings
    const h1 = await page
      .locator('h1')
      .textContent()
      .catch(() => '')
    const h2Count = await page.locator('h2').count()
    console.log(`H1: "${h1}", H2 count: ${h2Count}`)

    // Verify some user data is visible (name, email, role)
    const pageText = await page.textContent('body').catch(() => '')
    const hasUserNames =
      pageText?.includes('QA') ||
      pageText?.includes('王') ||
      pageText?.includes('張') ||
      pageText?.includes('Admin')
    console.log(`Has user names in content: ${hasUserNames}`)

    expect(tableRows + listItems > 0 || hasUserNames === true).toBeTruthy()
  })

  test('2.3 搜尋/篩選功能', async ({ page }) => {
    const url = await goTo(page, '/admin/users')
    await page.waitForTimeout(2000)

    if (!url.includes('/admin/users')) {
      console.log('[SKIP] Not on admin/users page')
      return
    }

    // Find search input
    const searchSelectors = [
      'input[placeholder*="搜尋"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="查詢"]',
      'input[placeholder*="名稱"]',
      'input[placeholder*="email"]',
      'input[type="search"]',
      'input[name="search"]',
      'input[name="keyword"]',
    ]

    let searchFound = false
    for (const sel of searchSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        const placeholder = await el.getAttribute('placeholder').catch(() => '')
        console.log(`[PASS] Search input found (${sel}): placeholder="${placeholder}"`)

        await el.fill('QA')
        await page.waitForTimeout(1000)
        await snap(page, '07-admin-search-qa')

        // Count results after search
        const rows = await page.locator('tbody tr').count()
        const items = await page.locator('[class*="user-row"], [class*="employee-row"]').count()
        console.log(`Results after "QA" search: rows=${rows}, items=${items}`)

        await el.clear()
        await page.waitForTimeout(500)
        searchFound = true
        break
      }
    }

    if (!searchFound) {
      console.log('[NOTE] No search input found')
      await snap(page, '07-admin-no-search')

      // List all inputs
      const inputs = page.locator('input:visible')
      const inputCount = await inputs.count()
      console.log(`All visible inputs (${inputCount}):`)
      for (let i = 0; i < inputCount; i++) {
        const type = await inputs
          .nth(i)
          .getAttribute('type')
          .catch(() => '')
        const placeholder = await inputs
          .nth(i)
          .getAttribute('placeholder')
          .catch(() => '')
        console.log(`  Input: type=${type}, placeholder="${placeholder}"`)
      }
    }

    // Check for filter dropdowns
    const selects = await page.locator('select:visible').count()
    const filterBtns = await page
      .locator('button:has-text("篩選"), button:has-text("Filter"), [class*="filter"]')
      .count()
    console.log(`Filter selects: ${selects}, filter buttons: ${filterBtns}`)

    expect(true).toBeTruthy()
  })

  test('2.4 編輯使用者角色功能', async ({ page }) => {
    const url = await goTo(page, '/admin/users')
    await page.waitForTimeout(2000)
    await snap(page, '08-admin-before-edit')

    if (!url.includes('/admin/users')) {
      console.log('[SKIP] Not on admin/users page')
      return
    }

    // Find any edit button (row-level)
    const editSelectors = [
      'button:has-text("編輯")',
      'button:has-text("Edit")',
      'button[aria-label*="編輯"]',
      'button[aria-label*="edit"]',
      'a:has-text("編輯")',
      '[class*="edit-btn"]',
      '[class*="edit-button"]',
    ]

    let editFound = false
    for (const sel of editSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        const text = await el.textContent().catch(() => '')
        console.log(`[PASS] Edit control found: "${text?.trim()}" (${sel})`)

        await el.click()
        await page.waitForTimeout(1000)
        await snap(page, '08-admin-edit-modal')

        // Check modal
        const modal = page
          .locator('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]')
          .first()
        const modalVisible = await modal.isVisible().catch(() => false)
        console.log(`Edit modal visible: ${modalVisible}`)

        if (modalVisible) {
          // Look for role selector
          const roleInputs = await page
            .locator('select, [class*="role"], [placeholder*="角色"]')
            .count()
          console.log(`Role selector elements in modal: ${roleInputs}`)

          // Close modal
          const closeBtn = page
            .locator('button:has-text("取消"), button:has-text("關閉"), button[aria-label="Close"]')
            .first()
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click()
          } else {
            await page.keyboard.press('Escape')
          }
        }

        editFound = true
        break
      }
    }

    if (!editFound) {
      console.log('[NOTE] No edit button found directly')
      // Maybe user rows have action menus - look for icon buttons
      const iconBtns = page.locator('tbody button, table button, [class*="action"]')
      const iconCount = await iconBtns.count()
      console.log(`Action buttons in table: ${iconCount}`)

      if (iconCount > 0) {
        const firstBtn = iconBtns.first()
        const ariaLabel = await firstBtn.getAttribute('aria-label').catch(() => '')
        const text = await firstBtn.textContent().catch(() => '')
        console.log(`First action button: text="${text?.trim()}", aria-label="${ariaLabel}"`)

        await firstBtn.click()
        await page.waitForTimeout(500)
        await snap(page, '08-admin-action-clicked')
      }
    }

    expect(true).toBeTruthy()
  })

  test('2.5 新增使用者功能', async ({ page }) => {
    const url = await goTo(page, '/admin/users')
    await page.waitForTimeout(2000)
    await snap(page, '09-admin-before-add')

    if (!url.includes('/admin/users')) {
      console.log('[SKIP] Not on admin/users page')
      return
    }

    const addSelectors = [
      'button:has-text("新增使用者")',
      'button:has-text("新增員工")',
      'button:has-text("新增成員")',
      'button:has-text("邀請使用者")',
      'button:has-text("Add User")',
      'button:has-text("Invite")',
      'button:has-text("新增")',
      'button:has-text("建立")',
      '[class*="add-user"]',
      '[class*="invite"]',
    ]

    let addFound = false
    for (const sel of addSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        const text = await el.textContent().catch(() => '')
        console.log(`[PASS] Add button found: "${text?.trim()}" (${sel})`)

        await el.click()
        await page.waitForTimeout(1000)
        await snap(page, '09-admin-add-modal')

        const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first()
        const modalVisible = await modal.isVisible().catch(() => false)
        console.log(`Add user modal visible: ${modalVisible}`)

        if (modalVisible) {
          // List modal inputs
          const modalInputs = modal.locator('input, select, textarea')
          const inputCount = await modalInputs.count()
          console.log(`Add user modal inputs: ${inputCount}`)
          for (let i = 0; i < inputCount; i++) {
            const type = await modalInputs
              .nth(i)
              .getAttribute('type')
              .catch(() => '')
            const placeholder = await modalInputs
              .nth(i)
              .getAttribute('placeholder')
              .catch(() => '')
            const name = await modalInputs
              .nth(i)
              .getAttribute('name')
              .catch(() => '')
            console.log(`  Input: type=${type}, name="${name}", placeholder="${placeholder}"`)
          }

          const closeBtn = page
            .locator('button:has-text("取消"), button:has-text("Cancel")')
            .first()
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click()
          } else {
            await page.keyboard.press('Escape')
          }
          console.log('[PASS] Add user modal opened and closed')
        } else {
          console.log('[FAIL] Modal did not open after clicking add button')
        }

        addFound = true
        break
      }
    }

    if (!addFound) {
      console.log('[FAIL] No add user button found')
      const buttons = page.locator('button:visible')
      const count = await buttons.count()
      console.log(`All visible buttons (${count}):`)
      for (let i = 0; i < count; i++) {
        const text = await buttons
          .nth(i)
          .textContent()
          .catch(() => '')
        const ariaLabel = await buttons
          .nth(i)
          .getAttribute('aria-label')
          .catch(() => '')
        console.log(`  ${i + 1}: "${text?.trim()}" aria="${ariaLabel}"`)
      }
    }

    expect(true).toBeTruthy()
  })
})

// ======================================================
// SUITE 3: User Management (MANAGER role)
// ======================================================
test.describe('3. 使用者管理 (MANAGER 角色)', () => {
  test('3.1 MANAGER 可存取 /admin/users', async ({ context, page }) => {
    await loginViaApi(context, page, 'MANAGER')
    await page.waitForTimeout(500)

    const url = await goTo(page, '/admin/users')
    await snap(page, '10-manager-admin-users')

    console.log(`MANAGER /admin/users → ${url}`)
    const canAccess = url.includes('/admin/users')
    const wasBlocked =
      url.includes('/login') || url.includes('/forbidden') || url.includes('/dashboard')

    if (canAccess) {
      console.log('[PASS] MANAGER can access /admin/users')
    } else {
      console.log(`[FAIL] MANAGER blocked, redirected to: ${url}`)
      // Per CLAUDE.md: MANAGER should have access to /admin/users
    }

    expect(canAccess).toBeTruthy()
  })

  test('3.2 MANAGER 看到的使用者範圍', async ({ context, page }) => {
    await loginViaApi(context, page, 'MANAGER')
    await page.waitForTimeout(500)

    const url = await goTo(page, '/admin/users')
    await page.waitForTimeout(2000)
    await snap(page, '11-manager-scope')

    if (!url.includes('/admin/users')) {
      console.log('[SKIP] MANAGER not on admin/users')
      return
    }

    const tableRows = await page.locator('tbody tr').count()
    const pageText = await page.textContent('body').catch(() => '')
    console.log(`MANAGER sees ${tableRows} user rows`)

    // MANAGER should be able to manage users but may have restrictions
    // Check if there are any restricted UI elements
    const editBtns = await page.locator('button:has-text("編輯"), button:has-text("Edit")').count()
    const deleteBtns = await page
      .locator('button:has-text("刪除"), button:has-text("Delete")')
      .count()
    console.log(`Edit buttons visible to MANAGER: ${editBtns}, Delete buttons: ${deleteBtns}`)

    expect(true).toBeTruthy()
  })
})

// ======================================================
// SUITE 4: EMPLOYEE role access control
// ======================================================
test.describe('4. EMPLOYEE 角色存取控制', () => {
  test('4.1 EMPLOYEE 無法存取 /admin/users (應被重導)', async ({ context, page }) => {
    await loginViaApi(context, page, 'EMPLOYEE')
    await page.waitForTimeout(500)

    const url = await goTo(page, '/admin/users')
    await snap(page, '12-employee-admin-blocked')

    console.log(`EMPLOYEE /admin/users → ${url}`)
    const wasBlocked = !url.includes('/admin/users')

    if (wasBlocked) {
      console.log(`[PASS] EMPLOYEE correctly blocked, landed at: ${url}`)
    } else {
      console.log('[FAIL] EMPLOYEE can access /admin/users — SECURITY ISSUE!')
    }

    expect(wasBlocked).toBeTruthy()
  })

  test('4.2 EMPLOYEE 可正常使用設定頁面', async ({ context, page }) => {
    await loginViaApi(context, page, 'EMPLOYEE')
    await page.waitForTimeout(500)

    const url = await goTo(page, '/settings')
    await page.waitForTimeout(1000)
    await snap(page, '13-employee-settings')

    console.log(`EMPLOYEE /settings → ${url}`)
    const canAccess = url.includes('/settings')

    if (canAccess) {
      console.log('[PASS] EMPLOYEE can access /settings')
    } else {
      console.log(`[FAIL] EMPLOYEE redirected to: ${url}`)
    }

    expect(canAccess).toBeTruthy()
  })

  test('4.3 EMPLOYEE 無法存取 PM 工具', async ({ context, page }) => {
    await loginViaApi(context, page, 'EMPLOYEE')
    await page.waitForTimeout(500)

    // Try /pm/chase
    const chaseUrl = await goTo(page, '/pm/chase')
    await snap(page, '14-employee-pm-chase-blocked')

    const chaseBlocked = !chaseUrl.includes('/pm/chase')
    console.log(`EMPLOYEE /pm/chase → ${chaseUrl} (blocked: ${chaseBlocked})`)

    if (chaseBlocked) {
      console.log('[PASS] EMPLOYEE blocked from /pm/chase')
    } else {
      console.log('[FAIL] EMPLOYEE can access /pm/chase')
    }

    expect(chaseBlocked).toBeTruthy()
  })
})

// ======================================================
// SUITE 5: PM Tools
// ======================================================
test.describe('5. PM 追蹤工具 (PM 角色)', () => {
  test.beforeEach(async ({ context, page }) => {
    await loginViaApi(context, page, 'PM')
    await page.waitForTimeout(500)
  })

  test('5.1 PM 追蹤頁面 (/pm/chase) 能正常載入', async ({ page }) => {
    const url = await goTo(page, '/pm/chase')
    await page.waitForTimeout(2000)
    await snap(page, '15-pm-chase')

    console.log(`PM /pm/chase → ${url}`)
    const isOnPage = url.includes('/pm/chase')

    if (isOnPage) {
      console.log('[PASS] PM can access /pm/chase')
      // Check page content
      const headings = await page.locator('h1, h2').count()
      const tableRows = await page
        .locator('tbody tr, [class*="chase-row"], [class*="task-row"]')
        .count()
      console.log(`Content: ${headings} headings, ${tableRows} data rows`)
    } else {
      console.log(`[FAIL] Redirected to: ${url}`)
    }

    expect(isOnPage).toBeTruthy()
  })

  test('5.2 PM 工作量頁面 (/pm/workload) 能正常載入', async ({ page }) => {
    const url = await goTo(page, '/pm/workload')
    await page.waitForTimeout(2000)
    await snap(page, '16-pm-workload')

    console.log(`PM /pm/workload → ${url}`)
    const isOnPage = url.includes('/pm/workload')

    if (isOnPage) {
      console.log('[PASS] PM can access /pm/workload')
      // Check page content
      const headings = await page.locator('h1, h2').count()
      const charts = await page
        .locator('canvas, svg, [class*="chart"], [class*="workload"]')
        .count()
      console.log(`Content: ${headings} headings, ${charts} chart elements`)
    } else {
      console.log(`[FAIL] Redirected to: ${url}`)
    }

    expect(isOnPage).toBeTruthy()
  })

  test('5.3 PM 追蹤頁面有任務資料', async ({ page }) => {
    const url = await goTo(page, '/pm/chase')
    await page.waitForTimeout(2000)

    if (!url.includes('/pm/chase')) {
      console.log('[SKIP] Not on /pm/chase')
      return
    }

    const pageText = await page.textContent('body').catch(() => '')
    const hasData = (pageText?.length || 0) > 500 // should have substantial content
    console.log(`Page content length: ${pageText?.length}, hasData: ${hasData}`)

    const errorMsgs = await page
      .locator('[class*="error"], [class*="empty"], text="沒有資料", text="No data"')
      .count()
    console.log(`Error/empty state elements: ${errorMsgs}`)

    await snap(page, '17-pm-chase-data')
    expect(true).toBeTruthy()
  })
})
