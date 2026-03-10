# 160 人上線測試阻斷修復計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修復 3 個阻斷問題，讓 ProgressHub 可以支撐 160 人同時操作測試

**Architecture:** 後端調整連線池與限流參數（環境變數驅動），前端修復樂觀更新在 API 失敗時不回滾的邏輯缺陷

**Tech Stack:** Express + Prisma (backend), Vue 3 + Pinia (frontend)

---

## 問題分析

Codex (o4-mini) 和 Claude Opus 4.6 雙方獨立審查，共識 3 個阻斷項：

| # | 問題 | 根因 | 影響 |
|---|------|------|------|
| B-1 | DB 連線池 20 條不夠 | 硬編碼 `connection_limit=20` | 160 人尖峰排隊 → 30 秒後 500 錯誤 |
| B-2 | 同 IP 限流太嚴格 | `globalLimiter=300/min/IP` | 辦公室 160 人共用 IP，8 人同時開頁面就觸發 429 |
| B-3 | 樂觀更新失敗不回滾 | service 回傳 `{success:false}` 但 store 只在 `catch` 回滾 | 畫面卡在錯誤的樂觀狀態 |

---

### Task 1: 連線池與限流參數改為環境變數驅動

**Files:**
- Modify: `backend/src/config/database.ts:7-8`
- Modify: `backend/src/index.ts:84-115`

**Step 1: 修改 database.ts — 連線池大小可配置**

將 `connection_limit=20` 改為從環境變數讀取，預設 50：

```typescript
// backend/src/config/database.ts 第 7-8 行
// 舊：
if (!url.includes("connection_limit")) {
    return `${url}${separator}connection_limit=20&pool_timeout=30`;
}

// 新：
if (!url.includes("connection_limit")) {
    const poolSize = parseInt(process.env.DB_POOL_SIZE || "50") || 50;
    const poolTimeout = parseInt(process.env.DB_POOL_TIMEOUT || "30") || 30;
    return `${url}${separator}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;
}
```

**Step 2: 修改 index.ts — 提高限流預設值**

```typescript
// backend/src/index.ts 第 84-91 行 authLimiter
// max 預設改為 1000（160人 × 6次/15分鐘 = 960）
max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || process.env.AUTH_RATE_LIMIT_MAX || "1000") || 1000,

// backend/src/index.ts 第 106 行 globalLimiter
// max 預設改為 2000（160人 × 8請求/分鐘 = 1280，留 50% buffer）
max: parseInt(process.env.RATE_LIMIT_API_MAX || "2000") || 2000,
```

**Step 3: 執行後端測試**

Run: `cd /Users/admin/progresshub_claude/backend && npx jest --no-coverage`
Expected: 285 tests pass

**Step 4: Commit**

```bash
git add backend/src/config/database.ts backend/src/index.ts
git commit -m "perf: increase connection pool to 50 and rate limits for 160 users"
```

---

### Task 2: 修復樂觀更新在 API 失敗時不回滾的問題

**Files:**
- Modify: `packages/frontend/src/stores/tasks.ts:196-204,262-268,339-345,409-415`
- Modify: `packages/frontend/src/stores/__tests__/tasks.spec.ts`

**問題說明:**

4 個 store action 有相同的 bug 模式：

```typescript
// claimTask (第 197-204 行) — 其他 3 個相同模式
const result = await service.claimTask(taskId, userId)

if (result.success && result.data) {
  // 用伺服器資料更新
  tasks.value = tasks.value.map(...)
}
// ← BUG: 即使 result.success === false，也不會進入 catch
//   樂觀更新的狀態留在 store 中，且回傳 { success: true }
return { success: true, data: tasks.value.find(t => t.id === taskId)! }
```

Service 層的 `apiPatchUnwrap`/`apiPostUnwrap` 在 HTTP 錯誤時 **throw**（會進入 catch），但 service 自己用 try/catch 包了一層，把 throw 轉成 `{ success: false }`。所以 store 的 catch 永遠不會觸發 API 錯誤的回滾。

**Step 1: 修復 4 個 action 的回滾邏輯**

在每個 action 的 `const result = await service.xxx(...)` 之後，加入失敗檢查：

```typescript
// claimTask — 在 service 呼叫後、success 檢查後加入
const result = await service.claimTask(taskId, userId)

if (!result.success) {
  // 回滾：還原快照
  tasks.value = tasksSnapshot
  poolTasks.value = poolSnapshot
  fetchPoolTasks().catch(() => {})
  return result
}

if (result.data) {
  tasks.value = tasks.value.map(t => (t.id === taskId ? { ...t, ...result.data } : t))
  syncPoolTask(taskId, result.data)
}

return { success: true, data: tasks.value.find(t => t.id === taskId)! }
```

需要修改的 4 個位置：
1. `claimTask` (約第 197-204 行)
2. `unclaimTask` (約第 262-268 行)
3. `updateTaskProgress` (約第 339-345 行)
4. `updateTaskStatus` (約第 409-415 行)

**Step 2: 撰寫測試驗證回滾行為**

在 `tasks.spec.ts` 為 claimTask 加一個測試：

```typescript
it('should rollback optimistic update when service returns failure', async () => {
  const store = setupWithMockData()
  const unclaimedTask = store.tasks.find(t => t.status === 'UNCLAIMED')!

  // Mock service to return failure (not throw)
  vi.spyOn(service, 'claimTask').mockResolvedValue({
    success: false,
    error: { code: 'TASK_ALREADY_CLAIMED', message: 'Already claimed' },
  })

  const result = await store.claimTask(unclaimedTask.id, 'emp-1')

  expect(result.success).toBe(false)
  // 驗證狀態已回滾
  const task = store.tasks.find(t => t.id === unclaimedTask.id)
  expect(task?.status).toBe('UNCLAIMED')
})
```

**Step 3: 執行前端測試**

Run: `cd /Users/admin/progresshub_claude && pnpm --filter frontend exec vitest run`
Expected: All tests pass

**Step 4: 執行型別檢查**

Run: `pnpm --filter frontend exec vue-tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/frontend/src/stores/tasks.ts packages/frontend/src/stores/__tests__/tasks.spec.ts
git commit -m "fix: rollback optimistic updates when API returns failure instead of throwing"
```

---

### Task 3: 驗證、推送、部署

**Step 1: 全套測試**

Run: `cd /Users/admin/progresshub_claude/backend && npx jest --no-coverage`
Run: `pnpm --filter frontend exec vitest run`
Run: `pnpm --filter frontend exec vue-tsc --noEmit`

**Step 2: Push 並部署**

```bash
git push
./scripts/deploy-backend.sh
```

**Step 3: 驗證部署健康**

```bash
curl -s https://progress-hub.zeabur.app/health/ready
```

Expected: `{"success":true,"data":{"status":"ready","database":"connected",...}}`

---

## 不在此計畫範圍（上線後處理）

| 項目 | 原因 |
|------|------|
| WebSocket 即時更新 | 架構級變更，需獨立規劃 |
| 任務版本檢查（防覆寫） | 需 DB schema 變更，風險高 |
| 虛擬滾動（Gantt） | 效能優化，不阻斷功能 |
| 工時審批流程 | 新功能，不阻斷測試 |
| dev-login 密碼保護 | 測試環境刻意開放，正式環境用 Slack OAuth |
