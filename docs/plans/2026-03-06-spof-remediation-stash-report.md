# SPOF 單點故障修復 — Stash 內容詳細報告

> **來源**：`git stash@{0}` (main repo: `/Users/admin/progresshub_claude`)
> **標籤**：`pre-membership-merge: mixed local changes`
> **狀態**：未完成的半成品，尚未經過測試和 review
> **背景**：來自 2026-03-05 的 CTO 級技術審查，識別出多個單點故障風險

---

## 一、改動總覽

| # | 檔案 | 改動摘要 | 依賴 |
|---|------|---------|------|
| 1 | `backend/src/config/database.ts` | 資料庫連線重試機制 | 無 |
| 2 | `backend/src/index.ts` | 優雅關機 + 全域錯誤攔截 | #1 |
| 3 | `backend/src/services/authService.ts` | Slack OAuth state 從記憶體遷移至資料庫 | #6 |
| 4 | `backend/src/services/gitlab/oauthService.ts` | GitLab OAuth state 從記憶體遷移至資料庫 | #6 |
| 5 | `backend/src/scheduler/reminder.ts` | PostgreSQL advisory lock 防多節點重複執行 | 無 |
| 6 | `backend/prisma/schema.prisma` | 新增 OAuthState model | 需 migration |
| 7 | `backend/Dockerfile` | 健康檢查改用 `/health/ready` | 無 |
| 8 | `backend/zeabur.json` | Zeabur 健康檢查路徑改為 `/health/ready` | 無 |

---

## 二、各改動詳細說明

### 改動 1：資料庫連線重試（database.ts）

**問題**：伺服器啟動時若資料庫尚未就緒（如 Zeabur 冷啟動），直接連線失敗就崩潰。

**改動內容**：
- 移除原本的 `process.on('beforeExit')` 斷線處理
- 新增 `connectWithRetry(maxRetries = 5)` 函式
- 每次失敗等待遞增時間（attempt * 2000ms），最多重試 5 次
- Export 給 index.ts 使用

```typescript
// 新增
export async function connectWithRetry(maxRetries = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log('[DB] Connected successfully');
      return;
    } catch (err) {
      const delay = attempt * 2000;
      console.error(`[DB] Connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

### 改動 2：優雅關機 + 全域錯誤攔截（index.ts）

**問題**：
- 未捕獲的例外不會記錄就靜默崩潰
- 關機時不會等待正在處理的請求完成
- SIGTERM/SIGINT 處理重複且不完整

**改動內容**：
- 新增 `uncaughtException` 和 `unhandledRejection` 全域處理
- `prisma.$connect()` 改為 `connectWithRetry()`
- 將 `app.listen()` 結果存到 `server` 變數
- 統一關機函式：先 `server.close()` 等待請求完成，再 `prisma.$disconnect()`，10 秒超時強制退出

```typescript
// 新增全域錯誤攔截
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

// 統一關機
const shutdown = async (signal: string) => {
  logger.info(`[SHUTDOWN] Received ${signal}, closing...`);
  server.close(() => {
    prisma.$disconnect().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000); // 10秒強制退出
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

### 改動 3：Slack OAuth State 遷移至資料庫（authService.ts）

**問題**：OAuth state 存在記憶體 Map 中，多節點部署時節點 A 產生的 state 在節點 B 驗證會失敗，伺服器重啟也會遺失所有 state。

**改動內容**：
- 移除 `oauthStates` Map 及相關常數（`OAUTH_STATE_MAX_COUNT`, `STATE_TTL`）
- `generateOAuthState()` 改為 async，使用 `prisma.oAuthState.create()` 存入資料庫
- `verifyOAuthState()` 改為 async，使用 `prisma.oAuthState.delete()` 一次性消費
- 新增 5% 機率清理過期 state（避免定時任務，又防止表膨脹）

**注意**：方法簽名從同步改為 async，所有呼叫端（routes/auth.ts 等）也需要 await。

```typescript
// 之前：同步，記憶體 Map
generateOAuthState(): string { ... }
verifyOAuthState(state: string): boolean { ... }

