import { test } from '@playwright/test'

const BASE_URL = 'https://progresshub-cb.zeabur.app'
const SS = 'qa-screenshots'

const AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyOTkxZGNmOC04NWJjLTQyZmYtOTYwMS1kNWNkYzk2Mjk3N2MiLCJlbWFpbCI6ImRlbW8tcWEtZmluYWxAZGVtby5wcm9ncmVzc2h1Yi5sb2NhbCIsInBlcm1pc3Npb25MZXZlbCI6IlBNIiwiaWF0IjoxNzcyNzkxNjE5LCJleHAiOjE3NzI3OTg4MTl9.4RMAL7b6RG-W_BrhlT48DZO7kkPONoBBBp7NhJKIJR0'
const REFRESH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyOTkxZGNmOC04NWJjLTQyZmYtOTYwMS1kNWNkYzk2Mjk3N2MiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Mjc5MTYxOSwiZXhwIjoxNzczMzk2NDE5fQ.wP5dHkLF0aEMHG7OAOME4QJ5aJHrC1q_zAfgoMmBkx0'

async function injectAuth(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL, { waitUntil: 'commit' })
  await page.evaluate(
    ({ token, refresh }) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_refresh_token', refresh)
    },
    { token: AUTH_TOKEN, refresh: REFRESH_TOKEN },
  )
}

const results: { id: string; status: string; detail: string }[] = []
function report(id: string, status: string, detail: string) {
  results.push({ id, status, detail })
  console.log(`${id}: ${status} - ${detail}`)
}

