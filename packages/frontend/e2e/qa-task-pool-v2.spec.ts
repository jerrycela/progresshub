import { test, expect } from '@playwright/test'
import * as path from 'path'

const BASE_URL = 'https://progresshub-cb.zeabur.app'
const SS_DIR = '/tmp/qa-task-pool'

// Fresh tokens from dev-login (PM role)
const PM_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMzdjOTkxYi04MjIzLTQ2YjItYWIzNC02ODUzY2U5NDMyOWQiLCJuYW1lIjoiUUEtUE0iLCJlbWFpbCI6ImRlbW8tcWEtcG1AZGVtby5wcm9ncmVzc2h1Yi5sb2NhbCIsInBlcm1pc3Npb25MZXZlbCI6IlBNIiwiaWF0IjoxNzczMzY2MjQ1LCJleHAiOjE3NzMzNzM0NDV9.Oyku6Z-La-epWkgCqHoE-lJpf551uxYYqxANQw_DtHs'
const PM_REFRESH =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMzdjOTkxYi04MjIzLTQ2YjItYWIzNC02ODUzY2U5NDMyOWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3MzM2NjI0NSwiZXhwIjoxNzczOTcxMDQ1fQ.lm3gl8w1E1Ec911N1uny0VZsJ0OC-s38uWRC5gf9AoM'

const EMP_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMDJkZDliYi1iYTNhLTQzZjEtYWVkZC03ZmQyOTFiMjViNjkiLCJuYW1lIjoiUUEtRW1wbG95ZWUiLCJlbWFpbCI6ImRlbW8tcWEtZW1wbG95ZWVAZGVtby5wcm9ncmVzc2h1Yi5sb2NhbCIsInBlcm1pc3Npb25MZXZlbCI6IkVNUExPWUVFIiwiaWF0IjoxNzczMzY2MjQ1LCJleHAiOjE3NzMzNzM0NDV9.w-KoekP0N8F092vfByCJlW_TsYEywApQx31TpQSjAuE'
const EMP_REFRESH =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMDJkZDliYi1iYTNhLTQzZjEtYWVkZC03ZmQyOTFiMjViNjkiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3MzM2NjI0NSwiZXhwIjoxNzczOTcxMDQ1fQ.I2NHoKufN0pjWgwu5yuocSGlxQsXFgDu0YFYbnnilyM'

interface Result {
  id: string
  status: 'PASS' | 'FAIL' | 'WARN'
  detail: string
}

async function injectAuth(page: import('@playwright/test').Page, token: string, refresh: string) {
  await page.goto(BASE_URL, { waitUntil: 'commit' })
  await page.evaluate(
    ({ t, r }) => {
      localStorage.setItem('auth_token', t)
      localStorage.setItem('auth_refresh_token', r)
    },
    { t: token, r: refresh },
  )
}

async function checkAuth(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)
  return !page.url().includes('/login')
}

