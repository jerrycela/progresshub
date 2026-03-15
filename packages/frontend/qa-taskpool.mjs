import { chromium } from 'playwright'

const BASE = 'https://progresshub.zeabur.app'
const results = []

function report(test, status, details = '') {
  results.push({ test, status, details })
  console.log(`[${status}] ${test}${details ? ' — ' + details : ''}`)
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  // ===== SETUP: Login as PM =====
  console.log('\n=== SETUP: Login as PM ===')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.screenshot({ path: '/tmp/qa-login.png' })

  // Look for demo login button
  const demoBtn = page.locator(
    'button:has-text("Demo"), button:has-text("demo"), button:has-text("體驗"), button:has-text("展示")',
  )
  const demoBtnCount = await demoBtn.count()
  console.log(`Demo buttons found: ${demoBtnCount}`)

  if (demoBtnCount > 0) {
    await demoBtn.first().click()
    await sleep(2000)
    await page.screenshot({ path: '/tmp/qa-login-roles.png' })
  }

  // Find PM role button
  const pmBtn = page.locator('button:has-text("PM"), button:has-text("專案經理"), [data-role="PM"]')
  const pmBtnCount = await pmBtn.count()
  console.log(`PM buttons found: ${pmBtnCount}`)

  if (pmBtnCount > 0) {
    await pmBtn.first().click()
    await sleep(3000)
  } else {
    // Try clicking any role-selection that contains PM
    const allButtons = await page.locator('button').all()
    for (const btn of allButtons) {
      const text = await btn.textContent()
      if (text && (text.includes('PM') || text.includes('專案經理'))) {
        await btn.click()
        await sleep(3000)
        break
      }
    }
  }

  await page.screenshot({ path: '/tmp/qa-after-login.png' })
  console.log(`Current URL after login: ${page.url()}`)

  // Navigate to task pool
  console.log('\n=== Navigating to Task Pool ===')

  // Try sidebar navigation
  const taskPoolLink = page.locator(
    'a:has-text("任務池"), a:has-text("Task Pool"), [href*="task-pool"], [href*="taskpool"], nav a:has-text("任務")',
  )
  const taskPoolCount = await taskPoolLink.count()
  console.log(`Task pool links found: ${taskPoolCount}`)

  if (taskPoolCount > 0) {
    await taskPoolLink.first().click()
    await sleep(2000)
  } else {
    // Try direct navigation
    await page.goto(`${BASE}/task-pool`, { waitUntil: 'networkidle', timeout: 15000 })
    await sleep(2000)
  }

  await page.screenshot({ path: '/tmp/qa-taskpool.png' })
  console.log(`Task pool URL: ${page.url()}`)

  // ===== TEST 1: Task Pool Page Load =====
  console.log('\n=== TEST 1: Task Pool Page Load ===')

  const pageContent = await page.content()
  const hasTaskList =
    pageContent.includes('任務') || pageContent.includes('task') || pageContent.includes('Task')

  // Check for filter controls
  const filterElements = await page
    .locator(
      'select, input[type="search"], input[placeholder*="搜尋"], input[placeholder*="search"], [class*="filter"]',
    )
    .count()
  console.log(`Filter elements found: ${filterElements}`)

  // Check for task items
  const taskItems = await page
    .locator('tr, [class*="task-item"], [class*="task-card"], li[class*="task"]')
    .count()
  console.log(`Task-like items found: ${taskItems}`)

  if (hasTaskList && taskItems > 0) {
    report(
      'Test 1: Task Pool Page Load',
      'PASS',
      `Found ${taskItems} task items, ${filterElements} filter elements`,
    )
  } else {
    report(
      'Test 1: Task Pool Page Load',
      'FAIL',
      `Task list: ${hasTaskList}, Items: ${taskItems}, Filters: ${filterElements}`,
    )
  }

  // ===== TEST 2: Filter Controls =====
  console.log('\n=== TEST 2: Filter Controls ===')

  // Find all interactive filter elements
  const selects = await page.locator('select').all()
  console.log(`Select elements: ${selects.length}`)
  for (const sel of selects) {
    const label = await sel.evaluate(el => {
      const prev = el.previousElementSibling
      return prev ? prev.textContent : el.getAttribute('aria-label') || el.className
    })
    console.log(`  Select: ${label}`)
  }

  // Test project filter
  let filterWorked = false
  const projectSelect = page.locator('select').first()
  if ((await projectSelect.count()) > 0) {
    const options = await projectSelect.locator('option').all()
    console.log(`First select has ${options.length} options`)
    if (options.length > 1) {
      await projectSelect.selectOption({ index: 1 })
      await sleep(1500)
      await page.screenshot({ path: '/tmp/qa-filter-project.png' })
      filterWorked = true
    }
  }

  // Test search box
  const searchInput = page.locator(
    'input[type="search"], input[placeholder*="搜尋"], input[placeholder*="search"], input[placeholder*="Search"]',
  )
  if ((await searchInput.count()) > 0) {
    await searchInput.first().fill('測試')
    await sleep(1500)
    await page.screenshot({ path: '/tmp/qa-filter-search.png' })
    await searchInput.first().clear()
    await sleep(500)
    filterWorked = true
  }

  // Look for custom dropdowns (SearchableSelect components)
  const customDropdowns = await page
    .locator('[class*="searchable"], [class*="dropdown"], [class*="select"]')
    .count()
  console.log(`Custom dropdown-like elements: ${customDropdowns}`)

  // Try clicking on any visible filter-like button/dropdown
  const filterBtns = page.locator(
    'button:has-text("篩選"), button:has-text("filter"), [class*="filter"] button',
  )
  if ((await filterBtns.count()) > 0) {
    await filterBtns.first().click()
    await sleep(1000)
    await page.screenshot({ path: '/tmp/qa-filter-dropdown.png' })
  }

  report(
    'Test 2: Filter Controls',
    filterWorked ? 'PASS' : 'PARTIAL',
    `Selects: ${selects.length}, Search: ${await searchInput.count()}, Custom: ${customDropdowns}`,
  )

  // ===== TEST 3: Task Creation Flow =====
  console.log('\n=== TEST 3: Task Creation Flow ===')

  // Find create task button
  const createBtn = page.locator(
    'button:has-text("新增"), button:has-text("建立"), button:has-text("Create"), button:has-text("新增任務"), a:has-text("新增任務")',
  )
  const createBtnCount = await createBtn.count()
  console.log(`Create buttons found: ${createBtnCount}`)

  if (createBtnCount > 0) {
    // List all create buttons
    for (let i = 0; i < createBtnCount; i++) {
      const text = await createBtn.nth(i).textContent()
      console.log(`  Button ${i}: "${text?.trim()}"`)
    }

    await createBtn.first().click()
    await sleep(2000)
    await page.screenshot({ path: '/tmp/qa-create-task-form.png' })

    // Check for form modal
    const modal = page.locator('[class*="modal"], [role="dialog"], [class*="dialog"]')
    const modalVisible = (await modal.count()) > 0
    console.log(`Modal visible: ${modalVisible}`)

    // Check for task type tabs
    const tabs = page.locator(
      '[role="tab"], button:has-text("任務池"), button:has-text("指派"), button:has-text("自建"), [class*="tab"]',
    )
    const tabCount = await tabs.count()
    console.log(`Tab elements found: ${tabCount}`)

    if (tabCount > 0) {
      for (let i = 0; i < Math.min(tabCount, 5); i++) {
        const text = await tabs.nth(i).textContent()
        console.log(`  Tab ${i}: "${text?.trim()}"`)
      }

      // Click each tab
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabs.nth(i).click()
        await sleep(1000)
        await page.screenshot({ path: `/tmp/qa-create-task-tab${i}.png` })
      }
    }

    // Fill form fields
    const titleInput = page.locator(
      'input[name="title"], input[placeholder*="標題"], input[placeholder*="title"], input[placeholder*="名稱"]',
    )
    if ((await titleInput.count()) > 0) {
      await titleInput.first().fill('QA測試任務-自動化')
      await sleep(500)
    } else {
      // Try first text input in the form
      const formInputs = page.locator(
        '[class*="modal"] input[type="text"], [role="dialog"] input[type="text"], form input[type="text"]',
      )
      if ((await formInputs.count()) > 0) {
        await formInputs.first().fill('QA測試任務-自動化')
        await sleep(500)
      }
    }

    // Try selecting project
    const projectField = page.locator('select:near(:text("專案")), [class*="modal"] select')
    if ((await projectField.count()) > 0) {
      const opts = await projectField.first().locator('option').count()
      if (opts > 1) {
        await projectField.first().selectOption({ index: 1 })
        await sleep(500)
      }
    }

    // Try selecting priority
    const priorityField = page.locator('select:near(:text("優先")), select:near(:text("priority"))')
    if ((await priorityField.count()) > 0) {
      const opts = await priorityField.first().locator('option').count()
      if (opts > 1) {
        await priorityField.first().selectOption({ index: 1 })
        await sleep(500)
      }
    }

    await page.screenshot({ path: '/tmp/qa-create-task-filled.png' })

    // Snapshot all form elements
    const formElements = await page
      .locator(
        '[class*="modal"] input, [class*="modal"] select, [class*="modal"] textarea, [role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea',
      )
      .all()
    console.log(`Form elements in modal: ${formElements.length}`)
    for (const el of formElements) {
      const tag = await el.evaluate(e => e.tagName)
      const type = await el.evaluate(e => e.type || '')
      const name = await el.evaluate(
        e => e.name || e.placeholder || e.className?.split(' ')[0] || '',
      )
      console.log(`  ${tag}[${type}] name/placeholder: "${name}"`)
    }

    report(
      'Test 3: Task Creation Flow',
      'PASS',
      `Modal: ${modalVisible}, Tabs: ${tabCount}, Form elements: ${formElements.length}`,
    )

    // ===== TEST 5: SearchableSelect Components =====
    console.log('\n=== TEST 5: SearchableSelect Components ===')

    // Look for SearchableSelect (custom dropdown with search)
    const searchableSelects = page.locator(
      '[class*="searchable-select"], [class*="SearchableSelect"], [data-component="searchable-select"]',
    )
    const ssCount = await searchableSelects.count()
    console.log(`SearchableSelect components: ${ssCount}`)

    // Look for any custom dropdown that might be a SearchableSelect
    const customSelects = page.locator(
      '[class*="modal"] [class*="relative"] button[class*="select"], [class*="modal"] [class*="dropdown"]',
    )
    const csCount = await customSelects.count()
    console.log(`Custom select-like elements in modal: ${csCount}`)

    // Try to find assignee field
    const assigneeLabel = page.locator(':text("負責人"), :text("指派"), :text("Assignee")')
    if ((await assigneeLabel.count()) > 0) {
      console.log('Found assignee label')
      // Click near the assignee label to open dropdown
      const assigneeArea = page.locator(
        '[class*="modal"] >> :text("負責人") >> .. >> button, [class*="modal"] >> :text("負責人") >> .. >> [role="combobox"]',
      )
      if ((await assigneeArea.count()) > 0) {
        await assigneeArea.first().click()
        await sleep(1000)
        await page.screenshot({ path: '/tmp/qa-searchable-select.png' })

        // Try typing in search
        const searchInDropdown = page.locator(
          '[class*="modal"] input[placeholder*="搜尋"], [class*="modal"] input[type="search"]',
        )
        if ((await searchInDropdown.count()) > 0) {
          await searchInDropdown.first().fill('test')
          await sleep(1000)
          await page.screenshot({ path: '/tmp/qa-searchable-select-filtered.png' })
          report(
            'Test 5A: SearchableSelect',
            'PASS',
            'Assignee dropdown with search found and functional',
          )
        } else {
          report(
            'Test 5A: SearchableSelect',
            'PARTIAL',
            'Dropdown opened but no search input found',
          )
        }
      } else {
        report(
          'Test 5A: SearchableSelect',
          'PARTIAL',
          'Assignee label found but dropdown button not located',
        )
      }
    } else {
      report(
        'Test 5A: SearchableSelect',
        'SKIPPED',
        'No assignee field found in current form state',
      )
    }

    // Test MultiSearchSelect for collaborators
    const collabLabel = page.locator(':text("協作"), :text("Collaborator"), :text("協同")')
    if ((await collabLabel.count()) > 0) {
      console.log('Found collaborator label')
      const collabArea = page.locator('[class*="modal"] >> :text("協作") >> .. >> button')
      if ((await collabArea.count()) > 0) {
        await collabArea.first().click()
        await sleep(1000)
        await page.screenshot({ path: '/tmp/qa-multi-select.png' })
        report('Test 5B: MultiSearchSelect', 'PASS', 'Collaborator multi-select found')
      } else {
        report(
          'Test 5B: MultiSearchSelect',
          'PARTIAL',
          'Collaborator label found but button not located',
        )
      }
    } else {
      report('Test 5B: MultiSearchSelect', 'SKIPPED', 'No collaborator field visible')
    }

    // Close modal
    const closeBtn = page.locator(
      '[class*="modal"] button:has-text("取消"), [class*="modal"] button:has-text("關閉"), [class*="modal"] [aria-label="close"], button:has-text("Cancel")',
    )
    if ((await closeBtn.count()) > 0) {
      await closeBtn.first().click()
      await sleep(1000)
    } else {
      await page.keyboard.press('Escape')
      await sleep(1000)
    }
  } else {
    report('Test 3: Task Creation Flow', 'FAIL', 'No create task button found')
    report('Test 5A: SearchableSelect', 'SKIPPED', 'No create form available')
    report('Test 5B: MultiSearchSelect', 'SKIPPED', 'No create form available')
  }

  // ===== TEST 4: Task Detail View =====
  console.log('\n=== TEST 4: Task Detail View ===')

  await page.screenshot({ path: '/tmp/qa-before-detail.png' })

  // Click on a task item
  const taskRow = page.locator('tr:not(:first-child), [class*="task-item"], [class*="task-card"]')
  const taskRowCount = await taskRow.count()
  console.log(`Task rows for detail view: ${taskRowCount}`)

  if (taskRowCount > 0) {
    // Click on the first task (skip header row)
    await taskRow.first().click()
    await sleep(2000)
    await page.screenshot({ path: '/tmp/qa-task-detail.png' })

    // Check for detail panel content
    const detailContent = await page.content()
    const hasTitle = detailContent.includes('標題') || detailContent.includes('title')
    const hasStatus =
      detailContent.includes('狀態') ||
      detailContent.includes('status') ||
      detailContent.includes('Status')
    const hasAssignee =
      detailContent.includes('負責人') ||
      detailContent.includes('assignee') ||
      detailContent.includes('指派')
    const hasProgress =
      detailContent.includes('進度') ||
      detailContent.includes('progress') ||
      detailContent.includes('%')

    console.log(
      `Detail panel — Title: ${hasTitle}, Status: ${hasStatus}, Assignee: ${hasAssignee}, Progress: ${hasProgress}`,
    )

    const detailChecks = [hasTitle, hasStatus, hasAssignee, hasProgress].filter(Boolean).length
    if (detailChecks >= 2) {
      report(
        'Test 4: Task Detail View',
        'PASS',
        `Detail fields found: title=${hasTitle}, status=${hasStatus}, assignee=${hasAssignee}, progress=${hasProgress}`,
      )
    } else {
      report('Test 4: Task Detail View', 'PARTIAL', `Only ${detailChecks}/4 detail fields found`)
    }
  } else {
    // Try clicking on any link or clickable element that looks like a task
    const taskLinks = page.locator('a[href*="task"], [class*="cursor-pointer"]')
    if ((await taskLinks.count()) > 0) {
      await taskLinks.first().click()
      await sleep(2000)
      await page.screenshot({ path: '/tmp/qa-task-detail.png' })
      report('Test 4: Task Detail View', 'PARTIAL', 'Clicked task link, detail captured')
    } else {
      report('Test 4: Task Detail View', 'FAIL', 'No clickable task items found')
    }
  }
} catch (err) {
  console.error('Test error:', err.message)
  await page.screenshot({ path: '/tmp/qa-error.png' })
} finally {
  // Print summary
  console.log('\n\n========== QA TEST SUMMARY ==========')
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}: ${r.details}`)
  }
  console.log('=====================================')

  // List all screenshots
  console.log('\nScreenshots saved:')
  const fs = await import('fs')
  const files = fs.readdirSync('/tmp').filter(f => f.startsWith('qa-') && f.endsWith('.png'))
  for (const f of files) {
    console.log(`  /tmp/${f}`)
  }

  await browser.close()
}
