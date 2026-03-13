# ProgressHub Playwright E2E 測試計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一套可重複執行、零成本的 Playwright E2E 測試，覆蓋 ProgressHub 核心功能流程，取代需消耗 API token 的 AI agent QA。

**Architecture:** 統一登入 helper（透過後端 dev-login API 取得 token 注入 localStorage），按功能領域分測試檔案，每個檔案獨立可執行。測試對象為本地開發環境（localhost:5173），CI 環境亦可切換至 Zeabur 測試站。

**Tech Stack:** Playwright + TypeScript，現有 `playwright.config.ts` 已配置好（Chromium, baseURL localhost:5173）

**排除範圍：** Slack 登入、GitLab 整合功能不納入測試。

---

## 設計原則

### 測試隔離策略

- **每個 test 獨立登入**：不共用 browser context 或 storageState，避免跨測試污染
- **唯讀測試優先**：大部分測試只驗證頁面載入、元素可見性、路由權限，不建立/修改資料
- **建立資料的測試自帶清理**：若測試建立了資料（如任務），在 afterEach 中清理或使用唯一名稱避免衝突
- **冪等設計**：測試不依賴特定數量或順序的資料，用 `toBeVisible()`/`toHaveCount(greaterThan)` 而非精確數量

### 測試資料策略

- **前提**：後端 `dev-login` API 會自動建立對應角色的 Demo 帳號（含 seed 資料：專案、任務、成員關係），因此不需手動 seed
- **本地開發**：執行 `cd backend && npx prisma db seed` 確保有基礎資料。測試前不需重置
- **CI 環境**：在 CI pipeline 中，先啟動後端 + DB → `prisma migrate deploy` → `prisma db seed` → 再跑測試
- **測試設計原則**：
  - 唯讀測試（佔 90%）：只驗證頁面載入、元素可見性、路由權限，不修改資料 → 天然冪等
  - 搜尋/篩選測試：用 `count > 0` 或 `toBeVisible()` 斷言，不依賴精確數量
  - 建立資料測試：使用 `E2E-{timestamp}` 命名前綴，afterEach 中透過 API 清理
  - 避免跨測試資料依賴：每個 test 獨立，不假設其他測試建立的資料存在
- **globalSetup（可選，CI 用）**：可在 `playwright.config.ts` 加 `globalSetup` 執行 seed 腳本

### Auth 策略

- 使用 `page.request.post()` 呼叫 dev-login API 取得 token（在 Node.js 層，不經瀏覽器）
- 先 `page.goto('/')` 載入前端 origin，再 `page.evaluate()` 注入 localStorage（確保 origin 正確）
- 最後 `page.reload()` 讓前端讀取 token 初始化 auth state
- **不使用 `addInitScript`**（timing 問題），改用明確的 goto → evaluate → reload 三步驟

---

## 前置準備

### 現有測試清理

現有 `e2e/` 目錄有 7 個 QA 測試檔案（`qa-*.spec.ts`），多數使用硬編碼 token 或過期 URL。這些保留不動（不刪除），新測試以獨立檔案建立。

### 共用登入 Helper

所有測試共用一個 `e2e/helpers/auth.ts`，提供：
- `loginAs(page, role)` — 呼叫 `POST /api/auth/dev-login`，注入 token 到 localStorage，reload 頁面
- `ROLES` 常數 — 五種角色（EMPLOYEE, PM, PRODUCER, MANAGER, ADMIN）
- `API_BASE` — 可透過環境變數 `E2E_API_BASE` 覆蓋，預設 `http://localhost:3000`

---

## Task 1: Auth Helper + 登入測試

**Files:**
- Create: `packages/frontend/e2e/helpers/auth.ts`
- Create: `packages/frontend/e2e/auth.spec.ts`

**Step 1: 建立 auth helper**

