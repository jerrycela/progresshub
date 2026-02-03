# Claude Code 專案指引

## 變更提交規範

所有變更完成後，必須提供以下資訊供團隊成員檢視：

### 必要資訊
- **分支名稱**: 完整的分支名稱
- **最新 Commit**: commit hash 和訊息
- **變更摘要**: 本次變更的重點內容

### 範例格式
```
## 變更完成

- 分支: `claude/dev-assistance-Otowz`
- Commit: `901c9e0 feat(frontend): 新增 Vue 3 前端並實作安全性修復`
- 檢視連結: https://github.com/jerrycela/openclawfortest/tree/claude/dev-assistance-Otowz

### 變更內容
1. 功能 A
2. 功能 B
3. 修復 C
```

## 專案結構

```
├── backend/          # Express.js + TypeScript 後端 API
├── frontend/         # Vue 3 + TypeScript 前端
├── scheduler/        # 排程任務服務
├── .github/          # GitHub Actions CI/CD
└── docker-compose.yml
```

## 技術棧

- **後端**: Express.js, TypeScript, Prisma, PostgreSQL
- **前端**: Vue 3, TypeScript, Pinia, Tailwind CSS
- **認證**: Slack OAuth + JWT
- **部署**: Docker, Zeabur

## 專案慣例

### PRD 文件
- 位置：`backend/docs/`
- 命名：`PRD_<功能名稱>.md`
- 版本記錄：每次更新需更新版本號和變更記錄

### Git 提交訊息
- 使用繁體中文
- 格式：`<type>: <描述>`
- 類型：`feat`, `fix`, `docs`, `chore`, `refactor`

## 部署問題檢討與改進策略

### 問題 1：TypeScript 編譯器未找到 (tsc not found)

**錯誤訊息**：`sh: tsc: not found`

**根本原因**：
- 雲端部署平台（如 Zeabur）預設設定 `NODE_ENV=production`
- 當 `NODE_ENV=production` 時，`npm ci` 會跳過 `devDependencies`
- TypeScript 是 `devDependencies`，導致建構階段無法找到 `tsc`

**解決方案**：
在 Dockerfile 的建構階段使用 `npm ci --include=dev` 明確安裝 devDependencies

```dockerfile
# Production build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# 關鍵：確保安裝 devDependencies 以進行 TypeScript 編譯
RUN npm ci --include=dev
COPY . .
RUN npx prisma generate
RUN npm run build
```

**改進策略**：
- 部署前檢查 Dockerfile 是否正確處理 devDependencies
- 記住：生產環境建構 ≠ 生產環境執行，建構時需要開發工具

### 問題 2：TypeScript 編譯錯誤 - 無效字符

**錯誤訊息**：`error TS1127: Invalid character` 在 `health.ts` 第 40 行

**根本原因**：
- 程式碼中使用了 `prisma.\$queryRaw` 而非 `prisma.$queryRaw`
- 多餘的反斜線 `\` 被 TypeScript 視為無效字符
- 可能是複製貼上或自動轉義造成

**解決方案**：
移除多餘的反斜線，使用正確的 Prisma API 語法

```typescript
// 錯誤
await prisma.\$queryRaw`SELECT 1`;

// 正確
await prisma.$queryRaw`SELECT 1`;
```

**改進策略**：
- 編輯程式碼後，在本地執行 `npm run build` 或 `npx tsc --noEmit` 驗證編譯
- 特別注意包含特殊字符（如 `$`）的 API 調用
- 部署前進行本地建構測試

### 問題 3：package-lock.json 未納入版本控制

**根本原因**：
- `.gitignore` 排除了 `package-lock.json`
- 部署時 `npm ci` 需要此檔案

**解決方案**：
從 `.gitignore` 移除 `package-lock.json` 並提交該檔案

**改進策略**：
- `package-lock.json` 應始終納入版本控制
- 確保所有環境使用相同的依賴版本

### 問題 4：TypeScript 嚴格模式導致大量編譯錯誤

**錯誤訊息**：30+ 個 TypeScript 編譯錯誤，包括：
- `TS6133`: 未使用的變數/參數
- `TS2345`: 類型不匹配 (`unknown` 類型問題)
- `TS2339`: 屬性不存在於類型
- `TS18046`: 變數是 `unknown` 類型

**根本原因**：
- `tsconfig.json` 啟用了嚴格的 TypeScript 檢查
- 程式碼中有未使用的變數、未正確處理的類型等問題
- 這些在開發環境可能被忽略，但在建構時會報錯

**解決方案**：
暫時在 `tsconfig.json` 中禁用嚴格檢查：

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": false
  }
}
```

**改進策略**：
- 這是臨時解決方案，長期應該修復所有 TypeScript 錯誤
- 部署前應在本地執行 `npm run build` 確保編譯通過
- 考慮使用 CI/CD 在合併前檢查 TypeScript 編譯
- 新增程式碼時確保符合 TypeScript 最佳實踐

### 問題 5：Zeabur 使用錯誤的 Dockerfile

**根本原因**：
- Zeabur 的「從 GitHub 載入」功能載入了錯誤的 Dockerfile（例如 scheduler 的 Python Dockerfile）
- 即使設定了正確的根目錄，自動載入可能選錯檔案

**解決方案**：
手動在 Zeabur 設定頁面中貼上正確的 Dockerfile 內容

**改進策略**：
- 每次部署前確認 Zeabur 使用的 Dockerfile 內容正確
- 檢查 Dockerfile 的 `FROM` 指令確認是正確的基礎映像
- Backend 應使用 `node:20-alpine`，而非 `python:3.11-slim`

