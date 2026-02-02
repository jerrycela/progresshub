# Zeabur 部署指南

本文件說明如何將 ProgressHub 部署到 Zeabur 平台。

## 架構說明

```
Zeabur Project: progresshub
├── Service: backend (Node.js)
├── Service: scheduler (Node.js)
├── Service: postgres (PostgreSQL)
└── Service: frontend (Static/Node.js) [未來]
```

## 部署步驟

### Step 1: 建立 Zeabur 專案

1. 前往 [Zeabur Console](https://zeabur.com/dashboard)
2. 點擊 **Create Project**
3. 選擇區域（建議：Asia - Taiwan 或 Singapore）

### Step 2: 部署 PostgreSQL 資料庫

1. 在專案中點擊 **Add Service**
2. 選擇 **Marketplace** → **PostgreSQL**
3. 等待部署完成
4. 記下連線資訊（會自動產生環境變數）

### Step 3: 部署 Backend 服務

1. 點擊 **Add Service** → **Git**
2. 連結你的 GitHub 儲存庫
3. 選擇 **Root Directory**: `backend`
4. Zeabur 會自動偵測 Node.js 專案

**設定環境變數** (Settings → Environment Variables):

```env
# 資料庫（Zeabur 會自動注入，或手動設定）
DATABASE_URL=${POSTGRES_URI}

# 必要設定
NODE_ENV=production
JWT_SECRET=<產生一個強密鑰，至少 32 字元>
JWT_EXPIRES_IN=7d

# Slack 設定
SLACK_CLIENT_ID=<你的 Slack App Client ID>
SLACK_CLIENT_SECRET=<你的 Slack App Client Secret>
SLACK_SIGNING_SECRET=<你的 Slack Signing Secret>
SLACK_BOT_TOKEN=<你的 Slack Bot Token>

# CORS 設定（填入你的前端網域）
ALLOWED_ORIGINS=https://your-frontend.zeabur.app
```

### Step 4: 部署 Scheduler 服務

1. 點擊 **Add Service** → **Git**
2. 選擇同一個儲存庫
3. 選擇 **Root Directory**: `scheduler`

**設定環境變數**:

```env
DATABASE_URL=${POSTGRES_URI}
NODE_ENV=production
SLACK_BOT_TOKEN=<你的 Slack Bot Token>
REMINDER_TIME=17:00
REMINDER_TIMEZONE=Asia/Taipei
```

### Step 5: 綁定自訂網域（可選）

1. 前往 Backend 服務 → **Networking**
2. 點擊 **Add Domain**
3. 可使用 Zeabur 提供的免費子網域，或綁定自己的網域

## 環境變數快速參考

### Backend 必要變數

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 簽名密鑰 | `your-super-secret-key-at-least-32-chars` |
| `NODE_ENV` | 環境模式 | `production` |
| `SLACK_CLIENT_ID` | Slack App Client ID | `123456789.123456789` |
| `SLACK_CLIENT_SECRET` | Slack App Secret | `abc123...` |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret | `def456...` |
| `SLACK_BOT_TOKEN` | Slack Bot Token | `xoxb-...` |
| `ALLOWED_ORIGINS` | CORS 白名單 | `https://app.example.com` |

### Scheduler 必要變數

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | 同上 |
| `SLACK_BOT_TOKEN` | Slack Bot Token | `xoxb-...` |
| `REMINDER_TIME` | 提醒時間 | `17:00` |
| `REMINDER_TIMEZONE` | 時區 | `Asia/Taipei` |

## 產生安全的 JWT_SECRET

在終端機執行：

```bash
# macOS/Linux
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Zeabur 服務間連線

Zeabur 同一專案內的服務可以透過服務名稱互相連線：

- PostgreSQL: 使用 `${POSTGRES_URI}` 變數參照
- 服務間通訊: 使用 `http://<service-name>.zeabur.internal`

## 部署後驗證

### 1. 檢查 Backend 健康狀態

```bash
curl https://your-backend.zeabur.app/health
```

預期回應：
```json
{
  "status": "ok",
  "timestamp": "2026-02-02T...",
  "environment": "production"
}
```

### 2. 檢查 API 端點

```bash
curl https://your-backend.zeabur.app/api
```

### 3. 檢查 Scheduler 日誌

在 Zeabur Console → Scheduler 服務 → Logs 查看排程是否正常運作。

## 常見問題

### Q: 資料庫連線失敗？

確認 `DATABASE_URL` 格式正確，且 PostgreSQL 服務已啟動。

### Q: Scheduler 沒有發送提醒？

1. 確認 `SLACK_BOT_TOKEN` 正確
2. 確認 Bot 已被加入目標 Slack 工作區
3. 查看 Scheduler 服務日誌

### Q: CORS 錯誤？

確認 `ALLOWED_ORIGINS` 包含你的前端網域（含 https://）。

## 成本估算

Zeabur 免費方案包含：
- 每月 $5 免費額度
- 足夠運行小型測試環境

預估月費（測試環境）：
- PostgreSQL: ~$2-5
- Backend: ~$2-5
- Scheduler: ~$1-2
- **總計**: ~$5-12/月

## 下一步

1. 完成部署後，設定 Slack App 的 OAuth Redirect URL
2. 測試 Slack 整合功能
3. 部署前端應用（第二階段）