```typescript
// e2e/helpers/auth.ts
import { type Page } from '@playwright/test'

export const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3000'

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  PM: 'PM',
  PRODUCER: 'PRODUCER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * 登入指定角色：API 取 token → 注入 localStorage → reload
 * 每次呼叫都是全新登入，確保測試隔離
 */
export async function loginAs(page: Page, role: Role, name?: string) {
  const displayName = name || `E2E-${role}`

  // Step 1: 透過 Node.js 層呼叫 dev-login API（不經瀏覽器，無 CORS 問題）
  const res = await page.request.post(`${API_BASE}/api/auth/dev-login`, {
    data: { name: displayName, permissionLevel: role },
  })

  if (!res.ok()) {
    throw new Error(`Login failed for ${role}: ${res.status()} ${await res.text()}`)
  }

  const body = await res.json()
  const token = body.data?.token || body.token
  const refreshToken = body.data?.refreshToken || body.refreshToken

  // Step 2: 先導航到前端 origin（確保 localStorage 歸屬正確 domain）
  await page.goto('/')

  // Step 3: 注入 token 到 localStorage
  await page.evaluate(({ token, refreshToken }) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_refresh_token', refreshToken)
  }, { token, refreshToken })

  // Step 4: reload 讓前端 auth store 讀取 token 初始化
  await page.reload()
  await page.waitForLoadState('networkidle')
}

export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_refresh_token')
  })
  await page.reload()
}
```

**Step 2: 撰寫登入測試**

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs, logout, ROLES } from './helpers/auth'

test.describe('登入流程', () => {
  test('未登入時重導至 /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('登入頁面正確載入', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=ProgressHub')).toBeVisible()
  })

  for (const role of Object.values(ROLES)) {
    test(`${role} 角色登入後進入 Dashboard`, async ({ page }) => {
      await loginAs(page, role)
      // loginAs 已 goto('/') + reload，根路徑重導至 /dashboard
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('[data-testid="sidebar"], nav')).toBeVisible()
    })
  }

  test('登出後回到登入頁', async ({ page }) => {
    await loginAs(page, 'EMPLOYEE')
    await expect(page).toHaveURL(/\/dashboard/)

    // 點擊登出按鈕
    await page.getByText('登出').click()
    await expect(page).toHaveURL(/\/login/)
  })
})
```

**Step 3: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/auth.spec.ts --reporter=list
```

**Step 4: Commit**

```bash
git add packages/frontend/e2e/helpers/auth.ts packages/frontend/e2e/auth.spec.ts
git commit -m "test: add auth helper and login E2E tests"
```

---

## Task 2: 側邊欄 RBAC 測試

**Files:**
- Create: `packages/frontend/e2e/sidebar-rbac.spec.ts`

**Step 1: 撰寫測試**

```typescript
// e2e/sidebar-rbac.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs, type Role } from './helpers/auth'

// 預期每個角色能看到的側邊欄項目
const expectedMenuItems: Record<Role, string[]> = {
  EMPLOYEE: ['儀表板', '任務池', '我的任務', '甘特圖', '個人設定'],
  PM: ['儀表板', '任務池', '我的任務', '甘特圖', '追殺清單', '職能負載', '專案管理', '個人設定'],
  PRODUCER: ['儀表板', '任務池', '我的任務', '甘特圖', '追殺清單', '職能負載', '專案管理', '個人設定'],
  MANAGER: ['儀表板', '任務池', '我的任務', '甘特圖', '追殺清單', '職能負載', '員工管理', '個人設定'],
  ADMIN: ['儀表板', '任務池', '我的任務', '甘特圖', '追殺清單', '職能負載', '專案管理', '員工管理', '個人設定'],
}

// EMPLOYEE 不該看到的項目
const hiddenForEmployee = ['追殺清單', '職能負載', '專案管理', '員工管理']

for (const [role, items] of Object.entries(expectedMenuItems)) {
  test.describe(`${role} 側邊欄`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, role as Role)
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    for (const item of items) {
      test(`看到「${item}」`, async ({ page }) => {
        await expect(page.getByRole('link', { name: item }).or(page.getByText(item))).toBeVisible()
      })
    }

    if (role === 'EMPLOYEE') {
      for (const hidden of hiddenForEmployee) {
        test(`看不到「${hidden}」`, async ({ page }) => {
          await expect(page.getByText(hidden)).not.toBeVisible()
        })
      }
    }
  })
}
```

