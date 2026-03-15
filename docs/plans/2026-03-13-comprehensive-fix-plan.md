# ProgressHub 全方位修復計畫

**建立日期:** 2026-03-13
**來源:** 6 Agent 平行審查 + Codex GPT-5.3 交叉驗證
**總計:** 5 P0 + 17 P1 + 30+ P2
**執行策略:** 4 波次（Wave），每波完成後 lint + test + code review 再進入下一波

---

## Wave 1: P0 安全與功能阻斷修復（5 項）

所有 P0 都是功能壞掉或安全漏洞，必須第一優先處理。

### P0-1: canDelete 永遠為 false，任何角色都無法刪除任務
- **檔案:** `packages/frontend/src/services/taskService.ts:199`
- **問題:** `ApiTaskService.toPoolTask()` 寫死 `canDelete: false`；後端 TaskDTO 未提供 canDelete
- **前端依賴:** `TaskDetailPage.vue:331` 用 `task.canDelete` 控制刪除按鈕
- **修法:** 前端改為用 `authStore.user.permissionLevel` 判斷（PM/ADMIN 可刪），移除對 `canDelete` 的依賴
- **驗證:** 以 PM 和 ADMIN 登入，確認刪除按鈕可見且功能正常

### P0-2: GET /api/projects/names 無認證，公開洩露專案名稱
- **檔案:** `backend/src/routes/projects.ts:27-47`
- **問題:** 路由定義在 `router.use(authenticate)`（第 50 行）之前
- **修法:** 將 `/names` 路由移到第 50 行 `router.use(authenticate)` 之後
- **驗證:** 未帶 token 呼叫 `GET /api/projects/names` 應返回 401

### P0-3: PRODUCER 角色前後端權限不一致
- **前端:** `router/index.ts:72` — requiresRole 包含 PRODUCER
- **後端:** `routes/projects.ts:254,315` — POST/PUT 只允許 PM, ADMIN
- **決策:** PRODUCER（製作人）可以管理專案 → 後端 POST/PUT 加入 PRODUCER
  - 修改 `authorize(PM, PRODUCER, ADMIN)`
- **驗證:** PRODUCER 登入 → 建立/編輯專案 → 成功或被正確阻擋（取決於方案選擇）

### P0-4: 甘特圖非空斷言導致 NaN 崩潰風險
- **檔案:** `packages/frontend/src/composables/useGantt.ts:37`
- **問題:** `new Date(t.startDate!)` / `new Date(t.dueDate!)` 非空斷言，缺少防禦
- **修法:** 在 flatMap 前加 `.filter(t => t.startDate && t.dueDate)`
- **驗證:** 建立不含日期的任務，甘特圖不崩潰

### P0-5: 指派任務合約不符（Codex 獨立發現）
- **前端:** `taskService.ts:281` — claimTask 帶 `{ userId }` body
- **後端:** `taskActionRoutes.ts:165` — 忽略 body，用 `req.user.userId`
- **影響:** PM 無法代替他人認領任務
- **修法:** 後端 claimTask 讀取 `req.body.assigneeId`（PM/ADMIN 限定），一般用戶維持 `req.user.userId`
- **驗證:** PM 指定他人 userId 認領 → 任務 assignee 為指定的人

---

## Wave 2: P1 安全與資料正確性修復（12 項）

### P1-1: 任務查詢 limit=100 靜默截斷
- **檔案:** `packages/frontend/src/services/taskService.ts:205`
- **修法:** 改為分頁載入全部，或至少 limit=1000 + 警告超出
- **影響:** Dashboard、追殺清單、甘特圖統計全數依賴此資料

### P1-2: timeStatsService 硬編碼 take: 5000/10000
- **檔案:** `backend/src/services/timeStatsService.ts:95,175,264,460`
- **修法:** 改為 cursor-based pagination 或 stream processing
- **替代:** 短期先加上限 + 分批查詢

### P1-4: projectAuth.ts 核心安全函式零測試
- **檔案:** `backend/src/middleware/projectAuth.ts`
- **目標函式:** requireProjectMember、requireResourceOwner、requireProjectScope
- **修法:** 撰寫 Jest 單元測試，覆蓋正常、越權、ADMIN bypass 場景
- **重要性:** 被 41 個路由使用

