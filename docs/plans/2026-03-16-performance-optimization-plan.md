# ProgressHub 高負載效能優化計畫 (100+ 用戶)

Generated from Cross-Model Review Rounds 10-13 (2026-03-15~16)
Reviewed by: Claude Opus 4.6 + Codex GPT-5.4 + Gemini 2.5 Pro

## Phase 1: 已完成 (Round 10-11)

### DB 索引 (待部署 — migration 問題待修)
- [ ] GIN index on tasks.function_tags
- [ ] GIN index on tasks.collaborators
- [ ] Composite: tasks(project_id, created_at DESC)
- [ ] Composite: tasks(assigned_to_id, planned_end_date)
- [ ] Partial: tasks(planned_end_date) WHERE status != 'DONE'

### 查詢優化 (已部署)
- [x] getWorkloads: 28 COUNTs → 2 SQL aggregations
- [x] getPoolTasks: taskNotes select → _count

### 前端微優化 (已部署)
- [x] TaskPoolPage taskStats: 3x filter → 1x reduce
- [x] TaskPoolPage search: 300ms debounce
- [x] syncPoolTask: array.map → index assignment

### 基礎設施 (已 commit, 待部署)
- [ ] DB pool: 50→20, timeout: 30→10s
- [ ] Global rate limit: 2000→6000/min/IP
- [ ] Auth rate limit: split login(30) + refresh(200)

## Phase 2: 待實作 (Round 12-13 發現)

### P1 優先 — timeStatsService 重構
**問題:** 在 Node.js 中載入 5K-10K rows 做記憶體內聚合
**方案:** 改用 Prisma groupBy 或 raw SQL GROUP BY
**影響範圍:** getEmployeeStats, getProjectStats, getTeamDashboard
**估計改動:** ~200 行 service 重寫 + 測試更新

### P1 優先 — TimeEntry 複合索引
**新索引:**
- `@@index([employeeId, date])` — 員工工時查詢
- `@@index([projectId, date])` — 專案工時查詢
- `@@index([taskId, date])` — 任務工時查詢
**注意:** 必須用 `@@map` 的 snake_case 名稱，先在 local DB 測試

### P1 優先 — getPoolTasks + getEmployeeTasks 分頁
**問題:** take:500 無分頁，100+ 用戶同時請求 = 大量記憶體
**方案:** 後端加 page/limit 參數，前端改為 server-side filter/sort
**影響範圍:** taskCrudRoutes, taskService, TaskPoolPage, task store
**估計改動:** ~300 行前後端

## Phase 3: 架構改善 (中期)

### getEmployeeById 拆分
- 員工基本資料 API（輕量）
- 員工任務列表 API（分頁）

### taskNotes 分頁
- getNotesByTaskId 加 cursor pagination
- 前端改為無限捲動

### timeStats 快取
- NodeCache TTL 60s
- 按 (userId/projectId, dateRange) 快取
- TimeEntry 寫入時 invalidate

### Dashboard 快取擊穿防護
- 細粒度 invalidation（by userId/projectId）
- 單次飛行請求合併（singleflight pattern）

### Gantt 虛擬捲動
- 引入 vue-virtual-scroller
- 只渲染可視區域的 task rows

## 部署注意事項

1. **Migration SQL 必須用 @@map snake_case 名稱**（Round 12 教訓）
2. **先在 local DB 測試 migration** 再 commit
3. **Zeabur PostgreSQL 限制:** max_connections ~25-50，pool size 不可超過 20
4. **Server timeouts 不要設:** 和 Zeabur proxy 衝突（Round 12 教訓）