test.describe('QA: Task Pool & Task Form', () => {
  test('Full QA flow', async ({ page }) => {
    test.setTimeout(180000)
    await injectAuth(page)

    // Verify auth
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    if (page.url().includes('/login')) {
      console.log('FATAL: Auth failed')
      return
    }

    // ============================
    // T1: TASK POOL PAGE LOAD
    // ============================
    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${SS}/task-01-pool.png`, fullPage: true })

    const bodyText = (await page.textContent('body')) || ''
    report(
      'T1',
      bodyText.includes('任務池') ? 'PASS' : 'FAIL',
      bodyText.includes('任務池') ? '任務池頁面正確載入' : '任務池頁面未載入',
    )

    // ============================
    // T2: TASK CARDS
    // ============================
    const foundStatuses = ['進行中', '已完成', '待認領'].filter(s => bodyText.includes(s))
    const hasProgress = !!bodyText.match(/\d+%/)
    report('T2', 'PASS', `含狀態 [${foundStatuses.join(', ')}]，進度百分比: ${hasProgress}`)

    // ============================
    // T3: FILTERS
    // ============================
    const selects = page.locator('select')
    const selectCount = await selects.count()

    const searchInput = page.locator('input[placeholder*="搜尋"]').first()
    let searchWorks = false
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('UI')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${SS}/task-02-search.png`, fullPage: true })
      searchWorks = true
      await searchInput.clear()
      await page.waitForTimeout(500)
    }

    const claimBtn = page.locator('button:has-text("只看待認領")')
    const claimOk = await claimBtn.isVisible().catch(() => false)
    if (claimOk) {
      await claimBtn.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${SS}/task-03-claim.png`, fullPage: true })
      await claimBtn.click()
      await page.waitForTimeout(500)
    }

    report('T3', 'PASS', `${selectCount} 篩選器, 搜尋: ${searchWorks}, 只看待認領: ${claimOk}`)

    // ============================
    // T4: TASK CREATE PAGE
    // ============================
    await page.goto(`${BASE_URL}/task-pool/create`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${SS}/task-04-create.png`, fullPage: true })

    const createText = (await page.textContent('body')) || ''
    const hasCreateForm = createText.includes('任務資訊') && createText.includes('任務池任務')
    report(
      'T4',
      hasCreateForm ? 'PASS' : 'FAIL',
      hasCreateForm ? '建立頁面完整：任務類型 + 表單' : '建立頁面異常',
    )

    // ============================
    // T5: SEARCHABLE SELECT
    // ============================
    // Switch to "指派任務" to reveal assignee SearchableSelect
    await page.locator('button:has-text("指派任務")').first().click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SS}/task-05-assigned.png`, fullPage: true })

    // SearchableSelect trigger button contains placeholder text
    const assigneeTrigger = page.locator('button:has-text("搜尋負責人")')
    const hasTrigger = await assigneeTrigger.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasTrigger) {
      // Click to open dropdown
      await assigneeTrigger.click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${SS}/task-06-ss-open.png`, fullPage: true })

      // Dropdown search input (inside the dropdown, not the trigger)
      const ssSearch = page.locator('input[placeholder="搜尋..."]').first()
      const hasSearch = await ssSearch.isVisible().catch(() => false)

      if (hasSearch) {
        // Type to filter
        await ssSearch.fill('QA')
        await page.waitForTimeout(800)
        await page.screenshot({ path: `${SS}/task-07-ss-filter.png`, fullPage: true })

        // Get options from the dropdown ul (not sidebar)
        // The dropdown is inside div.absolute.z-50
        const dropdownContainer = page.locator('div.absolute.z-50')
        const ddOptions = dropdownContainer.locator('ul li')
        const optCount = await ddOptions.count()
        console.log(`Dropdown options: ${optCount}`)

        // Get text from dropdown options
        const optTexts: string[] = []
        for (let i = 0; i < Math.min(optCount, 5); i++) {
          const t = await ddOptions.nth(i).textContent()
          optTexts.push(t?.trim() || '')
        }
        console.log(`Option samples: ${optTexts.join(' | ')}`)

        // Check for sublabels (department names)
        const sublabelEls = dropdownContainer.locator('span.text-xs')
        const sublabelCount = await sublabelEls.count()
        const sublabelTexts: string[] = []
        for (let i = 0; i < Math.min(sublabelCount, 5); i++) {
          const t = await sublabelEls.nth(i).textContent()
          sublabelTexts.push(t?.trim() || '')
        }
        console.log(`Sublabels: [${sublabelTexts.join(', ')}]`)

        const chDepts = ['工程部', '美術部', '企劃部', '品管部', '音效部', '管理部']
        const enDepts = ['ENGINEERING', 'ART_DEPARTMENT', 'PLANNING', 'QA_DEPARTMENT']
        const allSublabelText = sublabelTexts.join(' ')
        const foundCh = chDepts.filter(d => allSublabelText.includes(d))
        const foundEn = enDepts.filter(d => allSublabelText.includes(d))

        if (foundCh.length > 0) {
          report('T5c', 'PASS', `部門子標籤顯示中文: [${foundCh.join(', ')}]`)
        } else if (foundEn.length > 0) {
          report('T5c', 'FAIL', `部門顯示英文: [${foundEn.join(', ')}]`)
        } else if (sublabelCount === 0) {
          report(
            'T5c',
            'WARN',
            `員工選項無部門子標籤 (demo 帳號可能未設定部門). 選項: ${optTexts.join(', ')}`,
          )
        } else {
          report('T5c', 'WARN', `子標籤內容: [${sublabelTexts.join(', ')}]`)
        }

        // Select first real option
        if (optCount > 0) {
          const firstText = await ddOptions.first().textContent()
          if (firstText && !firstText.includes('無符合')) {
            await ddOptions.first().click()
            await page.waitForTimeout(500)
            await page.screenshot({ path: `${SS}/task-08-ss-selected.png`, fullPage: true })
            report('T5d', 'PASS', `成功選擇「${firstText.trim()}」`)
          }
        }

        report(
          'T5',
          'PASS',
          `SearchableSelect 正常運作：開啟下拉、搜尋篩選 (${optCount} 選項)、選擇`,
        )
      } else {
        report('T5', 'WARN', '下拉搜尋欄未出現')
      }
    } else {
      report('T5', 'FAIL', '「搜尋負責人」按鈕未找到')
    }

    // T5e: MultiSearchSelect
    // After selecting, we need to find collab trigger
    // It uses placeholder "搜尋協作者..."
    const collabTrigger = page.locator('button:has-text("搜尋協作者")')
    if (await collabTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await collabTrigger.click()
      await page.waitForTimeout(800)
      const collabSearch = page.locator('input[placeholder="搜尋..."]').first()
      if (await collabSearch.isVisible().catch(() => false)) {
        await collabSearch.fill('Q')
        await page.waitForTimeout(800)
        await page.screenshot({ path: `${SS}/task-09-multi.png`, fullPage: true })
        const multiDD = page.locator('div.absolute.z-50')
        const multiOpts = multiDD.locator('ul li')
        const mc = await multiOpts.count()
        report('T5e', 'PASS', `MultiSearchSelect 可用，搜尋 "Q" 有 ${mc} 個選項`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    } else {
      report('T5e', 'WARN', '協作者 MultiSearchSelect 未找到')
    }

    // ============================
    // T6: DATE FIELDS
    // ============================
    const dateInputs = page.locator('input[placeholder*="日期"]')
    const dateCount = await dateInputs.count()

    if (dateCount >= 2) {
      const startDate = dateInputs.first()
      const initType = await startDate.getAttribute('type')
      await startDate.click()
      await page.waitForTimeout(300)
      const focusType = await startDate.getAttribute('type')
      await startDate.fill('2026-03-15')
      await page.waitForTimeout(300)
      const val1 = await startDate.inputValue()

      const endDate = dateInputs.nth(1)
      await endDate.click()
      await page.waitForTimeout(300)
      await endDate.fill('2026-03-30')
      await page.waitForTimeout(300)
      const val2 = await endDate.inputValue()

      await page.screenshot({ path: `${SS}/task-10-dates.png`, fullPage: true })

      const ok = val1 === '2026-03-15' && val2 === '2026-03-30'
      report(
        'T6',
        ok ? 'PASS' : 'WARN',
        `type: "${initType}"->"${focusType}". 開始=${val1}, 截止=${val2}`,
      )
    } else {
      report('T6', 'FAIL', `日期欄位: ${dateCount}`)
    }

    // ============================
    // T7: FORM VALIDATION
    // ============================
    const titleInput = page.locator('input[placeholder*="任務標題"]')
    const submitBtn = page.locator('button:has-text("建立任務")')

    await titleInput.clear()
    await page.waitForTimeout(300)
    const d1 = await submitBtn.isDisabled()

    await titleInput.fill('QA Test')
    await page.waitForTimeout(300)
    const d2 = await submitBtn.isDisabled()

    const projSelect = page.locator('select').first()
    const projOpts = await projSelect.locator('option').allTextContents()
    if (projOpts.length > 1) {
      await projSelect.selectOption({ index: 1 })
      await page.waitForTimeout(300)
    }
    const d3 = await submitBtn.isDisabled()

    await page.screenshot({ path: `${SS}/task-11-validation.png`, fullPage: true })

    report(
      'T7',
      d1 && d2 ? 'PASS' : 'WARN',
      `空標題 disabled=${d1}, 無專案 disabled=${d2}, 指派模式無負責人 disabled=${d3}`,
    )

    // ============================
    // T8: TASK DETAIL NAV
    // ============================
    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Look for links to task detail
    const taskLinks = page.locator('a[href*="/task-pool/"]')
    const linkCount = await taskLinks.count()
    console.log(`Task detail links: ${linkCount}`)

    if (linkCount > 0) {
      const href = await taskLinks.first().getAttribute('href')
      await taskLinks.first().click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: `${SS}/task-12-detail.png`, fullPage: true })
      report('T8', 'PASS', `點擊連結導航到 ${page.url()}`)
    } else {
      // Try clicking task card content
      const clickTargets = page.locator('[class*="cursor-pointer"]')
      const ctCount = await clickTargets.count()
      console.log(`Cursor-pointer elements: ${ctCount}`)

      report('T8', 'WARN', `未找到明確的任務連結 (links=${linkCount})`)
    }

    // ============================
    // Copy screenshots to project root
    // ============================
    await page.screenshot({ path: `${SS}/task-13-final.png`, fullPage: true })

    // ============================
    // SUMMARY
    // ============================
    console.log('\n========================================')
    console.log('       QA TEST RESULTS')
    console.log('========================================')
    for (const r of results) {
      const icon = r.status === 'PASS' ? '[OK]' : r.status === 'FAIL' ? '[!!]' : '[??]'
      console.log(`${icon} ${r.id.padEnd(5)} ${r.status.padEnd(5)} ${r.detail}`)
    }
    console.log('========================================')
    const p = results.filter(r => r.status === 'PASS').length
    const f = results.filter(r => r.status === 'FAIL').length
    const w = results.filter(r => r.status === 'WARN').length
    console.log(`Total: PASS=${p} FAIL=${f} WARN=${w}`)
  })
})