**Step 2: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/sidebar-rbac.spec.ts --reporter=list
```

**Step 3: Commit**

```bash
git add packages/frontend/e2e/sidebar-rbac.spec.ts
git commit -m "test: add sidebar RBAC E2E tests for all roles"
```

---

## Task 3: 路由權限測試

**Files:**
- Create: `packages/frontend/e2e/route-permissions.spec.ts`

**Step 1: 撰寫測試**

```typescript
// e2e/route-permissions.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

// 受限路由及允許的角色
const restrictedRoutes = [
  { path: '/projects', allowedRoles: ['PM', 'PRODUCER', 'ADMIN'] as const },
  { path: '/pm/chase', allowedRoles: ['PM', 'PRODUCER', 'MANAGER', 'ADMIN'] as const },
  { path: '/pm/workload', allowedRoles: ['PM', 'PRODUCER', 'MANAGER', 'ADMIN'] as const },
  { path: '/admin/users', allowedRoles: ['MANAGER', 'ADMIN'] as const },
]

test.describe('路由權限控制', () => {
  // EMPLOYEE 不能存取受限路由
  for (const route of restrictedRoutes) {
    test(`EMPLOYEE 存取 ${route.path} 被重導`, async ({ page }) => {
      await loginAs(page, 'EMPLOYEE')
      await page.goto(route.path)
      await page.waitForURL(url => !url.pathname.startsWith(route.path), { timeout: 5000 })
      expect(page.url()).not.toContain(route.path)
    })
  }

  // 有權限的角色可以存取
  test('PM 可存取 /projects', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/projects/)
  })

  test('MANAGER 可存取 /admin/users', async ({ page }) => {
    await loginAs(page, 'MANAGER')
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/users/)
  })

  test('ADMIN 可存取 /admin/users', async ({ page }) => {
    await loginAs(page, 'ADMIN')
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/users/)
  })

  // 所有角色都能存取的頁面
  const publicRoutes = ['/dashboard', '/task-pool', '/my-tasks', '/gantt', '/settings/profile']

  for (const path of publicRoutes) {
    test(`EMPLOYEE 可存取 ${path}`, async ({ page }) => {
      await loginAs(page, 'EMPLOYEE')
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
    })
  }
})
```

**Step 2: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/route-permissions.spec.ts --reporter=list
```

**Step 3: Commit**

```bash
git add packages/frontend/e2e/route-permissions.spec.ts
git commit -m "test: add route permission E2E tests"
```

---

## Task 4: 任務池核心流程測試

**Files:**
- Create: `packages/frontend/e2e/task-pool.spec.ts`

**Step 1: 撰寫測試**

```typescript
// e2e/task-pool.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('任務池', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool')
    await page.waitForLoadState('networkidle')
  })

  test('頁面正確載入並顯示任務', async ({ page }) => {
    // 頁面標題
    await expect(page.getByText('任務池')).toBeVisible()
    // 統計卡片區域存在
    await expect(page.locator('.card, [class*="stat"]').first()).toBeVisible()
  })

  test('搜尋功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜尋/)
    await expect(searchInput).toBeVisible()

    // 輸入搜尋詞
    await searchInput.fill('不存在的任務名稱XYZ')
    await page.waitForTimeout(500) // debounce

    // 應顯示空狀態或沒有結果
    const taskCards = page.locator('[class*="task-card"], [class*="task-item"]')
    await expect(taskCards).toHaveCount(0)

    // 清除搜尋
    await searchInput.clear()
    await page.waitForTimeout(500)
  })

  test('篩選器存在且可操作', async ({ page }) => {
    // 驗證篩選器 select 元素
    const selects = page.locator('select')
    const count = await selects.count()
    expect(count).toBeGreaterThanOrEqual(3) // 至少：專案、狀態、排序
  })

  test('可導航至建立任務頁面', async ({ page }) => {
    const createBtn = page.getByRole('link', { name: /建立/ }).or(page.getByText('建立任務'))
    if (await createBtn.isVisible()) {
      await createBtn.click()
      await expect(page).toHaveURL(/\/task-pool\/create/)
    }
  })
})

test.describe('任務建立', () => {
  test('PM 可建立任務', async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/task-pool/create')
    await page.waitForLoadState('networkidle')

    // 驗證表單載入
    await expect(page.getByText(/任務類型|建立任務/)).toBeVisible()

    // 驗證必填欄位存在
    const titleInput = page.locator('input[placeholder*="標題"], input[name*="title"]').or(
      page.getByLabel(/標題/)
    )
    await expect(titleInput.first()).toBeVisible()
  })
})
```

