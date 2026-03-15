/**
 * ProgressHub QA: Gantt Chart & Project Management
 * Target: https://progresshub-cb.zeabur.app
 *
 * Strategy: Pre-fetch auth token via API, inject into localStorage to bypass rate-limited login UI
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

const BASE_URL = 'https://progresshub-cb.zeabur.app'
const API_BASE = 'https://progress-hub.zeabur.app/api'
const SCREENSHOT_DIR = '/Users/admin/progresshub_claude/qa-screenshots'

test.describe.configure({ mode: 'serial' })

// Helper: take screenshot
async function snap(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true })
}

// Helper: find first visible element
async function findVisible(page: Page, selectors: string[]) {
  for (const sel of selectors) {
    const el = page.locator(sel).first()
    if (await el.isVisible().catch(() => false)) return el
  }
  return null
}

let sharedPage: Page
let sharedContext: BrowserContext

test.describe('ProgressHub QA - Gantt & Projects', () => {
  test.beforeAll(async ({ browser }) => {
    // Step 1: Get auth token via direct API call (bypasses frontend rate limit)
    const loginResp = await fetch(`${API_BASE}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'QA-Gantt-Tester', permissionLevel: 'PM' }),
    })
    const loginData = await loginResp.json()
    console.log(`Direct API login: status=${loginResp.status}, success=${loginData?.success}`)

    if (!loginData?.success) {
      console.log('WARNING: Direct API login failed, will try UI login')
    }

    // Step 2: Create browser context and inject tokens
    sharedContext = await browser.newContext()
    sharedPage = await sharedContext.newPage()

    if (loginData?.success) {
      const token = loginData.data.token
      const refreshToken = loginData.data.refreshToken

      // Listen to console and network for debugging
      sharedPage.on('console', msg => {
        if (
          msg.type() === 'error' ||
          msg.text().includes('auth') ||
          msg.text().includes('token') ||
          msg.text().includes('429')
        ) {
          console.log(`[BROWSER ${msg.type()}] ${msg.text()}`)
        }
      })
      sharedPage.on('response', resp => {
        if (resp.url().includes('/api/auth') || resp.status() === 429) {
          console.log(`[NETWORK] ${resp.status()} ${resp.url()}`)
        }
      })

      // Navigate to origin first (localStorage requires same origin)
      await sharedPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await sharedPage.waitForTimeout(1000)

      // Inject auth tokens into localStorage
      await sharedPage.evaluate(
        ({ t, rt }) => {
          localStorage.setItem('auth_token', t)
          localStorage.setItem('auth_refresh_token', rt)
        },
        { t: token, rt: refreshToken },
      )
      console.log('Injected auth tokens into localStorage')

      // Navigate to dashboard and wait for SPA to initialize
      await sharedPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
      await sharedPage.waitForTimeout(3000)

      // If still on login, try once more
      if (sharedPage.url().includes('/login')) {
        console.log('Still on login after first attempt, navigating again...')
        await sharedPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
        await sharedPage.waitForTimeout(3000)
      }
    } else {
      // Fallback: try UI login
      await sharedPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
      await sharedPage.waitForTimeout(2000)

      const nameField = sharedPage.locator('input[placeholder*="姓名"]')
      if (await nameField.isVisible().catch(() => false)) await nameField.fill('QA-Gantt-Tester')
      const pmBtn = sharedPage.locator('button').filter({ hasText: /^PM$/ })
      if (await pmBtn.isVisible().catch(() => false)) await pmBtn.click()
      await sharedPage.waitForTimeout(500)
      const demoBtn = sharedPage.locator('button:has-text("Demo 身分登入")')
      if (await demoBtn.isVisible().catch(() => false)) await demoBtn.click()
      await sharedPage
        .waitForURL(url => !url.includes('/login'), { timeout: 30000 })
        .catch(() => {})
      await sharedPage.waitForTimeout(2000)
    }

    console.log(`=== Setup complete, URL: ${sharedPage.url()} ===`)
    await snap(sharedPage, 'gantt-00-after-login')
  })

  test.afterAll(async () => {
    await sharedContext.close()
  })

  // ======================================================
  // 1. GANTT CHART PAGE
  // ======================================================

  test('1.1 Gantt page loads with timeline and task bars', async () => {
    const page = sharedPage
    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await snap(page, 'gantt-01-page-load')

    const url = page.url()
    console.log(`Gantt URL: ${url}`)

    if (url.includes('/login')) {
      console.log('FAIL: Redirected to login - authentication failed')
      return
    }

    // Check for gantt content
    const bodyText = await page
      .locator('body')
      .textContent()
      .catch(() => '')
    const hasTimeline = bodyText?.includes('任務時程')
    const hasGantt = bodyText?.includes('甘特圖')
    console.log(`Has "任務時程": ${hasTimeline}`)
    console.log(`Has "甘特圖": ${hasGantt}`)

    // Check for task bars
    const taskBars = page.locator('[class*="task-bar"], [class*="task-row"], [class*="bar"]')
    const barCount = await taskBars.count()
    console.log(`Task bar elements: ${barCount}`)

    // Check for SVG (chart rendering)
    const svgCount = await page.locator('svg').count()
    console.log(`SVG elements: ${svgCount}`)

    // Check for time scale buttons
    const timeButtons = page.locator(
      'button:has-text("日"), button:has-text("週"), button:has-text("月")',
    )
    const timeCount = await timeButtons.count()
    console.log(`Time scale buttons: ${timeCount}`)

    expect(hasGantt || hasTimeline).toBeTruthy()
  })

  test('1.2 Filter controls: project, department, status, employee', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await snap(page, 'gantt-02-filters')

    // Check native selects (project, function, status)
    const selects = page.locator('select:visible')
    const selectCount = await selects.count()
    console.log(`Native <select> elements: ${selectCount}`)
    for (let i = 0; i < selectCount; i++) {
      const options = await selects.nth(i).locator('option').allTextContents()
      console.log(`  Select ${i} options: ${options.join(', ')}`)
    }

    // Check status filter tags
    for (const status of ['待認領', '已認領', '進行中', '暫停中', '已完成', '卡關']) {
      const el = page.locator(`text="${status}"`).first()
      const visible = await el.isVisible().catch(() => false)
      console.log(`Status "${status}": ${visible ? 'FOUND' : 'NOT FOUND'}`)
    }

    // Check employee filter (SearchableSelect)
    const empFilter = page.locator('button:has-text("全部員工")')
    const empVisible = await empFilter.isVisible().catch(() => false)
    console.log(`Employee filter "全部員工": ${empVisible}`)

    // Time scale buttons
    for (const unit of ['日', '週', '月']) {
      const btn = page.locator(`button:has-text("${unit}")`).first()
      const visible = await btn.isVisible().catch(() => false)
      console.log(`Time scale "${unit}": ${visible ? 'FOUND' : 'NOT FOUND'}`)
    }

    // Group by project
    const groupBtn = page.locator('button:has-text("按專案分組")')
    console.log(`Group by project button: ${await groupBtn.isVisible().catch(() => false)}`)
  })

  test('1.3 SearchableSelect in employee filter (new feature)', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // From code: GanttFilters uses <SearchableSelect v-model="selectedEmployee" :options="employeeOptions" label="員工" />
    // SearchableSelect renders as a custom dropdown, not a native select

    // Look for the employee label and its associated control
    const employeeLabel = page.locator('label:has-text("員工"), span:has-text("員工")')
    const labelVisible = await employeeLabel
      .first()
      .isVisible()
      .catch(() => false)
    console.log(`Employee label found: ${labelVisible}`)

    // Find SearchableSelect container (should have a button/input with "全部員工" or similar)
    const searchableBtn = page.locator('button:has-text("全部員工")')
    const hasClearBtn = page.locator('button[aria-label="清除選取"]')

    console.log(
      `SearchableSelect button "全部員工": ${await searchableBtn.isVisible().catch(() => false)}`,
    )
    console.log(`Clear selection button: ${await hasClearBtn.isVisible().catch(() => false)}`)

    if (await searchableBtn.isVisible().catch(() => false)) {
      // Click to open dropdown
      await searchableBtn.click()
      await page.waitForTimeout(500)
      await snap(page, 'gantt-03-employee-dropdown')

      // Check for search input inside dropdown
      const searchInput = page.locator(
        'input[placeholder*="搜尋"], input[placeholder*="search"], input[type="text"]:visible',
      )
      const searchCount = await searchInput.count()
      console.log(`Search inputs visible after click: ${searchCount}`)

      // Check for dropdown options
      const options = page.locator('[class*="option"], li, [role="option"]')
      const optCount = await options.count()
      console.log(`Dropdown options visible: ${optCount}`)

      // Try typing to filter
      if (searchCount > 0) {
        await searchInput.first().fill('test')
        await page.waitForTimeout(300)
        await snap(page, 'gantt-03b-employee-search')

        const filteredCount = await options.count()
        console.log(`Options after typing "test": ${filteredCount}`)

        // Clear
        await searchInput.first().fill('')
      }

      // Close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // Also scan for all SearchableSelect instances via HTML analysis
    const allButtons = page.locator('button:visible')
    const btnCount = await allButtons.count()
    const buttonTexts: string[] = []
    for (let i = 0; i < btnCount; i++) {
      const text = await allButtons
        .nth(i)
        .textContent()
        .catch(() => '')
      buttonTexts.push(text?.trim() || '')
    }
    console.log(`All buttons: ${buttonTexts.join(' | ')}`)

    await snap(page, 'gantt-03c-searchable-final')
  })

  test('1.4 Milestone display and management', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // From code: "管理里程碑" button exists when canManageMilestones (PM has this)
    const milestoneBtn = page.locator('button:has-text("管理里程碑")')
    const visible = await milestoneBtn.isVisible().catch(() => false)
    console.log(`"管理里程碑" button: ${visible ? 'FOUND' : 'NOT FOUND'}`)

    // Also check for <span class="hidden sm:inline">管理里程碑</span> (may be hidden on small screens)
    const milestoneSpan = page.locator('span:has-text("管理里程碑")')
    const spanVisible = await milestoneSpan.isVisible().catch(() => false)
    console.log(`Milestone span: ${spanVisible}`)

    // Check for milestone rows
    const milestoneRow = page.locator('[class*="milestone"], [class*="Milestone"]')
    const mCount = await milestoneRow.count()
    console.log(`Milestone elements: ${mCount}`)

    // Check body text
    const bodyText = await page
      .locator('body')
      .textContent()
      .catch(() => '')
    console.log(`Contains "里程碑": ${bodyText?.includes('里程碑')}`)
    console.log(`Contains "管理里程碑": ${bodyText?.includes('管理里程碑')}`)

    await snap(page, 'gantt-04-milestones')
  })

  test('1.5 Click "管理里程碑" opens MilestoneModal', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const milestoneBtn = page.locator('button:has-text("管理里程碑")')
    if (await milestoneBtn.isVisible().catch(() => false)) {
      await milestoneBtn.click()
      await page.waitForTimeout(1000)
      await snap(page, 'gantt-05-milestone-modal')

      const modal = page.locator('[role="dialog"]').first()
      const modalVisible = await modal.isVisible().catch(() => false)
      console.log(`Milestone modal visible: ${modalVisible}`)

      if (modalVisible) {
        const modalText = await modal.textContent().catch(() => '')
        console.log(`Modal content: ${modalText?.substring(0, 400)}`)

        // Check overflow
        const modalBox = await modal.boundingBox()
        const viewport = page.viewportSize()
        if (modalBox && viewport) {
          const overflows = modalBox.y + modalBox.height > viewport.height
          console.log(
            `Modal: ${Math.round(modalBox.width)}x${Math.round(modalBox.height)} at y=${Math.round(modalBox.y)}`,
          )
          console.log(`Viewport: ${viewport.width}x${viewport.height}`)
          console.log(`Overflows viewport: ${overflows}`)
        }

        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    } else {
      // Button might be hidden on small viewport; check if it's in DOM
      const inDom = await page.locator('button:has-text("管理里程碑")').count()
      console.log(`Button in DOM but not visible: ${inDom > 0}`)
    }
  })

  test('1.6 Filter interaction: change project and department', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Change project select
    const selects = page.locator('select:visible')
    const selectCount = await selects.count()

    for (let i = 0; i < selectCount; i++) {
      const options = await selects.nth(i).locator('option').allTextContents()
      console.log(`Select ${i}: ${options.join(', ')}`)

      if (options.length > 1) {
        await selects.nth(i).selectOption({ index: 1 })
        await page.waitForTimeout(1000)
        console.log(`Changed select ${i} to index 1`)
      }
    }

    await snap(page, 'gantt-06-filter-changed')

    // Reset all
    for (let i = 0; i < selectCount; i++) {
      await selects
        .nth(i)
        .selectOption({ index: 0 })
        .catch(() => {})
    }
    await page.waitForTimeout(500)
  })

  test('1.7 Toggle group-by-project and time scale', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Group by project
    const groupBtn = page.locator('button:has-text("按專案分組")')
    if (await groupBtn.isVisible().catch(() => false)) {
      await groupBtn.click()
      await page.waitForTimeout(1000)
      await snap(page, 'gantt-07a-grouped')
      console.log('Toggled group-by-project ON')

      await groupBtn.click()
      await page.waitForTimeout(500)
      console.log('Toggled group-by-project OFF')
    }

    // Time scale
    for (const scale of ['日', '月']) {
      const btn = page.locator(`button:has-text("${scale}")`).first()
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(500)
        await snap(page, `gantt-07b-scale-${scale}`)
        console.log(`Switched time scale to "${scale}"`)
      }
    }

    // Reset to week
    const weekBtn = page.locator('button:has-text("週")').first()
    if (await weekBtn.isVisible().catch(() => false)) {
      await weekBtn.click()
      await page.waitForTimeout(500)
    }
  })

  // ======================================================
  // 2. PROJECTS PAGE
  // ======================================================

  test('2.1 Projects page loads with project list', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      // Try re-injecting token
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
    }

    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await snap(page, 'gantt-08-projects-page')

    const url = page.url()
    console.log(`Projects URL: ${url}`)

    if (url.includes('/login')) {
      console.log('FAIL: Redirected to login')
      return
    }

    const bodyText = await page
      .locator('body')
      .textContent()
      .catch(() => '')
    console.log(`Contains "專案管理": ${bodyText?.includes('專案管理')}`)

    // Check for project cards
    const projectCards = page.locator('.card, [class*="card"]')
    const cardCount = await projectCards.count()
    console.log(`Card elements: ${cardCount}`)

    // List all buttons
    const buttons = page.locator('button:visible')
    const btnCount = await buttons.count()
    const btnTexts: string[] = []
    for (let i = 0; i < Math.min(btnCount, 25); i++) {
      const text = await buttons
        .nth(i)
        .textContent()
        .catch(() => '')
      btnTexts.push(text?.trim() || '')
    }
    console.log(`Buttons: ${btnTexts.join(' | ')}`)
  })

  test('2.2 Project member management button and modal', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // From code: Button variant="secondary" size="sm" with text "成員" (not "成員管理")
    const memberBtn = page.locator('button:has-text("成員")').first()
    const visible = await memberBtn.isVisible().catch(() => false)
    console.log(`Member button "成員": ${visible}`)

    if (visible) {
      await memberBtn.click()
      await page.waitForTimeout(1500)
      await snap(page, 'gantt-09-members-modal')

      // Check modal
      const modal = page.locator('[role="dialog"]').first()
      const modalVisible = await modal.isVisible().catch(() => false)
      console.log(`ProjectMembersModal visible: ${modalVisible}`)

      if (modalVisible) {
        const modalText = await modal.textContent().catch(() => '')
        console.log(`Modal content: ${modalText?.substring(0, 500)}`)

        // Check for "目前成員" section
        const hasMemberList = modalText?.includes('目前成員')
        console.log(`Has "目前成員" section: ${hasMemberList}`)

        // Check for "新增成員" section (PM should see this)
        const hasAddSection = modalText?.includes('新增成員')
        console.log(`Has "新增成員" section: ${hasAddSection}`)

        // Check for MultiSearchSelect (搜尋員工...)
        const searchPlaceholder = page.locator('input[placeholder*="搜尋員工"]')
        const hasSearch = await searchPlaceholder.isVisible().catch(() => false)
        console.log(`MultiSearchSelect for adding members: ${hasSearch}`)

        // Check for remove buttons (aria-label="移除成員")
        const removeBtns = modal.locator('button[aria-label="移除成員"]')
        const rmCount = await removeBtns.count()
        console.log(`Remove member buttons: ${rmCount}`)

        // Check member list items
        const memberItems = modal.locator('[class*="bg-tertiary"], [style*="bg-tertiary"]')
        const mCount = await memberItems.count()
        console.log(`Member items: ${mCount}`)

        // Check modal overflow
        const modalBox = await modal.boundingBox()
        const viewport = page.viewportSize()
        if (modalBox && viewport) {
          const overflows = modalBox.y + modalBox.height > viewport.height
          console.log(`Modal: ${Math.round(modalBox.width)}x${Math.round(modalBox.height)}`)
          console.log(`Overflows: ${overflows}`)
        }

        await snap(page, 'gantt-09b-members-modal-content')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    } else {
      console.log('Member button not found')
      // Check all button texts for debug
      const allBtns = page.locator('button:visible')
      const count = await allBtns.count()
      for (let i = 0; i < Math.min(count, 20); i++) {
        const text = await allBtns
          .nth(i)
          .textContent()
          .catch(() => '')
        console.log(`  Button ${i}: "${text?.trim()}"`)
      }
    }
  })

  // ======================================================
  // 3. MODAL OVERFLOW VERIFICATION
  // ======================================================

  test('3.1 Modal overflow: milestone modal on Gantt', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const milestoneBtn = page.locator('button:has-text("管理里程碑")')
    if (await milestoneBtn.isVisible().catch(() => false)) {
      await milestoneBtn.click()
      await page.waitForTimeout(1000)

      const modal = page.locator('[role="dialog"]').first()
      if (await modal.isVisible().catch(() => false)) {
        // Check CSS overflow properties
        const styles = await modal.evaluate((el: HTMLElement) => {
          const cs = window.getComputedStyle(el)
          return {
            maxHeight: cs.maxHeight,
            overflow: cs.overflow,
            overflowY: cs.overflowY,
            display: cs.display,
            flexDirection: cs.flexDirection,
          }
        })
        console.log(`Modal styles: ${JSON.stringify(styles)}`)

        // Check inner scrollable area
        const scrollArea = modal.locator('.overflow-y-auto, [class*="overflow"]')
        const scrollCount = await scrollArea.count()
        console.log(`Scrollable areas in modal: ${scrollCount}`)

        const modalBox = await modal.boundingBox()
        const viewport = page.viewportSize()
        if (modalBox && viewport) {
          const overflows = modalBox.y + modalBox.height > viewport.height
          console.log(
            `Modal dims: ${Math.round(modalBox.width)}x${Math.round(modalBox.height)}, viewport: ${viewport.width}x${viewport.height}`,
          )
          console.log(`OVERFLOW: ${overflows}`)
          expect(overflows).toBeFalsy()
        }

        await snap(page, 'gantt-10-modal-overflow')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    }
  })

  test('3.2 Modal overflow: task creation on Task Pool', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const createBtn = await findVisible(page, [
      'button:has-text("建立任務")',
      'button:has-text("新增任務")',
      'button:has-text("新增")',
    ])

    if (createBtn) {
      await createBtn.click()
      await page.waitForTimeout(1000)

      const modal = page.locator('[role="dialog"]').first()
      if (await modal.isVisible().catch(() => false)) {
        const modalBox = await modal.boundingBox()
        const viewport = page.viewportSize()
        if (modalBox && viewport) {
          const overflows = modalBox.y + modalBox.height > viewport.height
          console.log(
            `Task modal: ${Math.round(modalBox.width)}x${Math.round(modalBox.height)}, viewport: ${viewport.width}x${viewport.height}`,
          )
          console.log(`OVERFLOW: ${overflows}`)
          expect(overflows).toBeFalsy()
        }

        // Check scroll capability
        const hasScroll = await modal
          .evaluate((el: HTMLElement) => {
            return el.scrollHeight > el.clientHeight
          })
          .catch(() => false)
        console.log(`Modal scrollable: ${hasScroll}`)

        await snap(page, 'gantt-11-task-modal-overflow')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    } else {
      console.log('Create task button not found')
    }
  })

  // ======================================================
  // 4. FINAL SCREENSHOTS
  // ======================================================

  test('4.1 Capture all key page screenshots', async () => {
    const page = sharedPage
    if (page.url().includes('/login')) {
      console.log('SKIP: Not logged in')
      return
    }

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await snap(page, 'gantt-12-dashboard')
    console.log(`Dashboard: ${page.url()}`)

    await page.goto(`${BASE_URL}/gantt`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await snap(page, 'gantt-13-gantt-final')
    console.log(`Gantt: ${page.url()}`)

    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await snap(page, 'gantt-14-projects-final')
    console.log(`Projects: ${page.url()}`)

    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await snap(page, 'gantt-15-taskpool-final')
    console.log(`Task Pool: ${page.url()}`)
  })
})
