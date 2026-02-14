# ProgressHub 架構品質提升計畫（最終版）

## Context

經過 10 次迭代的 CTO 級深度審查 + code-simplifier 審查 + 10 次計畫批判性迭代，本計畫已精煉為 **12 個 commit**，目標是讓外部開發者在 GitHub 上看到一個架構嚴謹、程式碼井然有序的專案。

**核心洞察**：外部開發者看 GitHub 的順序是 README → 目錄結構 → 最近 commits → 打開核心檔案。因此「根目錄衛生」和「README 品質」比深層架構重構更影響第一印象。

---

## Commit 1: 根目錄衛生清理 [DONE]

**目標**: 移除與專案核心無關的工具產出檔案

- `.gitignore` 新增：`task_plan.md`, `findings.md`, `progress.md`, `excalidraw.log`
- 刪除追蹤：`analyze-claude-md.sh`, `CLAUDE-MD-優化建議.md`
- `docs/` 整理：保留有價值的報告，移除或歸檔開發過程文件

**檔案**: `.gitignore`, 根目錄清理
**驗證**: `git status` 乾淨，CI 通過

---

## Commit 2: README 增強 [DONE]

**目標**: 讓 GitHub 首頁展示專業度

- 加入 CI status badge
- 補充完整的 Development Setup 步驟（含 Docker、環境變數、Mock/API 切換說明）
- 加入 Contributing 段落
- 整理專案架構說明

**檔案**: `README.md`
**驗證**: GitHub 上渲染正確，badge 顯示 passing

---

## Commit 3: Store 不可變性修復

**目標**: 消除最嚴重的架構壞味道 — 直接 mutation

`stores/tasks.ts` 中 4 個 action 的樂觀更新直接 mutate ref 物件（如 `task.status = 'CLAIMED'`），違反 Vue 3 最佳實踐和 CLAUDE.md 的 immutability 原則。

**修改**:
- `claimTask`（第 150-153 行）: `task.status = 'CLAIMED'` → `tasks.value = tasks.value.map(t => ...)`
- `unclaimTask`（第 211-215 行）: 同理
- `updateTaskProgress`（第 286-296 行）: 同理
- `updateTaskStatus`（第 347-366 行）: 同理
- 回滾邏輯改為 snapshot restore
- 同步更新 `tasks.spec.ts` 中依賴 mutation 行為的測試

**檔案**: `packages/frontend/src/stores/tasks.ts`, `packages/frontend/src/stores/__tests__/tasks.spec.ts`
**驗證**: `pnpm --filter frontend exec vitest run` 全部通過

---

## Commit 4: GanttPage 硬編碼用戶修復

**目標**: 移除明顯的 tech debt

`GanttPage.vue` 第 47-52 行硬編碼了 `{ id: 'emp-7', name: '吳建國', userRole: 'PRODUCER' }`，所有用戶都以 PRODUCER 權限操作里程碑。

**修改**: `const authStore = useAuthStore(); const currentUser = authStore.user`
**檔案**: `packages/frontend/src/pages/GanttPage.vue`
**驗證**: 非 PM/Admin 用戶看不到里程碑管理按鈕

---

## Commit 5: 後端 Service 層錯誤結構化

**目標**: 業務錯誤回傳正確 HTTP 狀態碼，而非全部 500

`taskService.ts` 約 7 處使用 `throw new Error("TASK_NOT_CLAIMABLE")` 裸字串，`errorHandler.ts` 只對 `AppError` 做特殊處理，裸 Error 一律回 500。

**修改**:
- `taskService.ts`: `throw new Error("TASK_NOT_FOUND")` → `throw new AppError(404, "任務不存在", "TASK_NOT_FOUND")`
- 涵蓋 `claimTask`(409), `unclaimTask`(409), `updateTask`(404), `updateStatus`(400/409), `updateTaskProgress`(400) 等
- 確認 `AppError` class 已在 `utils/errors.ts` 或 `middleware/errorHandler.ts` 中定義

**檔案**: `backend/src/services/taskService.ts`, 其他需要修改的 service
**驗證**: `pnpm --filter backend test` 通過；`tsc --noEmit` 通過

---

## Commit 6: createTask 打通後端

**目標**: 讓最核心的 CRUD 操作真正持久化

`stores/tasks.ts` 的 `createTask`（第 409-492 行）完全客戶端實作，使用 `id: 'task-${Date.now()}'` 生成 ID，不呼叫任何 service 方法。

**修改**:
1. 確認 `TaskServiceInterface` 已有 `createTask` 方法（如無則新增）
2. `ApiTaskService` 實作：呼叫 `POST /api/tasks`
3. Store 的 `createTask` 改為 async，呼叫 `service.createTask()`
4. 成功後用伺服器回傳的資料（含真實 UUID）更新 store

**檔案**: `packages/frontend/src/stores/tasks.ts`, `packages/frontend/src/services/taskService.ts`
**驗證**: Mock 模式下建立任務正常；API 模式下打到後端 `POST /api/tasks`

---

## Commit 7: deleteTask 打通後端

**修改**:
1. `TaskServiceInterface` 新增 `deleteTask(id: string)` 方法
2. `ApiTaskService` 實作：呼叫 `DELETE /api/tasks/:id`
3. `MockTaskService` 實作對應邏輯
4. Store 的 `deleteTask` 改為 async + 呼叫 service

**檔案**: `packages/frontend/src/stores/tasks.ts`, `packages/frontend/src/services/taskService.ts`
**驗證**: 刪除任務打到 `DELETE /api/tasks/:id`

---

## Commit 8: updateTask 打通後端

