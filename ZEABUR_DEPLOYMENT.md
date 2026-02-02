# Zeabur 部署指南

本文件說明如何將 ProgressHub 部署到 Zeabur 平台。

## 架構說明（合併部署模式）

```
Zeabur Project: progresshub
├── Service: backend (Node.js) ← API + Scheduler 合併
└── Service: postgres (PostgreSQL)
```

> **注意**：Scheduler 已整合到 Backend 服務中，只需部署兩個服務即可。

## 部署步驟

### Step 1: 建立 Zeabur 專案

1. 前往 [Zeabur Console](https://zeabur.com/dashboard)
2. 點擊 **Create Project**
3. 選擇區域（建議：Asia - Taiwan 或 Singapore）

### Step 2: 部署 PostgreSQL 資料庫

1. 在專案中點擊 **Add Service**
2. 選擇 **Marketplace** → **PostgreSQL**
3. 等待部署完成
4. 連線資訊會自動產生環境變數 `${POSTGRES_URI}`

### Step 3: 部署 Backend 服務（含 Scheduler）

1. 點擊 **Add Service** → **Git**
2. 連結你的 GitHub 儲存庫
3. 選擇 **Root Directory**: `backend`
4. Zeabur 會自動偵測 Node.js 專案並使用 `zeabur.json` 配置

**設定環境變數** (Settings → Environment Variables):

```env
# 資料庫（使用 Zeabur 變數參照）
DATABASE_URL=${POSTGRES_URI}

# 應用設定
NODE_ENV=production
PORT=3000

# JWT 安全性（必填！）
JWT_SECRET=<產生一個強密鑰，至少 32 字元>
JWT_EXPIRES_IN=7d

# Slack 設定（必填！）
SLACK_CLIENT_ID=<你的 Slack App Client ID>
SLACK_CLIENT_SECRET=<你的 Slack App Client Secret>
SLACK_SIGNING_SECRET=<你的 Slack Signing Secret>
SLACK_BOT_TOKEN=<你的 Slack Bot Token>

# CORS 設定（填入你的前端網域）
ALLOWED_ORIGINS=https://your-frontend.zeabur.app

# Scheduler 設定
REMINDER_TIME=17:00
REMINDER_TIMEZONE=Asia/Taipei
ENABLE_SCHEDULER=true
```

### Step 4: 綁定網域

1. 前往 Backend 服務 → **Networking**
2. 點擊 **Add Domain**
3. 使用 Zeabur 提供的免費子網域，或綁定自己的網域

## 環境變數快速參考

| 變數名稱 | 必填 | 說明 | 範例 |
|----------|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 | `${POSTGRES_URI}` |
| `JWT_SECRET` | ✅ | JWT 簽名密鑰（至少 32 字元） | `your-super-secret-key...` |
| `NODE_ENV` | ✅ | 環境模式 | `production` |
| `SLACK_CLIENT_ID` | ✅ | Slack App Client ID | `123456789.123456789` |
| `SLACK_CLIENT_SECRET` | ✅ | Slack App Secret | `abc123...` |
| `SLACK_SIGNING_SECRET` | ✅ | Slack Signing Secret | `def456...` |
| `SLACK_BOT_TOKEN` | ✅ | Slack Bot Token | `xoxb-...` |
| `ALLOWED_ORIGINS` | ⚠️ | CORS 白名單（生產環境必填） | `https://app.example.com` |
| `REMINDER_TIME` | ❌ | 提醒時間（預設 17:00） | `17:00` |
| `REMINDER_TIMEZONE` | ❌ | 時區（預設 Asia/Taipei） | `Asia/Taipei` |
| `ENABLE_SCHEDULER` | ❌ | 是否啟用排程（預設 true） | `true` |

## 產生安全的 JWT_SECRET

在終端機執行：

```bash
# macOS/Linux
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 部署後驗證

### 1. 檢查健康狀態

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

在 Zeabur Console → Backend 服務 → Logs，應該看到：
```
[Scheduler] 📅 Configured for: 17:00 (Asia/Taipei)
[Scheduler] 📅 Cron expression: 00 17 * * 1-5
[Scheduler] 🚀 Scheduler started successfully
```

## 常見問題

### Q: 如何單獨禁用 Scheduler？

設定環境變數：
```env
ENABLE_SCHEDULER=false
```

### Q: 資料庫連線失敗？

1. 確認 PostgreSQL 服務已啟動
2. 確認 `DATABASE_URL` 使用 `${POSTGRES_URI}` 參照
3. 查看 Zeabur 的服務日誌

### Q: Scheduler 沒有發送提醒？

1. 確認 `SLACK_BOT_TOKEN` 正確
2. 確認 Bot 已被加入目標 Slack 工作區
3. 確認 `ENABLE_SCHEDULER=true`
4. 查看服務日誌中的 `[Scheduler]` 訊息

### Q: CORS 錯誤？

確認 `ALLOWED_ORIGINS` 包含你的前端網域（含 `https://`）。

## 成本估算

Zeabur 免費方案包含：
- 每月 $5 免費額度

預估月費（測試環境，合併部署）：
- PostgreSQL: ~$2-5
- Backend (含 Scheduler): ~$3-7
- **總計**: ~$5-12/月

> 💡 合併部署比分開部署節省約 $1-2/月

## 未來擴展

如果需要分開部署（生產環境建議），可以：

1. 設定 Backend 的 `ENABLE_SCHEDULER=false`
2. 單獨部署 `scheduler` 目錄作為獨立服務
3. 這樣可以獨立擴展 API 和 Scheduler

## Slack App 設定提醒

部署完成後，記得更新 Slack App 設定：

1. **OAuth Redirect URL**: `https://your-backend.zeabur.app/api/auth/slack/callback`
2. **Slash Commands URL**: `https://your-backend.zeabur.app/api/slack/commands`
3. **Interactivity URL**: `https://your-backend.zeabur.app/api/slack/interactions`
