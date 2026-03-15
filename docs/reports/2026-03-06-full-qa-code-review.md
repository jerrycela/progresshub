# ProgressHub 全面 QA 程式碼審查報告

**日期：** 2026-03-06
**審查方法：** 5 個並行 Agent 對 42 個測試項目進行程式碼層級審查
**涵蓋範圍：** 2026-03-05 ~ 03-06 所有推送的功能與修復

---

## 總覽

| 指標 | 數值 |
|------|------|
| 測試項目總數 | 42 |
| PASS | 34 (81%) |
| WARN | 7 (17%) |
| FAIL | 1 (2%) |

---

## FAIL 項目（需立即修復）

### T2.3 不同角色的儀表板差異 — FAIL
- **檔案：** `backend/src/routes/dashboard.ts` 第 18-19 行
- **問題：** 後端 `/api/dashboard/stats` 路由對所有角色都傳 `userId`，導致 PM/ADMIN 也只看到與自己相關的任務統計，無法看到全域總覽
- **預期行為：** EMPLOYEE 看個人統計，PM/ADMIN 看全域統計
- **修復方向：** 路由中加入角色判斷，PM/PRODUCER/ADMIN 不傳 userId，讓 `getStats()` 走全域統計路徑

---

## WARN 項目（按優先級排序）

### P2 — 需要關注

| 項目 | 問題 | 檔案 |
|------|------|------|
| T8.5 深色模式 | `--bg-tooltip` CSS 變數未定義，甘特圖 tooltip 背景可能透明 | `packages/frontend/src/assets/main.css` |

### P3 — 低優先級

| 項目 | 問題 | 檔案 |
|------|------|------|
| T6.2 EMPLOYEE 專案過濾 | 過濾條件為「非 ADMIN 皆過濾」，PM/PRODUCER/MANAGER 也被限制只看成員專案，需確認需求意圖 | `backend/src/services/projectService.ts:52` |
| T5.2 甘特圖篩選器 | 專案篩選仍用普通 Select，未如規格要求使用 SearchableSelect | `packages/frontend/src/components/gantt/GanttFilters.vue` |
| T5.4 任務關聯 Modal | 麵包屑導航缺少 max-width 或 overflow-x 處理，多層跳轉時可能水平溢出 | `packages/frontend/src/components/task/TaskRelationModal.vue` |
| T3.3 任務認領 | Store 的 `claimTask` 在 `tasks` 陣列做本地驗證，若任務僅存在於 `poolTasks` 則可能被擋掉 | `packages/frontend/src/stores/tasks.ts:154` |
| T8.5 深色模式 | GanttMilestoneRow 使用 `border-white` 硬編碼；GanttPage 時間刻度按鈕用 `bg-white`；TaskPoolPage 統計數字用 `text-blue-500`/`text-green-500` | 多檔案 |
| T8.4 日期輸入修復 | 動態 input type 切換在 Safari 的行為需實際驗證 | `packages/frontend/src/components/task/TaskForm.vue` |
| T10.2 CORS 驗證 | 程式碼邏輯正確，但生產環境依賴 `ALLOWED_ORIGINS` 正確設定，屬部署配置風險 | `backend/src/index.ts` |

---

## PASS 項目摘要

### 一、認證與登入（4/4 PASS）
- T1.1 Demo 登入流程：角色選擇 UI、Mock/API 雙模式、登入後跳轉皆正確
- T1.2 Demo 登入專案選擇：前端到後端 projectIds 傳遞鏈路完整
- T1.3 登出：清除 token + user state，即使 API 失敗仍強制清除本地狀態
- T1.4 速率限制：authLimiter 15 分鐘 10 次，覆蓋所有認證端點

### 二、儀表板（2/3 PASS, 1 FAIL）
- T2.1 統計數據載入：四張 StatCard 正確顯示
- T2.2 快速操作：三個按鈕導航路徑正確

### 三、任務池（5/6 PASS, 1 WARN）
- T3.1 任務列表載入：四項必要欄位皆正確
- T3.2 篩選器功能：職能/部門/狀態/專案篩選和排序均正確
- T3.4 建立任務：表單欄位完整，日期支援鍵盤輸入
- T3.5 SearchableSelect：搜尋即時過濾、sublabel 中文部門標籤
- T3.6 MultiSearchSelect：多選正常、已選標籤可移除

### 四、我的任務（3/3 PASS）
- T4.1 任務列表：正確過濾 assigneeId === 當前使用者
- T4.2 任務編輯：載入/編輯/儲存流程完整
- T4.3 任務狀態流轉：後端狀態機驗證完整，含隱式轉換

### 五、甘特圖（2/5 PASS, 3 WARN）
- T5.1 甘特圖載入：時間軸、任務條、菱形里程碑均正確
- T5.5 EMPLOYEE 甘特圖範圍：後端正確過濾非 ADMIN 使用者

### 六、專案管理（5/6 PASS, 1 WARN）
- T6.1 專案列表：卡片渲染、認證保護皆正確
- T6.3 成員管理 Modal：按鈕權限、成員列表含中文部門標籤
- T6.4 新增專案成員：MultiSearchSelect、排除已有成員、skipDuplicates
- T6.5 移除專案成員：樂觀更新、後端複合鍵刪除、DELETE 回應格式相容
- T6.6 MANAGER 部門限制：前端 UI 過濾 + 後端 API 驗證雙重防護

### 七、PM 專區（4/4 PASS）
- T7.1 追殺清單：四類異常任務完整顯示，RWD 換行正確
- T7.2 職能負載：七職能負載數據正確呈現
- T7.3 EMPLOYEE 存取限制：路由 guard 正確攔截，顯示 Toast 提示
- T7.4 側邊欄選單：EMPLOYEE 不顯示 PM 專區

### 八、共用 UI 元件（3/5 PASS, 2 WARN）
- T8.1 Modal 溢出修復：max-h + overflow-y-auto + flex 佈局完整
- T8.2 SearchableSelect：搜尋過濾、選後收起、清除按鈕皆正確
- T8.3 MultiSearchSelect：多選切換、標籤移除、搜尋過濾皆正確

### 九、RWD 響應式（3/3 PASS）
- T9.1 手機視窗：無固定寬度溢出風險
- T9.2 平板視窗：md 斷點排版合理
- T9.3 追殺清單 RWD：響應式 grid 小螢幕正確換行

### 十、API 基礎設施（2/3 PASS, 1 WARN）
- T10.1 API 健康檢查：/health 掛載於 app 層級，含 DB ready check
- T10.3 Rate Limiting：120 req/min per user，正常操作不會觸發

---

## 建議修復優先順序

1. **立即修復** — T2.3 儀表板角色過濾（FAIL，影響 PM/ADMIN 使用體驗）
2. **盡快修復** — T8.5 `--bg-tooltip` CSS 變數缺失（P2，影響甘特圖 tooltip 顯示）
3. **需求確認** — T6.2 專案過濾範圍（目前邏輯可能符合設計意圖）
4. **排期修復** — 其餘 P3 項目（SearchableSelect 規格差異、麵包屑溢出、硬編碼顏色）