### 問題 6：Repository 包含多個專案導致部署混淆

**根本原因**：
- `openclawfortest` repository 包含**兩套**獨立的專案結構：
  ```
  openclawfortest/
  ├── backend/              ← 根目錄 backend (含 GitLab 整合程式碼)
  ├── frontend/             ← 根目錄 frontend
  ├── progresshub/          ← ProgressHub 子專案
  │   ├── backend/         ← ProgressHub 後端
  │   └── frontend/        ← ProgressHub 前端
  ```
- Zeabur 部署時使用**根目錄的 backend/**，而非 **progresshub/backend/**
- 修復工作若在錯誤的目錄進行，將不會影響實際部署

**解決方案**：
1. 確認 Zeabur 服務的 Root Directory 設定
2. 修復正確目錄的程式碼（根目錄 backend 或 progresshub/backend）
3. 根據實際部署需求，考慮將專案分開到不同的 repository

**改進策略**：
- 部署前確認 Zeabur 服務連結的目錄路徑
- 在 CLAUDE.md 明確記錄哪個目錄是被部署的
- 考慮使用 monorepo 管理工具或分開 repository

### 問題 7：GitLab 整合程式碼的 TypeScript 錯誤

**錯誤訊息**：
- `env.API_BASE_URL` 屬性不存在
- `unknown` 類型無法賦值給 `Record<string, unknown>`
- `response.json()` 返回 `unknown` 類型的屬性存取問題

**根本原因**：
- `env.ts` 的 `EnvConfig` interface 缺少 `API_BASE_URL` 定義
- GitLab API Client 的類型轉換不完整
- TypeScript 嚴格模式下的類型推斷問題

**解決方案**：
1. 在 `backend/src/config/env.ts` 新增 `API_BASE_URL` 屬性：
   ```typescript
   interface EnvConfig {
     // ... 其他屬性
     API_BASE_URL: string;
   }

   export const env: EnvConfig = {
     // ... 其他值
     API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
   };
   ```

2. 在 GitLab API Client 中使用正確的類型斷言：
   ```typescript
   // 修復前
   return response.data.map((item: unknown) => this.transform(item));

   // 修復後
   return response.data.map((item: unknown) => this.transform(item as Record<string, unknown>));
   ```

3. 修復 `prisma generate` 未執行問題：
   ```json
   {
     "scripts": {
       "build": "prisma generate && tsc"
     }
   }
   ```

**改進策略**：
- 本地執行 `npm run build` 確保編譯通過後再提交
- 新增環境變數時，同時更新 `EnvConfig` interface
- 使用 TypeScript 嚴格模式時，確保所有類型正確定義

### 問題 8：Alpine Linux 缺少 OpenSSL 導致 Prisma 無法啟動

**錯誤訊息**：
```
Error: libssl.so.1.1: cannot open shared object file: No such file or directory
```

**根本原因**：
- Prisma 需要 `libssl.so.1.1`（OpenSSL 1.1）
- Alpine Linux 預設不包含 OpenSSL
- Docker 的 production stage 缺少必要的系統依賴

**解決方案**：
在 Dockerfile 的 production stage 安裝 OpenSSL：

```dockerfile
# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

# ... rest of the Dockerfile
```

**改進策略**：
- 使用 Prisma 時，記得在 Alpine Linux 中安裝 OpenSSL
- 或考慮使用非 Alpine 的基礎映像（如 `node:20-slim`）
- 在本地用 Docker 測試建構後再部署

### 問題 9：vue-tsc 建構錯誤 (2026-02-03 發現)

**錯誤訊息**：
```
Search string not found: "/supportedTSExtensions = .*(?=;)/"
```

**根本原因**：
- 此錯誤出現在 Zeabur 建構日誌中
- `vue-tsc` 版本可能與 TypeScript 版本不相容
- 需要確認 Zeabur 是否在正確的目錄執行建構

**可能的解決方案**：
1. 檢查 `frontend/package.json` 中的 `vue-tsc` 和 `typescript` 版本相容性
2. 嘗試更新或降級 `vue-tsc` 版本
3. 確認 Zeabur 前端服務的根目錄設定正確

---

## 🚨 當前部署狀態 (2026-02-03 更新)

### Backend 服務 (progresshub-api.zeabur.app)

**狀態**: ❌ 502 SERVICE_UNAVAILABLE

**已嘗試的修復**：
1. ✅ 在 Zeabur Dashboard 手動更新 Dockerfile，加入 OpenSSL 安裝
2. ✅ 確認根目錄設定為 `/backend`
3. ✅ 觸發重新部署
4. ❌ 部署仍然失敗

**待解決問題**：
- Zeabur 建構日誌顯示 `vue-tsc` 錯誤，需要進一步調查

### 需要在 GitHub 確認/修改的檔案

#### 1. `/backend/Dockerfile` - 確保包含以下內容：
```dockerfile
# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# 關鍵: 安裝 OpenSSL 給 Prisma 使用
RUN apk add --no-cache openssl

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

#### 2. `/backend/src/config/env.ts` - 確保有 API_BASE_URL：
```typescript
interface EnvConfig {
  // ... 其他屬性
  API_BASE_URL: string;
}

export const env: EnvConfig = {
  // ... 其他值
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
};
```

### Zeabur Dashboard 設定檢查清單

- [ ] Backend 服務根目錄: `/backend`
- [ ] Backend Dockerfile 使用 `node:20-alpine`（不是 `python:3.11-slim`）
- [ ] Frontend 服務根目錄: `/frontend`
- [ ] 所有必要環境變數已設定
