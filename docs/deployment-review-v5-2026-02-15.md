# ProgressHub 全端部署審查報告 v5 — 2026-02-15

## 概述

ProgressHub 目前在 Zeabur 上僅部署前端靜態站（Vue + Caddy）。使用者點擊「認領任務」時，`POST /api/tasks/:id/claim` 打到 Caddy 返回 405 Method Not Allowed，因為根本沒有後端。

本報告記錄完整的部署計畫審查過程，包含多輪 Agent 審查、Code-Simplifier 分析、以及 Grep 交叉驗證。

## 部署架構

```
瀏覽器 --HTTPS--> progresshub.zeabur.app (Vue+Caddy)
                       |
                       | HTTPS (跨域 CORS)
                       v
             progresshub-api.zeabur.app (Express)
                       |
                  Private Network
                       v
               PostgreSQL (Zeabur Marketplace)
```

## 審查過程

### 第一輪：Agent Team 深度審查

由 Opus team lead 帶領 3 個 Opus 驗證 agent，進行安全/部署/前端三面向審查。

**識別 7 項部署阻擋因素：**

1. Dockerfile 使用 `npm ci` 但 `package-lock.json` 不存在（專案用 pnpm）
2. `.gitignore` 排除 Prisma migrations 目錄
3. 初始 migration 不存在，DB 無 table
4. `env.ts` 強制要求 Slack 環境變數，缺少即 crash
5. `reminder.ts` 頂層初始化 Slack WebClient
6. Express 未設定 `trust proxy`，rate limiter 失效
7. `dev-login` 僅限開發環境，生產無法登入

### 第二輪：Code-Simplifier 6 區域審查

6 個並行 agent 審查整個 codebase 的簡化機會：

| 區域 | Agent | 發現數 | 可減少行數 |
|------|-------|-------|-----------|
| 後端 Routes | Opus | 12 項 | ~300 行 |
| 後端 Services | Opus | 10 項 | ~127 行 |
| 後端 Middleware/Config | Opus | 6 項 | ~200 行 |
| 前端 Stores | Opus | 10 項 | ~600 行 |
| 前端 Services | Opus | 7 項 | ~80 行 |
| 前端 Components | Haiku | 6 項 | ~200 行 |

**總計可簡化：~1500+ 行**（不在本次部署範圍，記錄為後續迭代）

### 第三輪：交叉驗證（3 組 Explore agent）

| 主題 | 發現 |
|------|------|
| Dockerfile 建置流程 | `npm run build` 已包含 `prisma generate`，Dockerfile 重複 3 次 |
| Auth 端對端流程 | dev-login 接受 `email`，回傳 `{ token, refreshToken, user: UserDTO }` |
| Logger/Health 啟動風險 | Production 模式寫 `logs/` 目錄，不存在會 crash |

### 第四輪：Grep 逐行交叉驗證

**關鍵發現（修正計畫錯誤）：**

1. **`apiClient` import 錯誤** — 計畫原使用 `import { apiClient } from '@/services/api'`，但 api.ts 無此 named export。實際 export 為 `export default api` 和 `export const apiPostUnwrap`。已修正為使用 `apiPostUnwrap`，與 `authService.ts` 一致的模式。

2. **`authLimiter` 作用域錯誤** — 計畫原在 auth.ts 的 dev-login route 中加入 `authLimiter` middleware，但 `authLimiter` 定義在 `index.ts:76`，未 export，auth.ts 無法使用。已修正為在 `index.ts` 加入 `app.use("/api/auth/dev-login", authLimiter)`。

3. **Logger crash 風險** — 新發現的部署阻擋因素。`logger.ts:37-54` 在 production 添加 File transport 寫入 `logs/` 目錄，Docker 容器中不存在此目錄會導致 Winston 拋出 ENOENT crash。已在 Dockerfile 加入 `RUN mkdir -p logs`。

## 最終修改清單（12 項）

| # | 檔案 | 改動 |
|---|------|------|
| 1 | `backend/Dockerfile` | npm install + 移除重複 prisma generate + CMD 簡化 + mkdir -p logs |
| 2 | `.gitignore` | 移除 `**/prisma/migrations/` |
| 3 | `backend/prisma/migrations/*` | 生成初始 migration（15 model + 7 enum） |
| 4 | `backend/src/config/env.ts` | Slack 從 required 改 optional + warning |
| 5 | `backend/src/scheduler/reminder.ts` | WebClient lazy init |
| 6 | `backend/src/index.ts` | trust proxy + authLimiter for dev-login |
| 7 | `backend/src/routes/auth.ts` | ENABLE_DEV_LOGIN 環境變數 + 統一錯誤訊息 + Slack guard |
| 8 | `backend/src/routes/index.ts` | 條件性 Slack 路由掛載 |
| 9 | `backend/src/config/swagger.ts` | apis 路徑依環境切換 |
| 10 | `packages/frontend/src/stores/auth.ts` | demoLogin 加 API 模式（apiPostUnwrap） |
| 11 | `packages/frontend/.env.production` | VITE_API_BASE_URL 更新 |
| 12 | `CLAUDE.md` | 加入 Grep 交叉驗證方法論 |

**總改動量：~61 行程式碼**

## 審查方法論教訓

### v5 核心教訓

前幾輪審查僅在架構層面推理，未用工具實際驗證計畫中的程式碼片段。導致 `apiClient` 這種基本 import 錯誤存活多輪。

### 建立的強制驗證清單

對每段計畫程式碼必須執行：

1. **Import 路徑驗證** — Grep 確認 export 名稱存在
2. **函式簽名驗證** — Grep 確認參數數量和型別
3. **回傳值結構驗證** — 讀取 return 型別，確認解構正確
4. **環境變數名稱驗證** — Grep 確認拼寫一致
5. **檔案路徑驗證** — 確認引用路徑存在
6. **現有模式比對** — 找最相似的既有程式碼，確認模式一致

### 禁止事項

- 禁止假設任何 export 名稱——必須 Grep 確認
- 禁止假設 response 結構——必須讀取型別定義
- 禁止引用未驗證的檔案路徑

## 風險備註

1. ENABLE_DEV_LOGIN 是暫時方案，Slack OAuth 就緒後移除
2. dev-login 已加 authLimiter（10 次/15 分鐘）+ 統一錯誤訊息
3. refreshToken 未儲存（現階段無影響，Slack login 也忽略）
4. UserDTO.role 與 User.role 值目前相同，但型別定義不完全一致
5. DIRECT_URL 必須在 Zeabur 設定（Prisma schema 直接讀取）
6. Vite 環境變數為 build-time 常數，必須在 build 階段注入

## Code-Simplifier 後續優化摘要

| 分類 | 主要發現 | 預估可減少 |
|------|---------|-----------|
| 後端 Routes | 56 處重複 validation 錯誤處理 | ~280 行 |
| 後端 Services | Map 聚合 + 驗證重複 | ~105 行 |
| 後端 Config | Mapper 層可能被 Prisma select 取代 | ~200 行 |
| 前端 Stores | Optimistic update + 錯誤處理重複 | ~500 行 |
| 前端 Services | Factory pattern 重複 9 次 | ~80 行 |
| 前端 Components | 大元件拆分 + 進度滑塊重複 | ~440 行 |
| **總計** | | **~1605 行** |

## 下一步

1. 批准計畫後執行 Phase 0（本地程式碼修改）
2. 本地驗證通過後 Commit & Push
3. Zeabur 部署 PostgreSQL + 後端 Service
4. 設定環境變數 + Seed 資料
5. 前端切換 API base URL → Redeploy
6. 端對端驗證：Demo 登入 → 認領任務 → 不再 405
