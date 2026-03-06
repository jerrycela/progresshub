# QA 發現問題清單 — EMPLOYEE 角色測試

**測試日期：** 2026-03-06
**測試環境：** https://progresshub.zeabur.app
**測試帳號：** QA員工（一般同仁/EMPLOYEE, 程式職能）
**API 環境：** https://progresshubfortest.zeabur.app/api

---

## Issue #1: 甘特圖資料範圍過大（P2）

**問題描述：**
EMPLOYEE 角色登入後，甘特圖頁面可看到**所有員工**的任務（包含 QA員工、Jerry 等），而非僅限自己的任務。此外，所有專案均顯示為「未知專案」。

**重現步驟：**
1. 以 EMPLOYEE 角色帳號登入（QA員工）
2. 從側邊欄進入「甘特圖」頁面
3. 觀察：可看到多位員工的任務列表

**預期行為：**
EMPLOYEE 應只看到自己的任務，或至少只看到自己所屬專案的任務。專案名稱應正確顯示。

**實際行為：**
- 顯示所有員工的任務
- 專案名稱全部顯示為「未知專案」

**相關程式碼位置：**
- 前端甘特圖頁面：`packages/frontend/src/pages/GanttPage.vue`
- 前端甘特圖 Store：`packages/frontend/src/stores/gantt.ts`（或相關 store）
- 後端甘特圖 API：`backend/src/routes/gantt.ts`
- 後端專案過濾邏輯：`backend/src/services/projectService.ts`（已有 EMPLOYEE 過濾邏輯，但甘特圖可能走不同的查詢路徑）

**根因推測：**
甘特圖的任務查詢 API 可能沒有套用 Project Membership 的過濾條件。Part B 的 `projectService.ts` 已加入 EMPLOYEE 過濾邏輯（`where.members = { some: { employeeId } }`），但甘特圖的資料來源可能是直接查 Task 表，未經過專案成員過濾。

**備註：**
Part B（Project Membership）程式碼已完成但**尚未部署**到線上環境。部署後需重新驗證此問題是否自動解決。如果甘特圖走獨立的查詢路徑，則需額外在甘特圖 API 加入成員過濾。

---

## Issue #2: 任務池專案篩選器空白（P3）

**問題描述：**
EMPLOYEE 角色在任務池頁面使用專案篩選器時，下拉選單只有「所有專案」選項，無法按特定專案篩選任務。PM 角色登入時可看到 8 個專案。

**重現步驟：**
1. 以 EMPLOYEE 角色帳號登入（QA員工）
2. 進入「任務池」頁面
3. 點開專案篩選器下拉選單
4. 觀察：只有「所有專案」，無具體專案可選

**預期行為：**
應至少顯示 EMPLOYEE 所屬的專案供篩選。

**實際行為：**
專案篩選器只有「所有專案」一個選項。

**相關程式碼位置：**
- 前端任務池頁面：`packages/frontend/src/pages/TaskPoolPage.vue`
- 前端專案 Store：`packages/frontend/src/stores/projects.ts`
- 後端專案列表 API：`backend/src/routes/projects.ts` → `backend/src/services/projectService.ts`

**根因推測：**
`GET /api/projects` 在 Part B 中已加入 EMPLOYEE 過濾邏輯，但線上版本尚未部署 Part B。目前線上版本可能對 EMPLOYEE 回傳空的專案列表（或回傳全部但前端未正確處理）。需確認：
1. 線上版本的 `/api/projects` 對 EMPLOYEE 回傳什麼
2. Part B 部署後，EMPLOYEE 是否已被加入為相關專案的成員（需執行 seed 腳本 `prisma/seed-project-members.ts`）

---

## Issue #3: 限制路由重導無提示（P3）

**問題描述：**
EMPLOYEE 角色嘗試存取無權限的頁面時（如 `/projects`、`/admin/users`、`/pm/chase`、`/pm/workload`），系統靜默重導至 `/dashboard`，不顯示任何「權限不足」的提示訊息。

**重現步驟：**
1. 以 EMPLOYEE 角色帳號登入
2. 在瀏覽器網址列手動輸入 `/projects` 並前往
3. 觀察：靜默跳轉到 `/dashboard`，無任何提示

**預期行為：**
重導時應顯示 toast 提示「權限不足」或類似訊息，讓使用者知道為什麼被跳轉。

**實際行為：**
靜默重導，使用者不知道發生了什麼。

**相關程式碼位置：**
- 前端路由守衛：`packages/frontend/src/router/index.ts`（或 `router/guards.ts`）
- 前端 Toast 系統：`packages/frontend/src/composables/useToast.ts`

**修復建議：**
在路由守衛的權限檢查邏輯中，當判定使用者無權限並重導時，呼叫 `showError('權限不足，已返回首頁')` 或類似提示。

---

## Issue #4: Dev Login 速率限制過嚴（INFO）

**問題描述：**
`dev-login` 端點的速率限制為 15 分鐘內最多 10 次嘗試，在 QA 測試期間頻繁切換帳號時容易觸發 429 Too Many Requests。

**重現步驟：**
1. 進行 QA 測試，需要用不同角色帳號反覆登入登出
2. 在 15 分鐘內登入超過 10 次
3. 觸發 429 錯誤，無法繼續測試

**相關程式碼位置：**
- 後端速率限制：`backend/src/routes/auth.ts` 或 `backend/src/middleware/rateLimiter.ts`

**修復建議：**
- 測試環境可放寬 dev-login 的速率限制（例如 15 分鐘 100 次）
- 或透過環境變數控制速率限制閾值

---

## 環境備註

- Part B（Project Membership 功能）程式碼已在本地完成，但**尚未部署到線上**
- 部署 Part B 需要：
  1. 執行 Prisma migration（`20260306000000_add_project_members`）
  2. 執行 seed 腳本（`prisma/seed-project-members.ts`）回填現有任務的成員關係
  3. 重新部署後端服務
- Issue #1 和 #2 可能在 Part B 部署後自動解決或部分緩解
- 後端 API 目前有獨立的 404 問題（見 `docs/reports/2026-03-06-backend-404-error-report.md`），需先修復才能驗證