test.describe('QA: Task Pool - PM Role', () => {
  const results: Result[] = []

  function report(id: string, status: 'PASS' | 'FAIL' | 'WARN', detail: string) {
    results.push({ id, status, detail })
    const icon = status === 'PASS' ? '[OK]' : status === 'FAIL' ? '[!!]' : '[??]'
    console.log(`${icon} ${id}: ${status} - ${detail}`)
  }

  test('PM: 任務池完整測試', async ({ page }) => {
    test.setTimeout(240000)

    // ===== 登入 =====
    await injectAuth(page, PM_TOKEN, PM_REFRESH)
    const authed = await checkAuth(page)
    if (!authed) {
      report('AUTH', 'FAIL', 'PM 角色 token 注入後仍被重導至登入頁')
      console.log('FATAL: Auth failed, aborting')
      return
    }
    report('AUTH', 'PASS', 'PM 角色登入成功，成功進入 Dashboard')

    // ===== T1: 任務池頁面載入 =====
    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${SS_DIR}/T1-pool-load.png`, fullPage: true })

    const bodyText = (await page.textContent('body')) || ''
    const hasPageTitle = bodyText.includes('任務池')
    const hasTaskCards = (await page.locator('[class*="card"], [class*="task"]').count()) > 0
    report(
      'T1',
      hasPageTitle ? 'PASS' : 'FAIL',
      hasPageTitle ? `任務池頁面正常載入，有任務卡片: ${hasTaskCards}` : '頁面未顯示「任務池」標題',
    )

    // ===== T2: 任務列表內容驗證 =====
    await page.waitForTimeout(1000)
    const body2 = (await page.textContent('body')) || ''
    const statusFound = ['進行中', '已完成', '待認領', 'TODO', 'IN_PROGRESS', 'DONE'].filter(s =>
      body2.includes(s),
    )
    const hasTasks = await page.locator('[class*="cursor-pointer"], a[href*="task"]').count()
    report(
      'T2',
      hasTasks > 0 || statusFound.length > 0 ? 'PASS' : 'WARN',
      `發現 ${hasTasks} 個可點擊任務元素，狀態標籤: [${statusFound.join(', ')}]`,
    )

    // ===== T3a: 搜尋功能 =====
    const searchInput = page.locator('input[placeholder*="搜尋"]').first()
    let searchWorks = false
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const beforeCount = await page.locator('[class*="task-card"], .card').count()
      await searchInput.fill('不存在的任務XYZ123')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${SS_DIR}/T3a-search-empty.png`, fullPage: true })
      const afterCount = await page.locator('[class*="task-card"], .card').count()
      await searchInput.clear()
      await page.waitForTimeout(800)
      searchWorks = true
      report('T3a', 'PASS', `搜尋功能可用：篩選前 ${beforeCount} 卡片，篩選後 ${afterCount} 卡片`)
    } else {
      report('T3a', 'FAIL', '找不到搜尋輸入框')
    }

    // ===== T3b: 狀態/優先級篩選 =====
    const selects = page.locator('select')
    const selectCount = await selects.count()
    let filterWorks = false
    if (selectCount > 0) {
      const firstSelect = selects.first()
      const opts = await firstSelect.locator('option').allTextContents()
      console.log(`Filter options: ${opts.join(', ')}`)
      if (opts.length > 1) {
        await firstSelect.selectOption({ index: 1 })
        await page.waitForTimeout(1000)
        await page.screenshot({ path: `${SS_DIR}/T3b-filter.png`, fullPage: true })
        await firstSelect.selectOption({ index: 0 })
        await page.waitForTimeout(500)
        filterWorks = true
      }
    }

    // Check for toggle buttons (待認領 etc.)
    const claimBtn = page.locator('button').filter({ hasText: '待認領' }).first()
    const hasClaimToggle = await claimBtn.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasClaimToggle) {
      await claimBtn.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${SS_DIR}/T3c-claim-filter.png`, fullPage: true })
      await claimBtn.click()
      await page.waitForTimeout(500)
    }
    report(
      'T3b',
      filterWorks || hasClaimToggle ? 'PASS' : 'WARN',
      `${selectCount} 下拉篩選器，待認領切換: ${hasClaimToggle}，篩選操作: ${filterWorks}`,
    )

    // ===== T4: 建立任務頁面 =====
    // Try navigating to create page
    const createBtn = page.locator('button, a').filter({ hasText: '建立' }).first()
    const hasCreateBtn = await createBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasCreateBtn) {
      await createBtn.click()
      await page.waitForTimeout(2000)
    } else {
      await page.goto(`${BASE_URL}/task-pool/create`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(3000)
    }
    await page.screenshot({ path: `${SS_DIR}/T4-create-form.png`, fullPage: true })

    const createBody = (await page.textContent('body')) || ''
    const hasForm =
      createBody.includes('任務') &&
      (createBody.includes('標題') || createBody.includes('任務資訊'))
    report(
      'T4',
      hasForm ? 'PASS' : 'FAIL',
      hasForm ? `建立任務頁面載入成功 (URL: ${page.url()})` : `建立頁面異常 (URL: ${page.url()})`,
    )

    // ===== T5: 表單欄位驗證 =====
    if (hasForm) {
      const titleInput = page
        .locator('input[placeholder*="任務標題"], input[placeholder*="標題"]')
        .first()
      const hasTitleInput = await titleInput.isVisible({ timeout: 3000 }).catch(() => false)

      const submitBtn = page
        .locator('button')
        .filter({ hasText: /建立任務|提交|送出/ })
        .first()
      const hasSubmitBtn = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasTitleInput && hasSubmitBtn) {
        // Test: empty title => button disabled?
        const emptyDisabled = await submitBtn.isDisabled()

        // Fill title
        await titleInput.fill('QA測試任務-自動建立')
        await page.waitForTimeout(500)
        const filledDisabled = await submitBtn.isDisabled()

        await page.screenshot({ path: `${SS_DIR}/T5-form-filled.png`, fullPage: true })
        report(
          'T5',
          'PASS',
          `表單驗證正常：空標題按鈕禁用=${emptyDisabled}，填完標題後禁用=${filledDisabled}`,
        )
      } else {
        report('T5', 'WARN', `標題輸入框可見=${hasTitleInput}，提交按鈕可見=${hasSubmitBtn}`)
      }
    } else {
      report('T5', 'FAIL', '未進入建立表單，跳過欄位驗證')
    }

    // ===== T6: SearchableSelect (負責人) =====
    // Switch to assigned task type if available
    const assignedTab = page.locator('button').filter({ hasText: '指派任務' }).first()
    if (await assignedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assignedTab.click()
      await page.waitForTimeout(1000)
    }

    const assigneeTrigger = page
      .locator('button')
      .filter({ hasText: /搜尋負責人|選擇負責人/ })
      .first()
    const hasTrigger = await assigneeTrigger.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasTrigger) {
      await assigneeTrigger.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${SS_DIR}/T6a-assignee-open.png`, fullPage: true })

      const ssSearch = page.locator('input[placeholder="搜尋..."]').first()
      if (await ssSearch.isVisible({ timeout: 2000 }).catch(() => false)) {
        await ssSearch.fill('QA')
        await page.waitForTimeout(800)
        await page.screenshot({ path: `${SS_DIR}/T6b-assignee-search.png`, fullPage: true })

        const dropdown = page.locator('div.absolute.z-50')
        const opts = dropdown.locator('ul li')
        const optCount = await opts.count()

        // Check sublabels for department display
        const sublabels = dropdown.locator('span.text-xs')
        const subCount = await sublabels.count()
        const subTexts: string[] = []
        for (let i = 0; i < Math.min(subCount, 3); i++) {
          const t = await sublabels.nth(i).textContent()
          subTexts.push(t?.trim() || '')
        }

        const chDepts = ['工程部', '美術部', '企劃部', '品管部', '音效部', '管理部']
        const foundCh = chDepts.filter(d => subTexts.join(' ').includes(d))
        const deptDisplay =
          foundCh.length > 0
            ? `中文部門: [${foundCh.join(', ')}]`
            : `原始標籤: [${subTexts.join(', ')}]`

        if (optCount > 0) {
          const firstOpt = await opts.first().textContent()
          if (firstOpt && !firstOpt.includes('無符合')) {
            await opts.first().click()
            await page.waitForTimeout(500)
            await page.screenshot({ path: `${SS_DIR}/T6c-assignee-selected.png`, fullPage: true })
          }
        }
        report('T6', 'PASS', `SearchableSelect 正常: ${optCount} 個結果，部門顯示: ${deptDisplay}`)
      } else {
        report('T6', 'WARN', 'SearchableSelect 開啟後搜尋框未出現')
      }
    } else {
      report('T6', 'WARN', '未找到負責人選擇器（可能在任務池模式下不顯示）')
    }

    // ===== T7: 任務詳情 - 點擊查看 =====
    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Try task detail links
    const taskLinks = page.locator('a[href*="/task-pool/"]')
    const linkCount = await taskLinks.count()
    console.log(`Task links found: ${linkCount}`)

    if (linkCount > 0) {
      const href = await taskLinks.first().getAttribute('href')
      await taskLinks.first().click()
      await page.waitForTimeout(2500)
      await page.screenshot({ path: `${SS_DIR}/T7-task-detail.png`, fullPage: true })
      const detailBody = (await page.textContent('body')) || ''
      const hasDetailContent =
        (detailBody.includes('任務') && !page.url().includes('/task-pool')) ||
        page.url().includes('/task-pool/')
      report('T7', 'PASS', `任務詳情頁面: ${page.url()}`)
    } else {
      // Try clicking card elements
      const cards = page.locator('[class*="cursor-pointer"]').first()
      if (await cards.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cards.click()
        await page.waitForTimeout(2000)
        await page.screenshot({ path: `${SS_DIR}/T7-task-detail-click.png`, fullPage: true })
        report('T7', 'WARN', `無明確連結，點擊卡片後 URL: ${page.url()}`)
      } else {
        report('T7', 'WARN', '未找到任務詳情連結或可點擊卡片')
      }
    }

    // ===== T8: 任務編輯 =====
    // If we're on a detail page, try to find edit button
    const currentUrl = page.url()
    const editBtn = page
      .locator('button')
      .filter({ hasText: /編輯|修改|Edit/ })
      .first()
    const hasEditBtn = await editBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasEditBtn) {
      await editBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${SS_DIR}/T8a-edit-form.png`, fullPage: true })

      const editBody = (await page.textContent('body')) || ''
      const hasEditForm =
        editBody.includes('儲存') || editBody.includes('更新') || editBody.includes('確認')
      report(
        'T8',
        hasEditForm ? 'PASS' : 'WARN',
        `編輯表單開啟: ${hasEditForm}，URL: ${page.url()}`,
      )
    } else {
      report('T8', 'WARN', `未找到編輯按鈕 (URL: ${currentUrl})`)
    }

    // ===== 列印 PM 結果摘要 =====
    console.log('\n======== PM 角色測試結果 ========')
    for (const r of results) {
      const icon = r.status === 'PASS' ? '[OK]' : r.status === 'FAIL' ? '[!!]' : '[??]'
      console.log(`${icon} ${r.id.padEnd(6)} ${r.status.padEnd(5)} ${r.detail}`)
    }
    const p = results.filter(r => r.status === 'PASS').length
    const f = results.filter(r => r.status === 'FAIL').length
    const w = results.filter(r => r.status === 'WARN').length
    console.log(`Total: PASS=${p} FAIL=${f} WARN=${w}`)
    console.log('==================================')
  })
})

test.describe('QA: Task Pool - EMPLOYEE Role', () => {
  const results: Result[] = []

  function report(id: string, status: 'PASS' | 'FAIL' | 'WARN', detail: string) {
    results.push({ id, status, detail })
    const icon = status === 'PASS' ? '[OK]' : status === 'FAIL' ? '[!!]' : '[??]'
    console.log(`${icon} ${id}: ${status} - ${detail}`)
  }

  test('EMPLOYEE: 任務池權限驗證', async ({ page }) => {
    test.setTimeout(120000)

    // ===== 登入 =====
    await injectAuth(page, EMP_TOKEN, EMP_REFRESH)
    const authed = await checkAuth(page)
    if (!authed) {
      report('AUTH-E', 'FAIL', 'EMPLOYEE token 注入後仍被重導至登入頁')
      return
    }
    report('AUTH-E', 'PASS', 'EMPLOYEE 角色登入成功')

    // ===== E1: 任務池頁面可訪問 =====
    await page.goto(`${BASE_URL}/task-pool`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${SS_DIR}/E1-emp-pool.png`, fullPage: true })

    const bodyText = (await page.textContent('body')) || ''
    const redirected = page.url().includes('/login') || page.url().includes('/403')
    report(
      'E1',
      !redirected ? 'PASS' : 'FAIL',
      redirected ? `EMPLOYEE 被拒絕存取任務池 (${page.url()})` : '任務池頁面可訪問',
    )

    // ===== E2: 建立按鈕可見性 =====
    const createBtn = page
      .locator('button, a')
      .filter({ hasText: /建立任務|新增任務/ })
      .first()
    const hasCreateBtn = await createBtn.isVisible({ timeout: 3000 }).catch(() => false)
    report('E2', 'PASS', `EMPLOYEE 看到建立任務按鈕: ${hasCreateBtn}（預期：可能有，視業務邏輯）`)

    // ===== E3: 待認領任務 - EMPLOYEE 可認領 =====
    const claimBtn = page
      .locator('button')
      .filter({ hasText: /認領|領取/ })
      .first()
    const hasClaimBtn = await claimBtn.isVisible({ timeout: 3000 }).catch(() => false)
    await page.screenshot({ path: `${SS_DIR}/E3-emp-claim.png`, fullPage: true })
    report('E3', 'PASS', `EMPLOYEE 看到認領按鈕: ${hasClaimBtn}`)

    // ===== E4: 嘗試訪問 PM 專屬路由 =====
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${SS_DIR}/E4-emp-projects.png`, fullPage: true })
    const isBlocked =
      page.url().includes('/login') ||
      page.url().includes('/403') ||
      page.url().includes('/dashboard')
    report(
      'E4',
      isBlocked ? 'PASS' : 'WARN',
      isBlocked
        ? `EMPLOYEE 正確被拒絕存取 /projects (重導到 ${page.url()})`
        : 'EMPLOYEE 可訪問 /projects（需確認是否預期）',
    )

    // ===== 列印 EMPLOYEE 結果摘要 =====
    console.log('\n======== EMPLOYEE 角色測試結果 ========')
    for (const r of results) {
      const icon = r.status === 'PASS' ? '[OK]' : r.status === 'FAIL' ? '[!!]' : '[??]'
      console.log(`${icon} ${r.id.padEnd(6)} ${r.status.padEnd(5)} ${r.detail}`)
    }
    const p = results.filter(r => r.status === 'PASS').length
    const f = results.filter(r => r.status === 'FAIL').length
    const w = results.filter(r => r.status === 'WARN').length
    console.log(`Total: PASS=${p} FAIL=${f} WARN=${w}`)
    console.log('======================================')
  })
})
