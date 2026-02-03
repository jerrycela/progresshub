# ProgressHub - Claude 開發指引

## 專案概述

**ProgressHub** 是一套專案進度管理系統，讓團隊成員能夠透過 Slack 或網頁回報工作進度，PM 可即時掌握所有專案執行狀況。

### 技術架構
- **前端**: Vue 3 + Vite + Tailwind CSS + Frappe Gantt
- **後端**: Node.js + Express + TypeScript
- **資料庫**: PostgreSQL 15 + Prisma ORM
- **認證**: Slack OAuth + JWT
- **部署**: Zeabur (預覽) → 公司內網 (正式)

### 專案結構
```
progresshub/
├── packages/
│   ├── frontend/           # Vue 3 + Vite + Tailwind
│   ├── backend/            # Express + TypeScript + Prisma
│   └── shared/             # 共用類型定義
├── docker-compose.yml
├── package.json            # workspace root
└── pnpm-workspace.yaml
```

---

## ⚠️ Zeabur 部署經驗教訓（必讀）

> **重要性**: 🔴 Critical - 所有開發必須遵守以下規範

### 過去踩過的坑

| # | 問題 | 嚴重度 | 根本原因 | 影響 |
|---|------|--------|----------|------|
| 1 | OpenSSL 缺失 | 🔴 Critical | Alpine Linux 未預裝 OpenSSL | Prisma 無法運行，502 錯誤 |
| 2 | 根目錄 Python Dockerfile | 🔴 Critical | 舊 Slack Bot 遺留檔案 | Zeabur 載入錯誤的 Dockerfile |
| 3 | vue-tsc 建構錯誤 | 🟠 High | 前端/後端目錄混淆 | Build 失敗 |
| 4 | 非 Production Build | 🟡 Medium | Dockerfile 使用 npm run dev | 效能差、不穩定 |

### 必須遵守的 Dockerfile 規範

**Backend Dockerfile 標準模板:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# ⚠️ 關鍵：必須安裝 OpenSSL，否則 Prisma 無法運行
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### 必須創建的配置檔

**1. `/packages/backend/.zeaburignore`**
```
../frontend
../shared
node_modules
*.test.ts
```

**2. `/packages/backend/zeabur.json`**
```json
{
  "$schema": "https://schema.zeabur.app/zeabur.json",
  "build": {
    "type": "dockerfile",
    "dockerfile": "Dockerfile"
  },
  "start": {
    "command": "npx prisma migrate deploy && node dist/index.js"
  },
  "healthcheck": {
    "path": "/health",
    "port": 3000
  }
}
```

### Zeabur Dashboard 設定檢查清單

- [ ] **Root Directory**: 設定為 `/packages/backend`（不是根目錄！）
- [ ] **不要在根目錄放 Dockerfile**（避免 Zeabur 混淆）
- [ ] **環境變數必須設定**:
  ```
  DATABASE_URL=${POSTGRES_URI}
  JWT_SECRET=<your-secret>
  NODE_ENV=production
  SLACK_CLIENT_ID=...
  SLACK_CLIENT_SECRET=...
  SLACK_SIGNING_SECRET=...
  SLACK_BOT_TOKEN=...
  ```

### 部署驗證步驟

1. 檢查 Build Logs: 確認無 OpenSSL 或 vue-tsc 錯誤
2. 健康檢查: 訪問 `https://<backend-url>/health`
3. API 文檔: 訪問 `https://<backend-url>/api-docs`

---

## 開發規範

### 程式碼風格
- 使用 TypeScript 嚴格模式
- ESLint + Prettier 統一格式
- 使用 pnpm 作為套件管理器

### Git 規範
- 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`
- Commit 訊息格式: `type(scope): description`
  - feat: 新功能
  - fix: 修復
  - refactor: 重構
  - docs: 文件
  - test: 測試

### API 規範
- RESTful 設計
- 統一錯誤回應格式
- JWT 認證 + 權限中介層

---

## 環境變數

### 開發環境 (.env.development)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/progresshub
JWT_SECRET=dev-secret-key
NODE_ENV=development
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

### 生產環境 (.env.production)
```env
DATABASE_URL=${POSTGRES_URI}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
SLACK_CLIENT_ID=${SLACK_CLIENT_ID}
SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET}
SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
```

---

## 常用指令

```bash
# 安裝依賴
pnpm install

# 啟動開發環境
docker-compose up -d          # 啟動 PostgreSQL
pnpm --filter backend dev     # 啟動後端
pnpm --filter frontend dev    # 啟動前端

# 資料庫操作
pnpm --filter backend prisma:generate  # 生成 Prisma Client
pnpm --filter backend prisma:migrate   # 執行 migration
pnpm --filter backend prisma:studio    # 開啟 Prisma Studio

# 測試
pnpm test                     # 執行所有測試
pnpm --filter backend test    # 後端測試
pnpm --filter frontend test   # 前端測試

# 建構
pnpm build                    # 建構所有套件
```
