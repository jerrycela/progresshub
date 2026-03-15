# ProgressHub QA 改善計畫 (Final v6)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修補 QA 發現的 13 項問題，重點是安全授權漏洞與體驗改善

**Architecture:** 建立集中化授權中介層（三類 middleware），統一「不可見即 404」策略，分層 rate limiting

**Tech Stack:** Express middleware, Prisma, Vue 3, express-validator

**迭代歷程:** 5 輪 Claude Opus 4.6 × Codex GPT-5.3 辯證 + v6 補強

---

## 授權 Middleware 執行順序規範 (強制)

所有受保護路由的 middleware 必須按以下順序掛載：

```
authenticate → authorize(roles) → requireProjectMember / requireResourceOwner / requireProjectScope → handler
```

不得跳過或調換順序。

**路由掛載範例 (強制格式):**
```typescript
// 正確：按順序掛載
router.get('/:id',
  authenticate,                           // 1. 認證
  authorize(PermissionLevel.PM),          // 2. 角色門檻 (可選)
  requireResourceOwner('task', 'id'),     // 3. 資源授權
  taskController.getTask                  // 4. handler
);

// 錯誤：跳過授權或調換順序
router.get('/:id', authenticate, taskController.getTask);  // ❌ 缺授權
router.get('/:id', requireResourceOwner('task', 'id'), authenticate, ...);  // ❌ 順序錯
```

## DB 命名規範對照

| 層級 | 命名風格 | 範例 |
|------|---------|------|
| Prisma schema (code) | camelCase | projectId, userId |
| DB table/column | snake_case | project_id, user_id |
| SQL 查詢 | 使用 Prisma 查詢 (camelCase) | 除非 raw query 才用 snake_case |
| 索引名稱 | snake_case | idx_project_members_lookup |

Prisma `@@map` 已處理映射，實作時使用 Prisma API 不需手動轉換。

**Raw Query 規則:** 當必須使用 `prisma.$queryRaw` 時，欄位名稱用 snake_case（DB 實際名稱），並在註解中標明對應的 Prisma camelCase 欄位名。範例：
```typescript
// Prisma fields: projectId, userId → DB columns: project_id, user_id
const result = await prisma.$queryRaw`
  SELECT r.id, pm.user_id
  FROM tasks r
  LEFT JOIN project_members pm ON r.project_id = pm.project_id AND pm.user_id = ${userId}
  WHERE r.id = ${taskId}
`;
```

---

## 部署拓撲與 Trust Proxy 規格

**Zeabur 網路架構:** Client → Zeabur Edge (reverse proxy, 1 層) → Container (Express)

- `app.set('trust proxy', 1)` — 只信任一層代理，從 `X-Forwarded-For` 取真實 IP
- **啟動時自檢 (不暴露到外部):**
  ```typescript
  // 在 app.listen callback 中
  logger.info('Trust proxy config', {
    trustProxy: app.get('trust proxy'),
    note: 'Expects 1 for Zeabur single-layer reverse proxy'
  });
  ```
- **部署驗證:** 檢查 rate limiter 日誌中的 IP 是否為公網 IP（非 10.x/172.x 內網），若為內網 IP 則 trust proxy 設定錯誤
- **不在 /health 暴露 req.ip** — 避免洩漏網路拓撲細節
- **若 Zeabur 架構變更:** 調整 trust proxy 值，同時更新此文件

---

## 授權失敗回應語意規格 (全計畫基準)

**統一策略：不可見即 404**

對未授權的用戶，無論資源存在與否，一律回 404。防止攻擊者透過 403/404 差異枚舉資源。

| 情境 | 回應 | 說明 |
|------|------|------|
| 未登入 | 401 Unauthorized | authenticate middleware |
| 已登入 + 角色不足 (route-level) | 403 Forbidden | authorize middleware (角色門檻) |
| 已登入 + 非專案成員 | 404 Not Found | requireProjectMember / requireResourceOwner |
| 已登入 + 資源不存在 | 404 Not Found | 同上，不區分「不存在」與「無權」 |
| 已登入 + ADMIN | 200 (或真實 404) | ADMIN 可見所有，只有真正不存在才 404 |

