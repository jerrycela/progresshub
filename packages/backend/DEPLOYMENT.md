# ProgressHub Backend 部署指南

## 目錄

1. [環境需求](#環境需求)
2. [環境變數設定](#環境變數設定)
3. [本地開發](#本地開發)
4. [Docker 部署](#docker-部署)
5. [Zeabur 部署](#zeabur-部署)
6. [資料庫遷移](#資料庫遷移)
7. [健康檢查](#健康檢查)
8. [故障排除](#故障排除)

---

## 環境需求

| 項目 | 版本要求 |
|------|----------|
| Node.js | 20.x LTS |
| PostgreSQL | 15.x |
| npm | 10.x |
| Docker | 24.x (可選) |

---

## 環境變數設定

### 必要變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@localhost:5432/progresshub` |
| `JWT_SECRET` | JWT 簽署金鑰 (至少 32 字元) | `your-super-secret-key-at-least-32-chars` |

### 選用變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | 伺服器埠號 | `3000` |
| `NODE_ENV` | 執行環境 | `development` |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `SLACK_CLIENT_ID` | Slack OAuth Client ID | - |
| `SLACK_CLIENT_SECRET` | Slack OAuth Client Secret | - |

### 設定步驟

```bash
# 1. 複製範例檔案
cp .env.example .env

# 2. 編輯環境變數
vim .env

# 3. 確認必要變數已設定
cat .env | grep -E "DATABASE_URL|JWT_SECRET"
```

---

## 本地開發

### 安裝依賴

```bash
npm install
```

### 產生 Prisma Client

```bash
npm run prisma:generate
```

### 執行資料庫遷移

```bash
npm run prisma:migrate
```

### 啟動開發伺服器

```bash
npm run dev
```

### 執行測試

```bash
npm test
```

---

## Docker 部署

### 使用 Docker Compose

```bash
# 1. 複製環境變數
cp .env.example .env

# 2. 編輯必要變數
vim .env

# 3. 啟動服務
docker-compose up -d

# 4. 檢查服務狀態
docker-compose ps

# 5. 查看日誌
docker-compose logs -f backend
```

### 單獨建置映像

```bash
# 建置映像
docker build -t progresshub-backend .

# 執行容器
docker run -d \
  --name progresshub-api \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret-key" \
  progresshub-backend
```

---

## Zeabur 部署

### 服務設定

| 設定項目 | 值 |
|----------|-----|
| Root Directory | `packages/backend` |
| Build Command | (自動偵測 Dockerfile) |
| Port | `3000` |

### 環境變數

在 Zeabur Dashboard 設定以下環境變數：

1. `DATABASE_URL` - 使用 Zeabur PostgreSQL 服務提供的連線字串
2. `JWT_SECRET` - 使用 Zeabur 的 Secret 功能產生
3. `NODE_ENV` - 設為 `production`

### 部署步驟

1. 連結 GitHub Repository
2. 選擇 `packages/backend` 作為 Root Directory
3. 新增 PostgreSQL 服務
4. 設定環境變數
5. 部署

---

## 資料庫遷移

### 開發環境

```bash
# 建立新的遷移
npm run prisma:migrate

# 檢視遷移狀態
npx prisma migrate status
```

### 生產環境

```bash
# 執行遷移 (不建立新遷移)
npx prisma migrate deploy

# 或使用 Docker
docker exec progresshub-api npx prisma migrate deploy
```

### 重置資料庫 (僅限開發)

```bash
npx prisma migrate reset
```

---

## 健康檢查

### 端點

| 端點 | 用途 | 回應 |
|------|------|------|
| `GET /health` | 完整健康檢查 | 包含資料庫狀態、延遲、系統資訊 |
| `GET /health/live` | Kubernetes Liveness | 確認服務存活 |
| `GET /health/ready` | Kubernetes Readiness | 確認服務就緒 |

### 範例回應

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-06T08:00:00.000Z",
    "version": "1.0.0",
    "uptime": 3600,
    "services": {
      "database": {
        "status": "up",
        "latency": 5
      }
    }
  }
}
```

### 監控建議

```bash
# 使用 curl 測試健康檢查
curl -s http://localhost:3000/health | jq .

# 監控腳本
while true; do
  curl -s http://localhost:3000/health/ready && echo " OK" || echo " FAIL"
  sleep 30
done
```

---

## 故障排除

### 常見問題

#### 1. TypeScript 編譯失敗 (tsc not found)

**原因**: Dockerfile 未安裝 devDependencies

**解決方案**: 確認 Dockerfile 使用 `npm ci --include=dev`

#### 2. Prisma 無法連線資料庫 (libssl.so.1.1 not found)

**原因**: Alpine Linux 缺少 OpenSSL

**解決方案**: 在 Dockerfile 加入 `RUN apk add --no-cache openssl`

#### 3. 資料庫連線失敗

**檢查步驟**:
```bash
# 1. 確認 DATABASE_URL 格式正確
echo $DATABASE_URL

# 2. 測試資料庫連線
npx prisma db pull

# 3. 檢查網路連通性
nc -zv localhost 5432
```

#### 4. JWT 驗證失敗

**檢查步驟**:
```bash
# 確認 JWT_SECRET 一致
echo $JWT_SECRET | wc -c  # 應大於 32
```

### 日誌查看

```bash
# Docker
docker logs progresshub-api --tail 100 -f

# Docker Compose
docker-compose logs -f backend

# Zeabur
# 在 Dashboard 查看 Logs 頁籤
```

### 效能調校

| 參數 | 說明 | 建議值 |
|------|------|--------|
| `NODE_OPTIONS` | Node.js 記憶體限制 | `--max-old-space-size=512` |
| Connection Pool | Prisma 連線池大小 | 在 DATABASE_URL 加入 `?connection_limit=10` |

---

## API 文件

完整 API 端點說明：

| 模組 | 路徑 | 說明 |
|------|------|------|
| 認證 | `/api/auth/*` | Slack OAuth、登入登出 |
| 任務 | `/api/tasks/*` | CRUD、狀態轉換 |
| 甘特圖 | `/api/gantt/*` | 甘特圖資料、統計 |
| 進度追蹤 | `/api/progress/*` | 進度回報、摘要 |
| 健康檢查 | `/health/*` | 系統狀態監控 |

---

## 聯絡資訊

- GitHub Issues: [回報問題](https://github.com/jerrycela/progresshub/issues)
- 專案文件: [README.md](./README.md)