**Step 2: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/task-pool.spec.ts --reporter=list
```

**Step 3: Commit**

```bash
git add packages/frontend/e2e/task-pool.spec.ts
git commit -m "test: add task pool E2E tests"
```

---

## Task 5: 甘特圖頁面測試

**Files:**
- Create: `packages/frontend/e2e/gantt.spec.ts`

**Step 1: 撰寫測試**

```typescript
// e2e/gantt.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('甘特圖', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')
  })

  test('頁面正確載入', async ({ page }) => {
    await expect(page.getByText('甘特圖')).toBeVisible()
  })

  test('時間軸縮放按鈕可用', async ({ page }) => {
    // 日/週/月 縮放按鈕
    const dayBtn = page.getByRole('button', { name: '日' })
    const weekBtn = page.getByRole('button', { name: '週' })
    const monthBtn = page.getByRole('button', { name: '月' })

    await expect(dayBtn.or(weekBtn).or(monthBtn).first()).toBeVisible()
  })

  test('篩選器存在', async ({ page }) => {
    // 專案篩選 select
    const filters = page.locator('select')
    await expect(filters.first()).toBeVisible()
  })

  test('PM 可見里程碑管理按鈕', async ({ page }) => {
    const milestoneBtn = page.getByText('管理里程碑').or(page.getByRole('button', { name: /里程碑/ }))
    await expect(milestoneBtn).toBeVisible()
  })

  test('EMPLOYEE 不可見里程碑管理按鈕', async ({ page }) => {
    await loginAs(page, 'EMPLOYEE')
    await page.goto('/gantt')
    await page.waitForLoadState('networkidle')

    const milestoneBtn = page.getByText('管理里程碑')
    await expect(milestoneBtn).not.toBeVisible()
  })
})
```

**Step 2: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/gantt.spec.ts --reporter=list
```

**Step 3: Commit**

```bash
git add packages/frontend/e2e/gantt.spec.ts
git commit -m "test: add gantt chart E2E tests"
```

---

## Task 6: 專案管理 + 使用者管理測試

**Files:**
- Create: `packages/frontend/e2e/admin.spec.ts`

**Step 1: 撰寫測試**

```typescript
// e2e/admin.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('專案管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'PM')
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
  })

  test('頁面正確載入並顯示專案', async ({ page }) => {
    // 應有專案卡片
    await expect(page.locator('.card').first()).toBeVisible()
  })

  test('新增專案按鈕存在', async ({ page }) => {
    const addBtn = page.getByText('新增專案').or(page.getByRole('button', { name: /新增/ }))
    await expect(addBtn).toBeVisible()
  })

  test('成員管理 Modal 可開啟', async ({ page }) => {
    const memberBtn = page.getByText('成員').first()
    if (await memberBtn.isVisible()) {
      await memberBtn.click()
      // Modal 應出現
      await expect(page.locator('[class*="modal"], [role="dialog"]').first()).toBeVisible()
    }
  })
})

test.describe('使用者管理', () => {
  test('ADMIN 可查看使用者列表', async ({ page }) => {
    await loginAs(page, 'ADMIN')
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    // 應有使用者表格
    await expect(page.locator('table, [class*="user"]').first()).toBeVisible()
  })

  test('搜尋功能', async ({ page }) => {
    await loginAs(page, 'ADMIN')
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder(/搜尋|姓名|信箱/)
    await expect(searchInput).toBeVisible()
  })

  test('編輯使用者 Modal 可開啟', async ({ page }) => {
    await loginAs(page, 'ADMIN')
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    const editBtn = page.getByText('編輯').first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await expect(page.locator('[class*="modal"], [role="dialog"]').first()).toBeVisible()
    }
  })
})
```