**Middleware 回應規則**:
- `authenticate` → 401
- `authorize(roles)` → 403（角色不在允許列表）
- `requireProjectMember` → 404（不區分不存在/無權）
- `requireResourceOwner` → 404（不區分不存在/無權）
- `requireProjectScope` → 自動過濾（不回錯誤，只返回有權的資料子集）

---

## 三類授權 Middleware 完整定義

### 1. requireProjectMember(paramName: string)
```
用途: 路由帶 projectId 的端點
行為:
  1. projectId = req.params[paramName]
  2. if ADMIN → next()
  3. SELECT 1 FROM project_members WHERE projectId = ? AND userId = req.user.userId
  4. 查到 → next()
  5. 查不到 → res.status(404).json(sendError(404, 'NOT_FOUND', 'Resource not found'))
```

### 2. requireResourceOwner(resource, idParam)

**資源白名單映射 (防 SQL injection):**
```typescript
const RESOURCE_TABLE_MAP: Record<string, string> = {
  task: 'tasks',
  timeEntry: 'time_entries',
  progress: 'progress_logs',
} as const;
type AuthzResource = keyof typeof RESOURCE_TABLE_MAP;
```
`resource` 參數型別為 `AuthzResource`，編譯時即檢查；執行時再比對白名單，非法值直接 500。**禁止任意字串拼接到 SQL。**

```
用途: 路由帶 resourceId，需反查 projectId 的端點
行為:
  1. resourceId = req.params[idParam]
  2. tableName = RESOURCE_TABLE_MAP[resource] ?? throw 500
  3. if ADMIN → 查資源存在性，存在 next()，不存在 404
  4. 非 ADMIN: Prisma 查詢 (不用 raw SQL，用 Prisma API)
     const record = await prisma[resource].findUnique({
       where: { id: resourceId },
       include: { project: { include: { members: { where: { userId: req.user.userId } } } } }
     })
  5. record 不存在 → 404
  6. record.project.members.length === 0 → 404 (不可見)
  7. record 存在且有 member → req.authorizedResource = record, next()
```
**注意:** 改用 Prisma API 取代 raw query，消除 SQL injection 風險。JOIN 在 Prisma 中透過 `include` + `where` 實現，效能等同單次 DB round-trip。

### 3. requireProjectScope (新增)
```
用途: 列表端點，無固定 projectId (tasks pool, time-entries)
行為:
  1. if ADMIN → next()（不過濾）
  2. 查詢用戶所有 projectId:
     SELECT project_id FROM project_members WHERE user_id = req.user.userId
  3. 存入 req.authorizedProjectIds = [...]
  4. next()
  5. Service 層使用 req.authorizedProjectIds 做 WHERE IN 過濾
  6. 若無任何 projectId → 返回空陣列（不是 404）
```

**效能注意 (WHERE IN 退化防護):**
- 當前專案規模: 用戶平均參與 3-10 個專案，WHERE IN 效能無虞
- 若未來用戶參與專案超過 50 個: 改用 JOIN 子查詢取代 WHERE IN
  ```sql
  -- 退化方案 (備用，當前不實作)
  SELECT t.* FROM tasks t
  INNER JOIN project_members pm ON t.project_id = pm.project_id
  WHERE pm.user_id = ?
  ```
- **觸發條件:** 當 `req.authorizedProjectIds.length > 50` 時記錄 warning log，作為效能劣化早期預警

**強制過濾機制 (防遺漏):**
- Service 層列表方法統一接受 `scopedProjectIds?: string[]` 參數
- 建立 `buildProjectScopeFilter(projectIds)` helper:
  ```typescript
  function buildProjectScopeFilter(projectIds?: string[]) {
    if (!projectIds) return {}; // ADMIN, 不過濾
    return { projectId: { in: projectIds } };
  }
  ```
