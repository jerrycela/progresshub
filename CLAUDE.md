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
