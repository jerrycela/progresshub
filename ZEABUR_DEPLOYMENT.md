# ProgressHub - Zeabur 部署完整指南

本文件說明如何將 ProgressHub 完整部署到 Zeabur 平台。

---

## 📋 目錄

1. [架構說明](#架構說明)
2. [前置準備](#前置準備)
3. [部署步驟](#部署步驟)
4. [環境變數設定](#環境變數設定)
5. [Slack App 設定](#slack-app-設定)
6. [部署後驗證](#部署後驗證)
7. [常見問題](#常見問題)
8. [成本估算](#成本估算)

---

## 架構說明

### 部署架構圖

```
                    ┌─────────────────────────────────────┐
                    │           Zeabur Platform           │
                    └─────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌─────────────────┐          ┌─────────────────┐
│   Frontend    │          │     Backend     │          │   PostgreSQL    │
│  (Vue 3 SPA)  │  ──────▶ │ (Express + API) │  ──────▶ │   (Database)    │
│    Nginx      │          │  + Scheduler    │          │                 │
└───────────────┘          └─────────────────┘          └─────────────────┘
        │                            │
        │                            ▼
        │                   ┌─────────────────┐
        └──────────────────▶│   Slack API     │
                            │  (OAuth + Bot)  │
                            └─────────────────┘
```

### 服務清單

| 服務 | 類型 | 說明 |
|------|------|------|
| **PostgreSQL** | Marketplace | 資料庫服務 |
| **Backend** | Git (Node.js) | API 伺服器 + Scheduler |
| **Frontend** | Git (Static) | Vue 3 SPA + Nginx |

---

## 前置準備

### 1. 帳號準備

- [ ] [Zeabur 帳號](https://zeabur.com) - 可用 GitHub 登入
- [ ] [Slack App](https://api.slack.com/apps) - 需建立應用程式
- [ ] GitHub 儲存庫存取權限

### 2. Slack App 建立

前往 [Slack API](https://api.slack.com/apps) 建立新應用：

1. 點擊 **Create New App** → **From scratch**
2. 輸入 App 名稱：`ProgressHub`
3. 選擇工作區

記錄以下資訊（稍後需要）：

```
Client ID:        ___________________
Client Secret:    ___________________
Signing Secret:   ___________________
Bot Token:        xoxb-________________
```

### 3. 產生安全密鑰

在終端機執行以下指令產生 JWT Secret：

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**記錄產生的密鑰**：`____________________________________`

---

## 部署步驟

### Step 1: 建立 Zeabur 專案

1. 登入 [Zeabur Dashboard](https://zeabur.com/dashboard)
2. 點擊 **Create Project**
3. 輸入專案名稱：`progresshub`
4. 選擇區域：**Asia - Taiwan** 或 **Asia - Singapore**（建議選擇離用戶最近的區域）

### Step 2: 部署 PostgreSQL 資料庫

1. 在專案頁面點擊 **Add Service**
2. 選擇 **Marketplace**
3. 搜尋並選擇 **PostgreSQL**
4. 等待部署完成（約 1-2 分鐘）

部署完成後，Zeabur 會自動產生以下環境變數：
- `POSTGRES_URI` - 完整連線字串
- `POSTGRES_HOST` - 主機位址
- `POSTGRES_PORT` - 連接埠
- `POSTGRES_USER` - 使用者名稱
- `POSTGRES_PASSWORD` - 密碼
- `POSTGRES_DATABASE` - 資料庫名稱

### Step 3: 部署 Backend 服務

1. 點擊 **Add Service** → **Git**
2. 連結你的 GitHub 儲存庫
3. 選擇分支：`claude/review-progresshub-BeaSN`（或你的主分支）
4. **Root Directory**: `backend`
5. 等待自動偵測（Zeabur 會識別為 Node.js 專案）

#### 3.1 設定環境變數

前往 Backend 服務 → **Variables** → 新增以下變數：

```env
# ===== 資料庫 =====
DATABASE_URL=${POSTGRES_URI}

# ===== 應用程式設定 =====
NODE_ENV=production
PORT=3000

# ===== JWT 認證（必填！）=====
JWT_SECRET=<貼上你產生的密鑰>
JWT_EXPIRES_IN=7d

# ===== Slack 設定（必填！）=====
SLACK_CLIENT_ID=<你的 Slack Client ID>
SLACK_CLIENT_SECRET=<你的 Slack Client Secret>
SLACK_SIGNING_SECRET=<你的 Slack Signing Secret>
SLACK_BOT_TOKEN=<你的 Slack Bot Token，以 xoxb- 開頭>

# ===== CORS 設定 =====
ALLOWED_ORIGINS=https://<你的前端網域>.zeabur.app

# ===== Scheduler 設定 =====
ENABLE_SCHEDULER=true
REMINDER_TIME=17:00
REMINDER_TIMEZONE=Asia/Taipei
```

#### 3.2 綁定網域

1. 前往 **Networking** 標籤
2. 點擊 **Add Domain**
3. 選擇 Zeabur 子網域或綁定自訂網域
4. 記錄網域：`https://progresshub-backend-xxxxx.zeabur.app`

### Step 4: 部署 Frontend 服務

1. 點擊 **Add Service** → **Git**
2. 選擇**同一個儲存庫**
3. 選擇相同分支
4. **Root Directory**: `frontend`

#### 4.1 設定環境變數

```env
# API 後端位址
VITE_API_URL=https://<你的後端網域>.zeabur.app/api

# Slack OAuth 設定
VITE_SLACK_CLIENT_ID=<你的 Slack Client ID>
VITE_SLACK_REDIRECT_URI=https://<你的前端網域>.zeabur.app/oauth/callback
```

#### 4.2 綁定網域

1. 前往 **Networking** 標籤
2. 點擊 **Add Domain**
3. 記錄網域：`https://progresshub-xxxxx.zeabur.app`

### Step 5: 更新 CORS 設定

回到 Backend 服務，更新 `ALLOWED_ORIGINS`：

```env
ALLOWED_ORIGINS=https://progresshub-xxxxx.zeabur.app
```

---

## 環境變數設定

### Backend 完整環境變數

| 變數名稱 | 必填 | 說明 | 範例 |
|----------|:----:|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 | `${POSTGRES_URI}` |
| `NODE_ENV` | ✅ | 環境模式 | `production` |
| `PORT` | ❌ | 服務埠號（預設 3000） | `3000` |
| `JWT_SECRET` | ✅ | JWT 簽名密鑰（至少 32 字元） | `your-secret-key...` |
| `JWT_EXPIRES_IN` | ❌ | Token 有效期（預設 7d） | `7d` |
| `SLACK_CLIENT_ID` | ✅ | Slack App Client ID | `123456789.123456789` |
| `SLACK_CLIENT_SECRET` | ✅ | Slack App Client Secret | `abc123def456...` |
| `SLACK_SIGNING_SECRET` | ✅ | Slack Signing Secret | `xyz789...` |
| `SLACK_BOT_TOKEN` | ✅ | Slack Bot Token | `xoxb-...` |
| `ALLOWED_ORIGINS` | ⚠️ | CORS 白名單（生產必填） | `https://app.example.com` |
| `ENABLE_SCHEDULER` | ❌ | 啟用排程（預設 true） | `true` |
| `REMINDER_TIME` | ❌ | 提醒時間（預設 17:00） | `17:00` |
| `REMINDER_TIMEZONE` | ❌ | 時區（預設 Asia/Taipei） | `Asia/Taipei` |

### Frontend 完整環境變數

| 變數名稱 | 必填 | 說明 | 範例 |
|----------|:----:|------|------|
| `VITE_API_URL` | ✅ | 後端 API 位址 | `https://backend.zeabur.app/api` |
| `VITE_SLACK_CLIENT_ID` | ✅ | Slack Client ID | `123456789.123456789` |
| `VITE_SLACK_REDIRECT_URI` | ✅ | OAuth 回調 URL | `https://frontend.zeabur.app/oauth/callback` |

---

## Slack App 設定

部署完成後，需要更新 Slack App 設定：

### 1. OAuth & Permissions

前往 Slack App → **OAuth & Permissions**

#### Redirect URLs
新增以下 URL：
```
https://<你的後端網域>.zeabur.app/api/auth/slack/callback
```

#### Bot Token Scopes
新增以下權限：
```
chat:write          - 發送訊息
chat:write.public   - 發送到公開頻道
users:read          - 讀取用戶資訊
users:read.email    - 讀取用戶 Email
commands            - 斜線指令
```

### 2. Slash Commands

前往 **Slash Commands** → **Create New Command**

| 指令 | Request URL | 說明 |
|------|-------------|------|
| `/report` | `https://<後端>/api/slack/commands/report` | 進度回報 |
| `/time` | `https://<後端>/api/slack/commands/time` | 工時登記 |

### 3. Interactivity & Shortcuts

前往 **Interactivity & Shortcuts**

- **開啟** Interactivity
- **Request URL**: `https://<後端>/api/slack/interactions`

### 4. Event Subscriptions（可選）

如需接收事件通知：

- **開啟** Event Subscriptions
- **Request URL**: `https://<後端>/api/slack/events`

---

## 部署後驗證

### 1. 檢查 Backend 健康狀態

```bash
# 基本健康檢查
curl https://<你的後端網域>.zeabur.app/health

# 預期回應
{
  "status": "ok",
  "timestamp": "2026-02-02T...",
  "environment": "production"
}
```

```bash
# 完整就緒檢查（含資料庫）
curl https://<你的後端網域>.zeabur.app/health/ready

# 預期回應
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-02-02T..."
}
```

### 2. 檢查 API 端點

```bash
curl https://<你的後端網域>.zeabur.app/api

# 預期回應
{
  "name": "ProgressHub API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "employees": "/api/employees",
    "projects": "/api/projects",
    "tasks": "/api/tasks",
    "progress": "/api/progress",
    "timeEntries": "/api/time-entries",
    "timeCategories": "/api/time-categories",
    "timeStats": "/api/time-stats",
    "slack": "/api/slack"
  }
}
```

### 3. 檢查 Swagger 文檔

開啟瀏覽器訪問：
```
https://<你的後端網域>.zeabur.app/api-docs
```

### 4. 檢查 Frontend

開啟瀏覽器訪問：
```
https://<你的前端網域>.zeabur.app
```

應該看到登入頁面。

### 5. 檢查 Scheduler 日誌

在 Zeabur Console → Backend 服務 → **Logs**，應該看到：

```
✅ Database connected successfully
✅ Slack connected as: ProgressHub (Team: YourTeam)
📅 Scheduler configured for: 17:00 (Asia/Taipei)
📅 Cron expression: 00 17 * * 1-5
🚀 Server is running on port 3000
```

### 6. 測試 Slack 整合

在 Slack 中輸入：
```
/time help
```

應該看到工時指令的使用說明。

---

## 常見問題

### Q1: 資料庫連線失敗？

**檢查項目**：
1. 確認 PostgreSQL 服務已啟動（狀態為綠色）
2. 確認 `DATABASE_URL` 使用 `${POSTGRES_URI}` 參照
3. 查看 Backend 服務日誌中的錯誤訊息

**解決方案**：
```bash
# 確認環境變數設定正確
DATABASE_URL=${POSTGRES_URI}
```

### Q2: CORS 錯誤？

**錯誤訊息**：
```
Access to fetch at 'https://backend...' from origin 'https://frontend...'
has been blocked by CORS policy
```

**解決方案**：
1. 確認 `ALLOWED_ORIGINS` 包含完整的前端網域（含 `https://`）
2. 多個網域用逗號分隔：
```env
ALLOWED_ORIGINS=https://frontend1.zeabur.app,https://frontend2.zeabur.app
```

### Q3: Slack OAuth 失敗？

**檢查項目**：
1. Slack App 的 Redirect URL 是否正確設定
2. `SLACK_CLIENT_ID` 和 `SLACK_CLIENT_SECRET` 是否正確
3. Frontend 的 `VITE_SLACK_REDIRECT_URI` 是否與 Slack 設定一致

### Q4: Scheduler 沒有發送提醒？

**檢查項目**：
1. 確認 `ENABLE_SCHEDULER=true`
2. 確認 `SLACK_BOT_TOKEN` 正確且有效
3. 確認 Bot 已被加入目標 Slack 工作區
4. 檢查日誌中的 `[Scheduler]` 訊息

### Q5: 前端顯示空白頁面？

**檢查項目**：
1. 開啟瀏覽器開發者工具（F12）查看 Console 錯誤
2. 確認 `VITE_API_URL` 設定正確
3. 確認後端 CORS 設定包含前端網域

### Q6: JWT Token 無效？

**可能原因**：
- `JWT_SECRET` 在部署過程中被變更
- Token 已過期

**解決方案**：
1. 確保 `JWT_SECRET` 固定不變
2. 清除瀏覽器 sessionStorage 後重新登入

---

## 成本估算

### Zeabur 免費額度

- 每月 **$5 美元**免費額度
- 註冊後首月可能有額外優惠

### 預估月費

| 服務 | 規格 | 預估費用 |
|------|------|----------|
| PostgreSQL | 基本方案 | $2-5/月 |
| Backend | 0.5 vCPU / 512MB | $3-7/月 |
| Frontend | 靜態網站 | $0-2/月 |
| **總計** | | **$5-14/月** |

> 💡 小型測試環境可能在免費額度內運作

### 節省成本建議

1. **開發環境**：使用本地 Docker Compose 開發
2. **暫停服務**：不使用時可暫停（Pause）服務
3. **選擇合適規格**：根據實際流量調整資源

---

## 進階設定

### 自訂網域

1. 前往服務 → **Networking** → **Custom Domain**
2. 輸入你的網域，例如：`app.yourcompany.com`
3. 在 DNS 設定中新增 CNAME 記錄：
   ```
   app.yourcompany.com → <zeabur-提供的位址>
   ```
4. 等待 DNS 生效（最多 24 小時）
5. Zeabur 會自動配置 SSL 憑證

### 設定自動部署

Zeabur 預設會在 Git push 時自動部署。如需調整：

1. 前往服務 → **Settings** → **Git**
2. 設定 **Auto Deploy Branch**
3. 可選擇特定分支觸發部署

### 監控與告警

1. 前往 **Metrics** 查看資源使用情況
2. 設定 **Alerts** 接收異常通知

---

## 部署檢查清單

### 部署前

- [ ] 已建立 Zeabur 帳號
- [ ] 已建立 Slack App 並記錄所有 Token
- [ ] 已產生 JWT Secret
- [ ] 程式碼已推送到 GitHub

### 部署中

- [ ] PostgreSQL 服務已啟動
- [ ] Backend 環境變數已設定
- [ ] Frontend 環境變數已設定
- [ ] 網域已綁定

### 部署後

- [ ] `/health` 回應正常
- [ ] `/health/ready` 顯示資料庫已連線
- [ ] `/api-docs` Swagger 文檔可存取
- [ ] 前端登入頁面可顯示
- [ ] Slack `/time` 指令可使用
- [ ] Scheduler 日誌顯示正常啟動

---

## 聯絡支援

- **Zeabur 文檔**：https://zeabur.com/docs
- **Zeabur Discord**：https://discord.gg/zeabur
- **專案 Issues**：https://github.com/jerrycela/openclawfortest/issues

---

> 最後更新：2026-02-02