- 路由審計測試: 驗證所有使用 `requireProjectScope` 的端點，其 service 呼叫都帶 `req.authorizedProjectIds`
- 單元測試: 每個列表 service 方法測試帶 scope 與不帶 scope 兩種情境

---

## Wave 0: 緊急安全修復 (1.5-2 天)

### Task 0-1: Demo login 環境硬隔離

**Files:**
- Modify: `backend/src/routes/auth.ts`

**Step 1:** 在 dev-login route 註冊處加入環境檢查
```typescript
if (env.NODE_ENV === 'production') {
  // Skip dev-login route registration entirely
} else {
  router.post('/dev-login', ...);
}
```

**驗收 (CI):** `NODE_ENV=production` 下 POST /api/auth/dev-login → 404

---

### Task 0-2: 全面 IDOR 授權修補

**Files:**
- Create: `backend/src/middleware/projectAuth.ts`
- Modify: `backend/src/routes/taskCrudRoutes.ts`
- Modify: `backend/src/routes/taskActionRoutes.ts`
- Modify: `backend/src/routes/projects.ts`
- Modify: `backend/src/routes/progress.ts`
- Modify: `backend/src/routes/timeEntries.ts`
- Create: `backend/__tests__/middleware/projectAuth.test.ts`

**受保護端點清單:**
| 端點 | Middleware | 語意 |
|------|-----------|------|
| GET /api/tasks/:id | requireResourceOwner('task', 'id') | 非成員 → 404 |
| GET /api/tasks (pool) | requireProjectScope | 只返回成員專案任務 |
| GET /api/projects/:id/members | requireProjectMember('id') | 非成員 → 404 |
| GET /api/progress/:taskId | requireResourceOwner('task', 'taskId') | 透過 task 關聯 |
| GET /api/time-entries | requireProjectScope | 只返回成員專案紀錄 |
| PUT/PATCH /api/tasks/:id | requireResourceOwner('task', 'id') | 非成員 → 404 |
| DELETE /api/tasks/:id | requireResourceOwner('task', 'id') | 非成員 → 404 |

**驗收 (CI):** 每端點 6 案例授權矩陣：
1. 未登入 → 401
2. ADMIN → 200 (或資源不存在 404)
3. 專案成員 → 200
4. 非成員 EMPLOYEE → 404 (不是 403)
5. 跨專案 ID 猜測 → 404 (不是 403)
6. 真正不存在的 ID → 404

---

### Task 0-3: Rate limiter 修正

**Files:**
- Modify: `backend/src/middleware/rateLimiter.ts`
- Modify: `backend/src/index.ts`

**路由掛載順序** (消除雙重限流):
```typescript
// 1. 敏感端點 IP 限流（auth 前）
app.use('/api/auth/login', ipRateLimiter(10, '15m'))
app.use('/api/auth/dev-login', ipRateLimiter(10, '15m'))

// 2. 所有路由的 authenticate middleware（在各 sub-router 內）
// 3. 一般 API userId 限流（auth 後，在各 sub-router 內）
```

**trust proxy:** `app.set('trust proxy', 1)` — Zeabur 單層反向代理

**驗收:**
- 未認證 login 第 11 次 → 429
- 認證用戶第 121 次 → 429
- 認證用戶不觸發 IP layer

---

### Go/No-Go Gate (Wave 0 → Wave 1)

Wave 0 完成後，必須通過以下條件才能進入 Wave 1：

**功能門檻:**
- [ ] 所有授權矩陣測試全綠 (7 端點 × 6 案例 = 42 tests)
- [ ] Rate limiter 測試全綠
- [ ] dev-login 隔離測試全綠
- [ ] 無新增 P0/P1 regression