**修改**:
1. `TaskServiceInterface` 新增 `updateTask(id, input)` 方法
2. `ApiTaskService` 實作：呼叫 `PUT /api/tasks/:id`
3. Store 的 `updateTask` 改為 async + 呼叫 service

**注意**: 後端 `PUT /api/tasks/:id` route 接受 `name`（非 `title`）。需確認 route handler 有做欄位轉換（如 `POST` route 已做），或在前端 service 層轉換。

**檔案**: `packages/frontend/src/stores/tasks.ts`, `packages/frontend/src/services/taskService.ts`
**驗證**: 更新任務打到 `PUT /api/tasks/:id`，前後端欄位正確映射

---

## Commit 9: unclaim 狀態條件前後端對齊

前端允許 `CLAIMED + IN_PROGRESS` 取消認領，後端只允許 `CLAIMED`。

**修改**: 後端 `taskService.ts` 的 `unclaimTask` 調整 `where` 條件，也允許 `IN_PROGRESS` 狀態取消認領（與前端對齊）。同時驗證 `shared/types` 的 `TaskStatusTransitions` 與後端狀態機一致。

**檔案**: `backend/src/services/taskService.ts`
**驗證**: `IN_PROGRESS` 任務可以取消認領；後端測試通過

---

## Commit 10: 核心頁面 Loading/Error 狀態

**目標**: 消除粗糙的 UX — 頁面載入無反饋

- `TaskPoolPage`: 加入 loading skeleton
- `DashboardPage`: 加入 loading 狀態
- `GanttPage`: 加入 loading 狀態
- `main.ts` 或 `App.vue`: 加入 `app.config.errorHandler` 全域錯誤邊界

**檔案**: 3 個頁面 + `main.ts`
**驗證**: 斷網/慢網下頁面有正確的 loading/error 反饋

---

## Commit 11: 大檔案拆分

**目標**: 讓核心檔案符合 800 行上限原則

| 檔案 | 行數 | 拆分方案 |
|------|------|---------|
| `backend/src/routes/tasks.ts` | 709 | → `taskCrudRoutes.ts` + `taskActionRoutes.ts` + `taskNoteRoutes.ts`，保持路由掛載順序（`/pool` 在 `/:id` 前） |
| `packages/frontend/src/pages/GanttPage.vue` | 624 | → 抽取 `useGanttData` composable（treeInfoMap + 篩選邏輯），目標 script < 300 行 |

**不拆分** `stores/tasks.ts`（556 行）— 它確實有那麼多操作，強行拆分會導致人為分割和循環依賴。

**檔案**: 上述檔案 + 新建的拆分檔案
**驗證**: `tsc --noEmit` 通過；所有測試通過；路由匹配順序正確

---

## Commit 12: switchUser 環境保護 + TaskDetailPage mock 清理

**修改**:
- `stores/auth.ts` 的 `switchUser` 加上 `if (!import.meta.env.DEV) return` 保護
- `TaskDetailPage.vue` 的 `linkGitLabIssue`（第 182-188 行）移除假 GitLab Issue 物件，按鈕改為 disabled + tooltip 提示「GitLab 整合尚未啟用」
- `claimTask` 失敗分支加入 `showError` 回饋

**檔案**: `packages/frontend/src/stores/auth.ts`, `packages/frontend/src/pages/TaskDetailPage.vue`
**驗證**: 生產環境 `switchUser` 不可用；GitLab 按鈕顯示正確狀態

---

## 風險最高的 3 個項目

| 項目 | 風險 | 緩解策略 |
|------|------|---------|
| **Commit 3: Store 不可變性** | 影響 4 個核心 action 的樂觀更新和回滾，30+ 處修改 | 每修改一個 action 就跑 vitest；使用 snapshot restore 而非逐欄位回滾 |
| **Commit 6-8: CRUD 打通** | 前端 ID 格式 `task-xxx` 與後端 UUID 不同；欄位映射可能遺漏 | 搜尋所有 `task-` 前綴依賴；確認 `taskMapper.ts` 覆蓋所有欄位 |
| **Commit 11: 路由拆分** | Express 路由匹配順序改變導致 `/pool` 被 `/:id` 攔截 | 拆分後在 `index.ts` 中保持原始掛載順序；寫簡單測試驗證端點可達 |

---

## 明確不做的清單

| 項目 | 不做原因 |
|------|---------|
| 按鈕元件統一 | 已有 `Button.vue`，少數例外影響極小 |
| API 攔截器與 useErrorHandler 去重 | 兩者服務不同層級，重構風險大收益低 |
| 前端 Refresh Token 機制 | 功能特性而非品質問題，後端已實作可後續接入 |
| 欄位名稱映射統一 | `taskMapper.ts` 已正確處理，改 schema 需 migration 且 ROI 低 |
| updateTaskStatus 支援 pauseReason | 功能需求而非架構問題，後端已支援 |
| Store CRUD 通用 helper | 過早抽象，每個 store 的 CRUD 只有 15-20 行，獨立更清晰 |
| 樂觀更新通用 helper | 回滾邏輯因 store 而異，通用化會引入大量泛型和 callback |
| Service Factory 統一 | 7 個 service 各有不同 interface，統一反而降低可讀性 |
| 命名不一致統一 | mapper 已解決，不同層的命名慣例可以不同 |
| Prisma Migration (M7) | 運維操作，指令明確（`npx prisma migrate dev --name init`），依需要時執行 |

---

## 驗證方式

每個 commit 後：
1. `pnpm --filter frontend exec vue-tsc --noEmit`
2. `pnpm --filter frontend exec vitest run`
3. `pnpm --filter backend test`（移除 `.env` 模擬 CI）
4. `pnpm --filter frontend build`
5. Git push → CI 4/4 jobs 通過
