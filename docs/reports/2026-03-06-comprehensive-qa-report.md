# ProgressHub 全面 QA 審查報告

**日期**: 2026-03-06
**範圍**: 近兩天 git 推送的所有新功能與修復（35+ commits）
**方法**: 5 個並行 QA agent（4 個瀏覽器自動化 + 1 個程式碼審查）
**環境**: https://progresshub-cb.zeabur.app + 本地 Mock 模式

---

## 總覽

| 測試區域 | PASS | WARN | FAIL | 測試方式 |
|---------|------|------|------|---------|
| 登入認證 | 14 | 2 | 0 | 瀏覽器 + API |
| 任務池/表單 | 10 | 2 | 0 | 瀏覽器 (Mock) |
| 甘特圖/專案管理 | 8 | 5 | 0 | 瀏覽器 (Prod) |
| Dashboard/我的任務/PM 專區/RWD | 35 | 1 | 0 | 瀏覽器 (Prod) |
| 後端程式碼邏輯 | 18 | -- | -- | 靜態分析 |
| **合計** | **85** | **10** | **0** | |

**P0: 0 個 / P1: 6 個 / P2: 7 個 / P3: 3 個**

---

## 問題清單（按優先級排序）

### P1 — 重要問題（應優先修復）

| # | 問題 | 檔案 | 說明 |
|---|------|------|------|
| P1-1 | getPoolTasks 無角色過濾 | `backend/src/services/taskService.ts:146-155` | 任務池回傳最新 500 筆任務，不檢查使用者角色或專案成員關係。任何已認證使用者都能看到所有專案的所有任務。 |
| P1-2 | MANAGER 可跨部門管理專案成員 | `backend/src/routes/projectMembers.ts:29-44` | `canManageMembers` 只驗證目標員工的部門，沒有驗證專案歸屬，導致 MANAGER 可對不屬於自己部門的專案操作。 |
| P1-3 | Demo login 驗證器漏掉 MANAGER 角色 | `backend/src/routes/auth.ts:150` | `isIn(["EMPLOYEE","PM","PRODUCER","ADMIN"])` 缺少 `"MANAGER"`，嘗試以 MANAGER 登入會回傳 400。 |
| P1-4 | JWT payload 與 JwtPayload 介面不一致 | `backend/src/services/authService.ts:238-248` | `generateToken()` 不含 `name`，但 `JwtPayload` 介面宣告有。目前 `authenticate` 中間件從 DB 補查，但若實作改變會產生 undefined。 |
| P1-5 | SearchableSelect 缺少鍵盤導航 | `packages/frontend/src/components/common/SearchableSelect.vue` | 只處理 Escape 關閉，缺少 ArrowUp/ArrowDown 選項移動、Enter 選取。影響無障礙性。 |
| P1-6 | SearchableSelect/MultiSearchSelect 缺少 ARIA 屬性 | 同上 + `MultiSearchSelect.vue` | 缺少 `role="listbox"`、`role="option"`、`aria-expanded`、`aria-activedescendant`。螢幕閱讀器無法正確識別。 |

### P2 — 改善項目

| # | 問題 | 檔案 | 說明 |
|---|------|------|------|
| P2-1 | GET /projects/:id/members 缺少授權檢查 | `projectMembers.ts:52` | 任何已認證使用者可查看任意專案成員列表，與 POST/DELETE 的權限模型不一致。 |
| P2-2 | DELETE /projects/:id/members/:employeeId 缺少 404 處理 | `projectMembers.ts:159` | 刪除不存在的記錄時 Prisma 拋 P2025 錯誤，被統一回傳 500 而非 404。 |
| P2-3 | getTasksByEmployee 無專案成員限制 | `taskService.ts:179-199` | 查詢條件只看 assignedToId，不驗證呼叫者是否有權查看該員工任務。 |
| P2-4 | removeProjectMember 樂觀刪除不回滾 | `packages/frontend/src/stores/projects.ts:55` | 失敗時只回傳 false，不恢復被刪除的本地成員資料。 |
| P2-5 | MultiSearchSelect Escape 監聽掛在 document 層級 | `MultiSearchSelect.vue:97` | 即使下拉未開啟也會執行全域鍵盤事件處理。 |
| P2-6 | MultiSearchSelect 觸發器非 button | `MultiSearchSelect.vue:113` | 使用 `<div>` 缺少 tabindex 和 role，鍵盤使用者無法 focus。 |
| P2-7 | Demo login 可在非開發環境建立任意角色帳號 | `authService.ts` | 在 `ENABLE_DEV_LOGIN=true` 的 staging 環境，任何人可建立 ADMIN 帳號。 |