**性能門檻 (防退化):**
- [ ] 授權查詢 (requireResourceOwner) p95 < 50ms
- [ ] 列表 API (GET /tasks, GET /time-entries) p95 < 200ms
- [ ] 測試方式: 後端測試中加入 `performance.now()` 斷言，或使用 `supertest` + 計時

---

## Wave 1: 功能修復 + 架構 (1.5-2 天)

### Task 1-1: 實作三類授權 middleware

**Files:**
- Create: `backend/src/middleware/projectAuth.ts` (如 Wave 0 未完成)

**效能控管:**
- requireResourceOwner 用 Prisma JOIN 單次查詢 + `req.authorizedResource` cache
- **索引 (透過 Prisma migration):**
  ```bash
  cd backend && npx prisma migrate dev --name add_project_members_lookup_index
  ```
  Migration SQL:
  ```sql
  -- Up
  CREATE INDEX idx_project_members_lookup ON project_members(project_id, user_id);
  -- Down
  DROP INDEX idx_project_members_lookup;
  ```
  **驗收:** `EXPLAIN ANALYZE` 確認授權查詢使用索引（Seq Scan → Index Scan）
- req.authorizedResource 供 service 層重用，避免重複查詢

**路由審計腳本:** 列出所有路由 vs 白名單，未保護路由標紅

---

### Task 1-2: 登入表單加入 MANAGER

**Files:**
- Modify: `packages/frontend/src/pages/LoginPage.vue`
- Modify: `backend/src/routes/auth.ts` (validator)

**驗收:** E2E 選 MANAGER 登入成功

---

### Task 1-3: 錯誤訊息欄位對齊

**Files:**
- Modify: `backend/src/middleware/rateLimiter.ts`

**修復:** rate limiter 429 回應改用 `sendError(res, 429, ErrorCodes.RATE_LIMITED, '請求過於頻繁，請稍後再試')`

**驗收:** 前端 toast 顯示可讀訊息

---

### Task 1-4: 全域授權拒絕 audit log

**Files:**
- Modify: `backend/src/middleware/errorHandler.ts`

**實作:**
- errorHandler 中 `if (res.statusCode === 403 && !req.authzLogged)` 時記錄
- 授權 middleware 的 403 分支設 `req.authzLogged = true` 並自行記錄
- 去重: 同一 request 只記一條
- 格式: `{ event: 'access_denied', requestId, userId, method, path, ip, timestamp }`
- **404 探測偵測 (防資源枚舉攻擊):**
  - 授權 middleware 的 404 分支記錄到獨立計數器: `{ event: 'authz_not_found', userId, ip, path }`
  - 滑動視窗計數規格:
    - **Key 組成:** 分兩組統計 — `user:{userId}` 和 `ip:{clientIp}`
    - **視窗:** rolling 5 分鐘（以 `firstSeen` 為基準，超過 5 分鐘重置）
    - **閾值:** 同一 key 在視窗內 10+ 次 → 觸發安全事件
    - **抑制:** 同一 key 觸發後 10 分鐘內不重複告警（設 `lastAlerted` 時間戳）
    - **記憶體上限:** Map size cap = 10000 entries，採 LRU 淘汰（超限時刪除最舊 firstSeen 的 entry）
    - **清理:** `setInterval(() => purgeExpired(), 10 * 60 * 1000)` 清理超過 15 分鐘的 entry
  - 安全事件格式: `{ event: 'suspicious_enumeration', key, count, window: '5m', paths: [...unique top 5], timestamp }`
  - **不阻擋請求** (避免誤判)，僅記錄供人工審查

**驗收:**
- 403 → 恰好一條 audit log
- 連續 10+ 次授權類 404 → 一條 suspicious_enumeration 安全事件

---

## Wave 2: 體驗改善 (1-2 天)

### Task 2-1: 輸入長度驗證

**Files:**
- Modify: 前端各表單元件
- Modify: 後端各 route validator