### P1-5: GITLAB_ENCRYPTION_KEY 缺失不阻止啟動
- **檔案:** `backend/src/config/env.ts:86`
- **修法:** 啟動時偵測 GitLab 相關 env vars，缺失時 console.warn + 停用 GitLab 功能（而非啟動後 500）

### P1-6: authorizeTaskAccess 遺漏 PRODUCER
- **檔案:** `backend/src/middleware/auth.ts:155`
- **修法:** 在角色檢查中加入 `PermissionLevel.PRODUCER`
- **驗證:** PRODUCER 可更新非自己建立但同專案的任務

### P1-7: TaskDetailPage 多處缺少角色權限檢查
- **檔案:** `packages/frontend/src/pages/TaskDetailPage.vue`
- **3 個子問題:**
  - 第 329 行「指派任務」按鈕 → 加 `v-if="canAssign"`（PM/PRODUCER/ADMIN）
  - 第 322-328 行「退回任務」按鈕 → 加 `task.assigneeId === authStore.user?.id` 檢查
  - 第 49-51 行 `canAddNote` → 加入 ADMIN
- **驗證:** EMPLOYEE 看不到指派按鈕；非 assignee 看不到退回按鈕

### P1-8: 帳號停用後 auth cache 5 分鐘內仍有效
- **檔案:** `backend/src/middleware/auth.ts:17`
- **修法:** 新增 `invalidateAuthCache(userId)` 函式，在停用帳號 API 中呼叫
- **替代:** 將 TTL 降至 30 秒（權衡效能）

### P1-9: tasks store computed cache Map 永不清除
- **檔案:** `packages/frontend/src/stores/tasks.ts:62-94`
- **修法:** 在 `$reset()` 中清空 Map；或改用 WeakRef / LRU 策略
- **短期:** 登出時清空即可

### P1-10: 重複 migration timestamp
- **檔案:** `backend/prisma/migrations/`
- **問題:** `20260306000000_add_oauth_state` 與 `20260306000000_add_project_members` 同時間戳
- **修法:** 重新命名其中一個（如 `20260306000001_add_project_members`）
- **風險:** 需確認已部署環境的 _prisma_migrations 表

### P1-11: MultiSearchSelect 缺少鍵盤 ArrowUp/Down 導航
- **檔案:** `packages/frontend/src/components/common/MultiSearchSelect.vue`
- **修法:** 參照 SearchableSelect 的鍵盤導航實作，加入 ArrowUp/Down + aria-activedescendant
- **驗證:** 純鍵盤操作可選取選項

### P1-12: 員工刪除 UI 入口缺失
- **檔案:** `packages/frontend/src/pages/admin/UserManagementPage.vue`
- **修法:** 在操作欄（第 301-313 行）加入刪除按鈕 + ConfirmDialog
- **後端:** DELETE /api/employees/:id 已存在，前端接上即可

### P1-3: E2E 測試未進入 CI pipeline
- **檔案:** `.github/workflows/ci.yml`
- **修法:** 加入 Playwright 步驟（install browsers → run tests）
- **考量:** 需要 Zeabur 測試環境可用，或改為 mock API 模式
- **排在 Wave 2 末尾:** 不影響功能，但影響品質保障

---

## Wave 3: P1 UX/a11y + P2 安全類修復（9 項）

### P1-13 ~ P1-17: WCAG 無障礙修復（批次處理）

| ID | 問題 | 檔案 | 修法 |
|----|------|------|------|
| P1-13 | 無 skip navigation link | `MainLayout.vue` | 在 `<body>` 後加 skip link → `#main-content` |
| P1-14 | 22+ labels 未關聯 input | 多個 Page/Form | 逐一加 `for` 屬性或用 `<label>` 包裹 |
| P1-15 | Modal 無 focus trap | `Modal.vue` | 加入 focus trap（Tab/Shift+Tab 循環） |
| P1-16 | Login 頁硬編碼深色背景 | `LoginPage.vue` | 改用 CSS variable，確保 AA 對比度 |
| P1-17 | Date input type 動態切換 | `TaskForm.vue` 相關 | 固定為 `type="date"`，不動態切換 |