### P3 — 低優先級 / 體驗改善

| # | 問題 | 檔案 | 說明 |
|---|------|------|------|
| P3-1 | ADMIN 角色下專案選擇未隱藏 | `LoginPage.vue:231` | 專案選擇區塊顯示條件只看 `projectOptions.length > 0`，未排除 ADMIN 角色。 |
| P3-2 | 後端 ADMIN 登入不忽略 projectIds | `authService.ts:207` | ADMIN 傳入 projectIds 仍會建立 ProjectMember 記錄，理論上 ADMIN 不需受專案限制。 |
| P3-3 | Demo PM 帳號無預設專案資料 | 系統行為 | Demo 登入後 PM 看不到任何專案（member-scoping），甘特圖也無任務。建議 Demo 登入時自動分配專案。 |

---

## 功能驗證結果（全部通過）

以下功能在測試中確認正常運作：

- **Demo 登入流程**：姓名輸入、角色選擇、按鈕狀態、登入跳轉
- **登出功能**：狀態清除、路由保護、token 撤銷
- **Open Redirect 防護**：路徑檢查正確
- **SearchableSelect 搜尋篩選**：大小寫不敏感、部分匹配、中文部門子標籤
- **甘特圖篩選器**：專案/職能/狀態下拉 + 員工可搜尋下拉
- **里程碑管理**：顯示、新增表單、Modal 正確開關
- **Modal 溢出修復**：max-height + overflow-y-auto 全域生效
- **Dashboard 統計卡片**：4 張卡片完整、快速操作按鈕導航正確
- **我的任務頁面**：篩選、空狀態、計數標籤
- **PM 追殺清單**：統計卡片 + 逾期任務列表（8 筆、按天數排序）
- **PM 工作負載**：職能分析 + 人力不足警告 + 配置建議
- **RWD 響應式**：手機 375px、平板 768px 排版正確、無溢出
- **側邊欄導航**：完整選單、角色限制項目正確、當前頁高亮
- **任務認領**：認領成功、狀態更新、計數正確
- **任務建立表單**：驗證正常、提交成功
- **OAuth state 持久化**：DB 記錄、一次性消費、過期清理、加密品質
- **Token refresh rotation**：舊 token 撤銷、新 token 發行

---

## 改善計劃

### Wave 1（立即修復 — P1 安全/權限類）

| 任務 | 預計修改 | 影響範圍 |
|------|---------|---------|
| P1-1: getPoolTasks 加入角色過濾 | taskService.ts 加入 userId/projectMember 過濾 | 後端 |
| P1-2: MANAGER canManageMembers 加入專案歸屬驗證 | projectMembers.ts 增加專案-部門交叉驗證 | 後端 |
| P1-3: Demo login 加入 MANAGER 角色 | auth.ts 第 150 行 isIn 陣列加入 "MANAGER" | 後端（1 行） |
| P1-4: generateToken 加入 name 欄位 | authService.ts generateToken payload 加入 name | 後端（1 行） |

### Wave 2（短期改善 — P1 無障礙 + P2）

| 任務 | 預計修改 | 影響範圍 |
|------|---------|---------|
| P1-5/P1-6: SearchableSelect 鍵盤導航 + ARIA | 加入 ArrowUp/Down/Enter + listbox/option roles | 前端元件 |
| P2-1: GET members 加授權 | projectMembers.ts GET 路由加入成員或管理角色檢查 | 後端 |
| P2-2: DELETE members 404 處理 | 先查詢再刪除，不存在回 404 | 後端 |
| P2-4: removeProjectMember 失敗回滾 | 保留快照，catch 時恢復 | 前端 store |
| P2-6: MultiSearchSelect tabindex + role | div 加 tabindex="0" role="combobox" | 前端元件 |

### Wave 3（長期優化 — P2/P3）

| 任務 | 預計修改 | 影響範圍 |
|------|---------|---------|
| P2-3: getTasksByEmployee 加權限檢查 | taskService.ts 加入呼叫者權限驗證 | 後端 |
| P2-7: Demo login 安全警告強化 | 非 development 環境加 rate limit 或 IP 限制 | 後端 |
| P3-1/P3-2: ADMIN 專案選擇邏輯 | 前端隱藏 + 後端忽略 | 前後端 |
| P3-3: Demo 帳號預設專案 | demoLogin 自動分配活躍專案 | 後端 |