| 欄位 | 前端 maxlength | 後端 isLength max |
|------|---------------|------------------|
| 專案名稱 | 100 | 100 |
| 員工姓名 | 50 | 50 |
| 任務/專案描述 | 5000 | 5000 |

- 前端加字數計數器 (XX/100)
- **驗收:** 超限前端即時阻擋 + 後端 400

---

### Task 2-2: 專案頁空狀態

**Files:**
- Modify: `packages/frontend/src/pages/ProjectsPage.vue`
- Create (optional): `packages/frontend/src/components/common/EmptyState.vue`

**驗收:** 無專案 → EmptyState 元件 + 「建立專案」按鈕

---

### Task 2-3: 無障礙批次修復

**Files:**
- Modify: `packages/frontend/src/pages/LoginPage.vue` (label for)
- Modify: `packages/frontend/src/components/common/MultiSearchSelect.vue` (aria-label)
- Modify: `packages/frontend/src/components/gantt/` (milestone aria-label)

**驗收:** axe-core 0 critical/serious violation

---

## Wave 3: 低優先改善 (0.5-1 天)

### Task 3-1: 過去日期橘色警示 (非阻擋)
**Files:** 任務表單元件 (TaskModal 或類似)
**修復:** date picker onChange 時檢查 `date < today`，顯示 `<span class="text-orange-500">此日期已過去</span>`
**驗收:** 選擇昨天 → 橘色警示出現，不阻擋提交

### Task 3-2: Rate limit env var 可配置
**Files:** `backend/src/middleware/rateLimiter.ts`, `backend/src/config/env.ts`
**修復:** 新增環境變數:
- `RATE_LIMIT_AUTH_MAX` (預設 10) — 登入端點 IP 限流
- `RATE_LIMIT_API_MAX` (預設 120) — 一般 API userId 限流
**驗收:** 設定 `RATE_LIMIT_AUTH_MAX=100` 後重啟，第 101 次才觸發 429

### Task 3-3: 登入頁角色選擇器 autofocus
**Files:** `packages/frontend/src/pages/LoginPage.vue`
**修復:** 角色選擇器元素加 `autofocus` 或 `onMounted` 中 `.focus()`
**驗收:** 頁面載入後焦點在角色選擇器

---

## 不做 (YAGNI)
- CSP 細粒度配置
- SAST/DAST pipeline
- Feature flag 框架
- 灰度釋出

## 持續驗證項 (CI 測試，不新增實作)
- [ ] helmet security headers 存在 (X-Content-Type-Options, X-Frame-Options 等)
- [ ] 路由審計: 所有非白名單路由都有授權 middleware
- [ ] 環境變數 startup validation (已有)
- [ ] trust proxy 驗證: rate limiter/audit log 中記錄的 client IP 為公網 IP（非 10.x/172.x 內網）

## 中期技術債路線圖 (本計畫不實作，作為後續追蹤)

| 項目 | 觸發條件 | 預估工作量 |
|------|---------|-----------|
| CSP 細粒度配置 | 引入第三方腳本或 inline script 時 | 0.5 天 |
| SAST/DAST pipeline | 團隊規模 > 3 人或公開上線時 | 2 天 |
| requireProjectScope JOIN 優化 | 用戶平均專案數 > 50 | 0.5 天 |
| 分散式 rate limiter (Redis) | 多 instance 部署時 | 1 天 |
| audit log 持久化 (DB/外部服務) | 需要合規審計或事件回溯時 | 1-2 天 |
| 自動化安全掃描 (npm audit CI) | 納入 CI pipeline 時 | 0.5 天 |

## 總時程: 5-7 天
| Wave | 範圍 | 估計 |
|------|------|------|
| Wave 0 | 安全緊急 | 1.5-2 天 |
| Gate | Go/No-Go 驗收 | 0.5 天 |
| Wave 1 | 功能 + 架構 | 1.5-2 天 |
| Wave 2 | 體驗 | 1-2 天 |
| Wave 3 | 微調 | 0.5-1 天 |