// 之後：非同步，資料庫
async generateOAuthState(): Promise<string> { ... }
async verifyOAuthState(state: string): Promise<boolean> { ... }
```

---

### 改動 4：GitLab OAuth State 遷移至資料庫（gitlab/oauthService.ts）

**問題**：與改動 3 相同，GitLab OAuth 也用記憶體 Map 存 state。

**改動內容**：
- 移除 `oauthStates` Map、啟動警告 log、`cleanupExpiredStates()` 私有方法
- `generateOAuthUrl()` 改為存資料庫，payload 包含 `{ employeeId, instanceId }`
- `verifyState()` 改為 async，從資料庫 delete + 讀取 payload
- 同樣 5% 機率清理過期 state

**注意**：`verifyState` 回傳型別從同步改為 `Promise<...>`，呼叫端需 await。

```typescript
// 之前
verifyState(state: string): { employeeId: string; instanceId: string } | null

// 之後
async verifyState(state: string): Promise<{ employeeId: string; instanceId: string } | null>
```

---

### 改動 5：Scheduler Advisory Lock（reminder.ts）

**問題**：多節點部署時，每個節點都會執行排程，同一個提醒會發送多次。

**改動內容**：
- 在 `checkUnreportedEmployees()` 開頭加入 `pg_try_advisory_lock(1)` 取得鎖
- 只有取得鎖的節點執行提醒邏輯，其他節點跳過
- 在 finally 區塊用 `pg_advisory_unlock(1)` 釋放鎖

```typescript
// 取得鎖
const lockResult = await prisma.$queryRaw<[{ locked: boolean }]>`SELECT pg_try_advisory_lock(1) as locked`;
if (!lockResult[0].locked) {
  logger.info('[Scheduler] Another instance holds the lock, skipping...');
  return;
}
try {
  // ... 原有邏輯
} finally {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(1)`;
}
```

---

### 改動 6：OAuthState Prisma Model（schema.prisma）

**新增 model**（改動 3、4 的依賴）：

```prisma
model OAuthState {
  id        String   @id @default(cuid())
  state     String   @unique
  provider  String   // "slack" | "gitlab"
  payload   Json     // { codeVerifier, redirectUri, employeeId, instanceId, ... }
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([expiresAt])
  @@map("oauth_states")
}
```

**需要建立 migration**：`20260305000000_add_oauth_state`（stash 中有未追蹤的 migration 目錄，但不確定是否完整）

---

### 改動 7 & 8：健康檢查路徑（Dockerfile + zeabur.json）

**改動**：健康檢查端點從 `/health` 改為 `/health/ready`

- Dockerfile：`wget` 改為 `node fetch`，路徑改為 `/health/ready`
- zeabur.json：`path` 改為 `/health/ready`

**前提**：需要確認 `/health/ready` 端點是否已在 `routes/health.ts` 中實作。若尚未實作，此改動會導致健康檢查永遠失敗。

---

## 三、依賴關係圖

```
改動 6 (OAuthState schema)
  ├── 改動 3 (authService) ← 需 await 化呼叫端
  └── 改動 4 (gitlabOAuthService) ← 需 await 化呼叫端

改動 1 (connectWithRetry)
  └── 改動 2 (index.ts graceful shutdown)

改動 5 (scheduler lock) ← 獨立

改動 7+8 (health check) ← 需確認 /health/ready 端點存在
```

---

## 四、實作建議

### 建議分為 2 個獨立 PR

**PR 1：基礎設施強化**（改動 1, 2, 5, 7, 8）
- 連線重試 + 優雅關機 + scheduler lock + 健康檢查
- 無 schema 變更，風險較低
- 先確認 `/health/ready` 端點存在

**PR 2：OAuth State 持久化**（改動 3, 4, 6）
- 需要 migration + schema 變更
- 需要更新所有呼叫 `generateOAuthState` / `verifyOAuthState` / `verifyState` 的地方（routes/auth.ts, routes/gitlab 等），加上 await
- 建議搭配單元測試

### 注意事項

1. 這些改動是半成品 — 沒有更新呼叫端的 await，也沒有測試
2. OAuthState migration 的 SQL 檔案可能不完整或未包含在 stash 中
3. `/health/ready` 端點可能不存在，需先實作或改回 `/health`
4. `authService.generateOAuthState()` 變成 async 後，routes/auth.ts 的 Slack OAuth 流程需要改為 await

---

## 五、原始計畫文件

完整的 SPOF 修復計畫在：`~/.claude/plans/breezy-zooming-ocean.md`（MCP memory #7574）
