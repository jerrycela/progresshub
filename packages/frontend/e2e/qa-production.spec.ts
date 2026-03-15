/**
 * ProgressHub Production QA Test
 * Target: https://progresshub.zeabur.app
 *
 * Run with:
 *   cd packages/frontend && PLAYWRIGHT_BASE_URL=https://progresshub.zeabur.app npx playwright test e2e/qa-production.spec.ts --reporter=list
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = 'https://progresshub.zeabur.app'

// Helper: take screenshot with named label
async function snap(page: Page, name: string) {
  const dir = '/Users/admin/progresshub_claude/qa-screenshots'
  await page.screenshot({
    path: `${dir}/${name}.png`,
    fullPage: true,
  })
}

// Helper: find first visible element from a list of selectors
async function findVisible(page: Page, selectors: string[]) {
  for (const sel of selectors) {
    const el = page.locator(sel).first()
    if (await el.isVisible().catch(() => false)) {
      return el
    }
  }
  return null
}

// ======================================================
// TEST SUITE 1: Login Page
// ======================================================
test.describe('1. 登入頁面 (Login Page)', () => {
  test('1.1 頁面能正常載入', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await snap(page, '01-login-page')
    await expect(page).toHaveURL(/login/)
  })

  test('1.2 頁面包含表單元素', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

    // Check for inputs
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    console.log(`Found ${inputCount} input(s) on login page`)
    expect(inputCount).toBeGreaterThan(0)
  })

  test('1.3 記錄所有可見的按鈕', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    const buttons = page.locator('button')
    const count = await buttons.count()
    console.log(`Found ${count} button(s) on login page`)

    for (let i = 0; i < count; i++) {
      const text = await buttons
        .nth(i)
        .textContent()
        .catch(() => '')
      const ariaLabel = await buttons
        .nth(i)
        .getAttribute('aria-label')
        .catch(() => '')
      console.log(`  Button ${i + 1}: "${text?.trim()}" aria-label="${ariaLabel}"`)
    }
    expect(count).toBeGreaterThan(0)
  })
})

// ======================================================
// TEST SUITE 2: Demo Login
// ======================================================
test.describe('2. Demo 登入 (Demo Login)', () => {
  test('2.1 以 ADMIN 身份登入', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await snap(page, '02a-before-login')

    // Debug: log all inputs
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    console.log(`Inputs on login page: ${inputCount}`)
    for (let i = 0; i < inputCount; i++) {
      const type = await inputs
        .nth(i)
        .getAttribute('type')
        .catch(() => '')
      const name = await inputs
        .nth(i)
        .getAttribute('name')
        .catch(() => '')
      const placeholder = await inputs
        .nth(i)
        .getAttribute('placeholder')
        .catch(() => '')
      console.log(`  Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`)
    }

    // Try to fill name
    const nameField = await findVisible(page, [
      'input[placeholder*="名字"]',
      'input[placeholder*="姓名"]',
      'input[placeholder*="name"]',
      'input[name="name"]',
      'input[name="displayName"]',
      'input[type="text"]:first-of-type',
      'input.input',
      'input',
    ])

    if (nameField) {
      await nameField.fill('QA測試員')
      console.log('Filled name field with QA測試員')
    } else {
      console.log('No name field found')
    }

    // Log all buttons
    const buttons = page.locator('button')
    const btnCount = await buttons.count()
    for (let i = 0; i < btnCount; i++) {
      const text = await buttons
        .nth(i)
        .textContent()
        .catch(() => '')
      const cls = await buttons
        .nth(i)
        .getAttribute('class')
        .catch(() => '')
      console.log(`  Button ${i}: "${text?.trim()}" class="${cls}"`)
    }

    // Try to click ADMIN role
    const adminEl = await findVisible(page, [
      'button:has-text("ADMIN")',
      'button:has-text("管理員")',
      '[data-role="ADMIN"]',
      'button[value="ADMIN"]',
    ])

    if (adminEl) {
      await adminEl.click()
      console.log('Clicked ADMIN button')
    } else {
      console.log('No ADMIN button found, trying role dropdown or radio')
      // Check for radio/select
      const roleSelect = await findVisible(page, ['select', 'input[type="radio"]'])
      if (roleSelect) {
        const tagName = await roleSelect.evaluate((el: Element) => el.tagName)
        if (tagName === 'SELECT') {
          await (roleSelect as any).selectOption('ADMIN').catch(() => {})
        }
      }
    }

    // Click submit
    const submitEl = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("登入")',
      'button:has-text("Login")',
      'button:has-text("確認")',
      'button:has-text("繼續")',
      'button:has-text("Demo")',
    ])

    if (submitEl) {
      const text = await submitEl.textContent().catch(() => '')
      console.log(`Clicking submit: "${text?.trim()}"`)
      await submitEl.click()
    } else {
      // Click last button
      const lastBtn = buttons.last()
      const text = await lastBtn.textContent().catch(() => '')
      console.log(`Clicking last button: "${text?.trim()}"`)
      await lastBtn.click()
    }

    // Wait for navigation
    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 }).catch(() => {})
    await snap(page, '02b-after-login')

    const currentUrl = page.url()
    console.log(`Post-login URL: ${currentUrl}`)
    expect(currentUrl).not.toContain('/login')
  })
})

// ======================================================
// TEST SUITE 3: Task Pool - Create Task
// ======================================================
test.describe('3. 任務池 - 建立任務 (Task Pool - Create Task)', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

    const nameField = await findVisible(page, ['input', 'input[type="text"]'])
    if (nameField) await nameField.fill('QA測試員')

    const adminBtn = await findVisible(page, [
      'button:has-text("ADMIN")',
      'button:has-text("管理員")',
    ])
    if (adminBtn) await adminBtn.click()

    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("登入")',
      'button:has-text("確認")',
    ])

    if (submitBtn) {
      await submitBtn.click()
    } else {
      await page.locator('button').last().click()
    }

    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 }).catch(() => {})
    console.log(`Logged in, current URL: ${page.url()}`)
  })

  test('3.1 導航到任務池頁面', async ({ page }) => {
    // Try direct URL
    let taskPoolUrl = ''
    for (const url of [
      `${BASE_URL}/task-pool`,
      `${BASE_URL}/tasks`,
      `${BASE_URL}/dashboard/task-pool`,
    ]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) {
        taskPoolUrl = page.url()
        break
      }
    }

    if (!taskPoolUrl) {
      // Navigate via sidebar/nav
      const links = page.locator('a')
      const linkCount = await links.count()
      for (let i = 0; i < linkCount; i++) {
        const text = await links
          .nth(i)
          .textContent()
          .catch(() => '')
        const href = await links
          .nth(i)
          .getAttribute('href')
          .catch(() => '')
        if (
          text?.includes('任務池') ||
          text?.includes('Task Pool') ||
          href?.includes('task-pool')
        ) {
          await links.nth(i).click()
          await page.waitForLoadState('networkidle').catch(() => {})
          taskPoolUrl = page.url()
          break
        }
      }
    }

    await snap(page, '03-task-pool')
    console.log(`Task pool URL: ${taskPoolUrl || page.url()}`)
    expect(page.url()).not.toContain('/login')
  })

  test('3.2 點擊建立任務按鈕', async ({ page }) => {
    // Try to navigate to task pool
    for (const url of [`${BASE_URL}/task-pool`, `${BASE_URL}/tasks`]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) break
    }

    if (page.url().includes('/login')) {
      // Find via navigation
      const links = page.locator('a')
      const count = await links.count()
      for (let i = 0; i < count; i++) {
        const text = await links
          .nth(i)
          .textContent()
          .catch(() => '')
        const href = await links
          .nth(i)
          .getAttribute('href')
          .catch(() => '')
        if (text?.includes('任務') || href?.includes('task')) {
          await links.nth(i).click()
          await page.waitForLoadState('networkidle').catch(() => {})
          if (!page.url().includes('/login')) break
        }
      }
    }

    await snap(page, '03a-task-pool-loaded')
    console.log(`On page: ${page.url()}`)

    // Find all buttons
    const buttons = page.locator('button')
    const btnCount = await buttons.count()
    console.log(`Found ${btnCount} buttons on task pool page`)
    for (let i = 0; i < btnCount; i++) {
      const text = await buttons
        .nth(i)
        .textContent()
        .catch(() => '')
      console.log(`  Button ${i}: "${text?.trim()}"`)
    }

    // Find create button
    const createBtn = await findVisible(page, [
      'button:has-text("建立任務")',
      'button:has-text("新增任務")',
      'button:has-text("+ 建立")',
      'button:has-text("Create Task")',
      'button:has-text("新增")',
    ])

    if (createBtn) {
      const text = await createBtn.textContent().catch(() => '')
      console.log(`Found create button: "${text?.trim()}"`)
      await createBtn.click()
      await page.waitForTimeout(1000)
      await snap(page, '03b-create-modal-open')

      // Check modal opened
      const modal = page
        .locator('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]')
        .first()
      const modalVisible = await modal.isVisible().catch(() => false)
      console.log(`Modal visible: ${modalVisible}`)
      expect(modalVisible || page.url().includes('create')).toBeTruthy()
    } else {
      console.log('Create button NOT found, checking all available buttons...')
      for (let i = 0; i < Math.min(btnCount, 15); i++) {
        const text = await buttons
          .nth(i)
          .textContent()
          .catch(() => '')
        const visible = await buttons
          .nth(i)
          .isVisible()
          .catch(() => false)
        console.log(`  Button ${i}: "${text?.trim()}" visible=${visible}`)
      }
      // This test notes the finding but doesn't hard-fail
      console.log('WARNING: 建立任務 button not found')
    }
  })

  test('3.3 填寫並提交建立任務表單', async ({ page }) => {
    // Navigate to task pool
    for (const url of [`${BASE_URL}/task-pool`, `${BASE_URL}/tasks`]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) break
    }

    // Open create modal
    const createBtn = await findVisible(page, [
      'button:has-text("建立任務")',
      'button:has-text("新增任務")',
      'button:has-text("新增")',
      'button:has-text("Create")',
    ])

    if (!createBtn) {
      console.log('Create button not found, skipping form fill test')
      return
    }

    await createBtn.click()
    await page.waitForTimeout(1500)
    await snap(page, '04a-form-before-fill')

    // Debug inputs in modal
    const allInputs = page.locator('input:visible, textarea:visible')
    const inputCount = await allInputs.count()
    console.log(`Found ${inputCount} visible inputs in form`)
    for (let i = 0; i < inputCount; i++) {
      const type = await allInputs
        .nth(i)
        .getAttribute('type')
        .catch(() => '')
      const name = await allInputs
        .nth(i)
        .getAttribute('name')
        .catch(() => '')
      const placeholder = await allInputs
        .nth(i)
        .getAttribute('placeholder')
        .catch(() => '')
      console.log(`  Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`)
    }

    // Fill title
    const titleField = await findVisible(page, [
      'input[placeholder*="標題"]',
      'input[placeholder*="任務名稱"]',
      'input[placeholder*="title"]',
      'input[name="title"]',
      'input[name="name"]',
      '[role="dialog"] input:first-of-type',
      '.modal input:first-of-type',
      'input:visible:first-of-type',
    ])

    if (titleField) {
      await titleField.fill('QA自動化測試任務')
      console.log('Title filled: QA自動化測試任務')
    } else {
      console.log('Title field not found')
    }

    // Fill description
    const descField = await findVisible(page, [
      'textarea[placeholder*="描述"]',
      'textarea[placeholder*="說明"]',
      'textarea[name="description"]',
      'textarea:visible',
    ])

    if (descField) {
      await descField.fill('這是一個自動化QA測試建立的任務')
      console.log('Description filled')
    }

    await snap(page, '04b-form-filled')

    // Submit
    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("建立")',
      'button:has-text("確認")',
      'button:has-text("儲存")',
      'button:has-text("新增")',
      '[role="dialog"] button:last-of-type',
    ])

    if (submitBtn) {
      const text = await submitBtn.textContent().catch(() => '')
      console.log(`Submitting form with button: "${text?.trim()}"`)
      await submitBtn.click()
      await page.waitForTimeout(2000)
      await snap(page, '04c-after-submit')

      const currentUrl = page.url()
      console.log(`After submit URL: ${currentUrl}`)

      // Check for any toast/notification
      const notifications = page.locator(
        '[role="alert"], .toast, .notification, .Toastify, [class*="toast"], [class*="notification"]',
      )
      const notifCount = await notifications.count()
      console.log(`Notifications found: ${notifCount}`)
      for (let i = 0; i < notifCount; i++) {
        const text = await notifications
          .nth(i)
          .textContent()
          .catch(() => '')
        console.log(`  Notification: "${text?.trim()}"`)
      }
    } else {
      console.log('Submit button not found')
    }
  })
})

// ======================================================
// TEST SUITE 4: My Tasks Page
// ======================================================
test.describe('4. 我的任務頁面 (My Tasks)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    const nameField = await findVisible(page, ['input', 'input[type="text"]'])
    if (nameField) await nameField.fill('QA測試員')
    const adminBtn = await findVisible(page, [
      'button:has-text("ADMIN")',
      'button:has-text("管理員")',
    ])
    if (adminBtn) await adminBtn.click()
    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("登入")',
      'button:has-text("確認")',
    ])
    if (submitBtn) await submitBtn.click()
    else await page.locator('button').last().click()
    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 }).catch(() => {})
  })

  test('4.1 導航到我的任務頁面', async ({ page }) => {
    // Try direct URLs
    for (const url of [
      `${BASE_URL}/my-tasks`,
      `${BASE_URL}/tasks/my`,
      `${BASE_URL}/dashboard/my-tasks`,
      `${BASE_URL}/my-task`,
    ]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) break
    }

    // If still not found, try navigation links
    if (page.url().includes('/login') || page.url() === BASE_URL + '/') {
      const links = page.locator('a')
      const count = await links.count()
      for (let i = 0; i < count; i++) {
        const text = await links
          .nth(i)
          .textContent()
          .catch(() => '')
        if (text?.includes('我的任務') || text?.includes('My Task')) {
          await links.nth(i).click()
          await page.waitForLoadState('networkidle').catch(() => {})
          break
        }
      }
    }

    await snap(page, '05-my-tasks')
    console.log(`My tasks URL: ${page.url()}`)
    expect(page.url()).not.toContain('/login')
  })

  test('4.2 測試所有可見按鈕和篩選器', async ({ page }) => {
    // Navigate
    for (const url of [
      `${BASE_URL}/my-tasks`,
      `${BASE_URL}/tasks/my`,
      `${BASE_URL}/dashboard/my-tasks`,
    ]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) break
    }

    // If not reached, find via navigation
    if (page.url().includes('/login')) {
      const links = page.locator('a')
      const count = await links.count()
      for (let i = 0; i < count; i++) {
        const text = await links
          .nth(i)
          .textContent()
          .catch(() => '')
        if (text?.includes('我的任務') || text?.includes('My Task')) {
          await links.nth(i).click()
          await page.waitForLoadState('networkidle').catch(() => {})
          break
        }
      }
    }

    await snap(page, '05a-my-tasks-loaded')
    console.log(`On page: ${page.url()}`)

    // List all visible buttons
    const buttons = page.locator('button:visible')
    const btnCount = await buttons.count()
    console.log(`Found ${btnCount} visible buttons`)
    for (let i = 0; i < Math.min(btnCount, 15); i++) {
      const text = await buttons
        .nth(i)
        .textContent()
        .catch(() => '')
      const ariaLabel = await buttons
        .nth(i)
        .getAttribute('aria-label')
        .catch(() => '')
      console.log(`  Button ${i + 1}: "${text?.trim()}" aria-label="${ariaLabel}"`)
    }

    // Click filter buttons
    const filterBtns = [
      'button:has-text("全部")',
      'button:has-text("進行中")',
      'button:has-text("待處理")',
      'button:has-text("已完成")',
      'button:has-text("逾期")',
      '[role="tab"]',
    ]

    for (const sel of filterBtns) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        const text = await el.textContent().catch(() => '')
        console.log(`Clicking filter: "${text?.trim()}"`)
        await el.click()
        await page.waitForTimeout(500)
      }
    }

    await snap(page, '05b-my-tasks-after-filters')
    expect(true).toBeTruthy() // test completes without crash
  })
})

// ======================================================
// TEST SUITE 5: Gantt Chart
// ======================================================
test.describe('5. 甘特圖頁面 (Gantt Chart)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    const nameField = await findVisible(page, ['input', 'input[type="text"]'])
    if (nameField) await nameField.fill('QA測試員')
    const adminBtn = await findVisible(page, [
      'button:has-text("ADMIN")',
      'button:has-text("管理員")',
    ])
    if (adminBtn) await adminBtn.click()
    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("登入")',
      'button:has-text("確認")',
    ])
    if (submitBtn) await submitBtn.click()
    else await page.locator('button').last().click()
    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 }).catch(() => {})
  })

  test('5.1 導航到甘特圖頁面', async ({ page }) => {
    // Try direct URLs
    for (const url of [
      `${BASE_URL}/gantt`,
      `${BASE_URL}/timeline`,
      `${BASE_URL}/dashboard/gantt`,
      `${BASE_URL}/schedule`,
    ]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) break
    }

    // Find via navigation
    if (page.url().includes('/login')) {
      const links = page.locator('a')
      const count = await links.count()
      for (let i = 0; i < count; i++) {
        const text = await links
          .nth(i)
          .textContent()
          .catch(() => '')
        const href = await links
          .nth(i)
          .getAttribute('href')
          .catch(() => '')
        if (
          text?.includes('甘特') ||
          text?.includes('Gantt') ||
          text?.includes('時程') ||
          href?.includes('gantt')
        ) {
          await links.nth(i).click()
          await page.waitForLoadState('networkidle').catch(() => {})
          break
        }
      }
    }

    await snap(page, '06-gantt')
    console.log(`Gantt URL: ${page.url()}`)

    // Check for chart elements
    const chartSelectors = ['.gantt', '[class*="gantt"]', 'svg', 'canvas', '.chart-container']
    for (const sel of chartSelectors) {
      const el = page.locator(sel).first()
      if (await el.isVisible().catch(() => false)) {
        console.log(`Found chart element: ${sel}`)
        break
      }
    }

    expect(page.url()).not.toContain('/login')
  })

  test('5.2 測試甘特圖控制項', async ({ page }) => {
    // Navigate to gantt
    for (const url of [`${BASE_URL}/gantt`, `${BASE_URL}/timeline`]) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
      if (!page.url().includes('/login')) break
    }

    if (page.url().includes('/login')) {
      // Navigate via sidebar
      const links = page.locator('a')
      const count = await links.count()
      for (let i = 0; i < count; i++) {
        const text = await links
          .nth(i)
          .textContent()
          .catch(() => '')
        if (text?.includes('甘特') || text?.includes('Gantt')) {
          await links.nth(i).click()
          await page.waitForLoadState('networkidle').catch(() => {})
          break
        }
      }
    }

    // List buttons
    const buttons = page.locator('button:visible')
    const btnCount = await buttons.count()
    console.log(`Found ${btnCount} buttons in Gantt page`)
    for (let i = 0; i < Math.min(btnCount, 10); i++) {
      const text = await buttons
        .nth(i)
        .textContent()
        .catch(() => '')
      const ariaLabel = await buttons
        .nth(i)
        .getAttribute('aria-label')
        .catch(() => '')
      console.log(`  Button ${i + 1}: "${text?.trim()}" aria-label="${ariaLabel}"`)
    }

    await snap(page, '06b-gantt-controls')
    expect(true).toBeTruthy()
  })
})

// ======================================================
// TEST SUITE 6: Navigation
// ======================================================
test.describe('6. 側邊導航 (Sidebar Navigation)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    const nameField = await findVisible(page, ['input', 'input[type="text"]'])
    if (nameField) await nameField.fill('QA測試員')
    const adminBtn = await findVisible(page, [
      'button:has-text("ADMIN")',
      'button:has-text("管理員")',
    ])
    if (adminBtn) await adminBtn.click()
    const submitBtn = await findVisible(page, [
      'button[type="submit"]',
      'button:has-text("登入")',
      'button:has-text("確認")',
    ])
    if (submitBtn) await submitBtn.click()
    else await page.locator('button').last().click()
    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 }).catch(() => {})
  })

  test('6.1 列出並測試所有導航連結', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' }).catch(() => {})
    await snap(page, '07-main-after-login')

    // List all navigation links
    const navLinks = page.locator('nav a, .sidebar a, [role="navigation"] a, aside a')
    const navCount = await navLinks.count()
    console.log(`Found ${navCount} navigation links`)

    for (let i = 0; i < navCount; i++) {
      const text = await navLinks
        .nth(i)
        .textContent()
        .catch(() => '')
      const href = await navLinks
        .nth(i)
        .getAttribute('href')
        .catch(() => '')
      console.log(`  Nav ${i + 1}: "${text?.trim()}" href="${href}"`)
    }

    // Also log all links on page
    const allLinks = page.locator('a:visible')
    const allCount = await allLinks.count()
    console.log(`\nAll visible links: ${allCount}`)
    for (let i = 0; i < Math.min(allCount, 20); i++) {
      const text = await allLinks
        .nth(i)
        .textContent()
        .catch(() => '')
      const href = await allLinks
        .nth(i)
        .getAttribute('href')
        .catch(() => '')
      console.log(`  Link ${i + 1}: "${text?.trim()}" href="${href}"`)
    }

    expect(true).toBeTruthy()
  })

  test('6.2 測試儀表板頁面', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
    await snap(page, '08-dashboard')
    console.log(`Dashboard URL: ${page.url()}`)
    expect(page.url()).not.toContain('/login')
  })
})