### P2-S1 ~ P2-S4: 安全類修復

| ID | 問題 | 檔案 | 修法 |
|----|------|------|------|
| P2-S1 | Slack dev 模式跳過簽名 | `backend/src/routes/slack.ts` | 加 `NODE_ENV !== 'production'` 條件 |
| P2-S2 | MANAGER null === null 繞過 | `auth.ts` | null check `if (!user.department)` |
| P2-S3 | timingSafeEqual 長度洩漏 | 相關驗證函式 | 先 hash 到固定長度再比較 |
| P2-S4 | sanitize 不清洗 URL | `sanitize.ts` | 加入 URL 協議白名單（http/https only） |

---

## Wave 4: P2 改善項目（按 ROI 排序，可選執行）

### 高 ROI（改動小、效果大）
- **P2-D4:** 建立任務後 Dashboard 不更新 → 在 createTask 成功後呼叫 dashboardStore.refresh()
- **P2-U5:** 員工更新無 toast → 在 save 成功後加 `useToast().success()`
- **P2-A3:** TaskForm 直接修改 prop → 用 `toRef` + emit 改為不可變模式
- **P2-D2:** 硬編碼 createdAt '2026-01-01' → 從後端 DTO 取真實值

### 中 ROI
- **P2-D1:** 任務池部門篩選 API 模式無效 → 後端 TaskDTO 加入 department 欄位
- **P2-A2:** MainLayout setTimeout 分段載入 → 改為 Promise.all 或 Suspense
- **P2-A4:** GanttPage localStorage 無型別驗證 → 加 Zod schema 驗證
- **P2-U3:** 專案刪除 UI 缺失 → 參照 P1-12 同模式加刪除按鈕
- **P2-U4:** 任務池缺少 CLAIMED/PAUSED/BLOCKED 篩選 → 加入 filter options
- **P2-E1:** Project model 缺索引 → Prisma schema 加 `@@index([status])` `@@index([startDate])`

### 低 ROI（大改動或低頻場景）
- **P2-A1:** `(req as any)` 型別逃逸 → 定義 `AuthenticatedRequest` 型別
- **P2-E2/E3:** taskService/taskNoteService 假分頁 → 改為真分頁
- **P2-U1:** CSS class 與 Button 元件混用 → 統一使用 Button 元件
- **P2-U2:** Toast 硬編碼色彩 → 改用 CSS variables
- **P2-D3:** sourceType 未持久化 → 加入 Prisma schema 或移除 DTO 欄位
- **P2-U6:** Swagger 幾乎空白 → 後續持續補充

### 測試類（與開發並行）
- **P2-T1:** GitLab 整合零測試 → 撰寫核心 service 單元測試
- **P2-T2:** 後端只有 health 整合測試 → 逐步補充 CRUD 路由測試
- **P2-T3:** 前端 Page 無單元測試 → 優先測試含複雜邏輯的 Page

---

## 執行規則

1. **每波完成後:** `pnpm lint` + `pnpm --filter frontend typecheck` + `pnpm --filter backend test` → code review → commit
2. **每次 push 後:** `gh run watch --exit-status` 確認 CI 通過
3. **並行策略:** 同一 Wave 內的前端/後端修復可由不同 subagent 並行
4. **決策點:** P0-3（PRODUCER 權限）需用戶確認方案 A 或 B
5. **部署:** Wave 1+2 完成後部署一次；Wave 3+4 完成後再部署一次

---

## 預估工作量

| Wave | 項目數 | 預估修改檔案 | 複雜度 |
|------|--------|------------|--------|
| Wave 1 | 5 P0 | ~8 檔 | 中（含決策點） |
| Wave 2 | 12 P1 | ~15 檔 | 高（含新測試） |
| Wave 3 | 9 項 | ~12 檔 | 中 |
| Wave 4 | 16+ P2 | ~20 檔 | 低-中（可選） |