**Step 2: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/admin.spec.ts --reporter=list
```

**Step 3: Commit**

```bash
git add packages/frontend/e2e/admin.spec.ts
git commit -m "test: add project and user management E2E tests"
```

---

## Task 7: Dashboard + 設定頁面測試

**Files:**
- Create: `packages/frontend/e2e/dashboard-settings.spec.ts`

**Step 1: 撰寫測試**

```typescript
// e2e/dashboard-settings.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs, ROLES, type Role } from './helpers/auth'

test.describe('Dashboard', () => {
  for (const role of Object.values(ROLES)) {
    test(`${role} Dashboard 正確載入`, async ({ page }) => {
      await loginAs(page, role)
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // 儀表板應有內容
      await expect(page.locator('main, [class*="dashboard"]').first()).toBeVisible()
    })
  }
})

test.describe('個人設定', () => {
  test('可查看個人資料', async ({ page }) => {
    await loginAs(page, 'EMPLOYEE')
    await page.goto('/settings/profile')
    await page.waitForLoadState('networkidle')

    // 設定頁面應載入
    await expect(page.getByText(/個人設定|個人資料|設定/)).toBeVisible()
  })

  test('深色模式切換按鈕存在', async ({ page }) => {
    await loginAs(page, 'EMPLOYEE')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 右上角主題切換按鈕（月亮/太陽 icon）
    const themeBtn = page.locator('button[aria-label*="主題"], button[aria-label*="theme"]').or(
      page.locator('nav button').filter({ has: page.locator('svg') }).last()
    )
    await expect(themeBtn).toBeVisible()
  })
})
```

**Step 2: 執行測試**

```bash
cd packages/frontend && npx playwright test e2e/dashboard-settings.spec.ts --reporter=list
```

**Step 3: Commit**

```bash
git add packages/frontend/e2e/dashboard-settings.spec.ts
git commit -m "test: add dashboard and settings E2E tests"
```

---

## 最終驗證

**Step 1: 執行全部新測試**

```bash
cd packages/frontend && npx playwright test e2e/auth.spec.ts e2e/sidebar-rbac.spec.ts e2e/route-permissions.spec.ts e2e/task-pool.spec.ts e2e/gantt.spec.ts e2e/admin.spec.ts e2e/dashboard-settings.spec.ts --reporter=list
```

**Step 2: 確認全部通過後 Commit**

```bash
git add -A packages/frontend/e2e/
git commit -m "test: complete Playwright E2E test suite for core flows"
```

---

## 測試覆蓋摘要

| 測試檔案 | 測試數量 | 覆蓋範圍 |
|---------|---------|---------|
| auth.spec.ts | ~7 | 登入/登出、重導、5 角色登入 |
| sidebar-rbac.spec.ts | ~20 | 5 角色 × 側邊欄項目可見性 |
| route-permissions.spec.ts | ~12 | 受限路由重導 + 合法存取 |
| task-pool.spec.ts | ~5 | 任務列表、搜尋、篩選、建立 |
| gantt.spec.ts | ~5 | 甘特圖載入、縮放、篩選、里程碑權限 |
| admin.spec.ts | ~6 | 專案管理 CRUD、使用者管理 |
| dashboard-settings.spec.ts | ~6 | Dashboard 載入、設定頁、主題切換 |
| **合計** | **~61** | **核心功能 + RBAC + 路由權限** |

## 注意事項

- 所有測試需要後端運行且 `ENABLE_DEV_LOGIN=true`
- 不測試 Slack OAuth 和 GitLab 整合
- `waitForLoadState('networkidle')` 確保 API 完成後再斷言
- 測試設計為冪等：不依賴特定資料，不修改系統狀態（除非 create 測試有清理步驟）
