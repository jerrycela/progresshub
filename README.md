# ProgressHub

專案進度回報系統 - 讓團隊協作更透明

## 系統概述

ProgressHub 是一個內網專案進度管理系統，讓員工可以透過 Slack 輕鬆回報每日工作進度，PM 則能透過甘特圖即時掌握所有專案的執行狀況。

### 核心功能

- 員工每日透過 Slack 回報工作進度
- PM 用甘特圖檢視所有人/所有專案的進度
- 支援多專案管理、任務分配、里程碑追蹤
- 自動提醒機制確保回報完整性
- 權限分層管理（員工/PM/管理員）

## 技術架構

### 前端
- **框架**: Vue 3
- **建構工具**: Vite
- **甘特圖**: Frappe Gantt

### 後端
- **執行環境**: Node.js
- **框架**: Express
- **ORM**: Prisma
- **資料庫**: PostgreSQL
- **認證**: Slack OAuth + JWT

### 部署
- **容器化**: Docker + Docker Compose
- **服務拆分**:
  - `postgres` - PostgreSQL 資料庫
  - `backend` - Node.js API 服務
  - `frontend` - Vue 3 前端（nginx serve）
  - `scheduler` - 排程服務（每日提醒）

## 快速開始

### 前置需求

- Docker & Docker Compose
- Node.js 20+ (本地開發)
- Slack App 設定（參考下方說明）

### 安裝步驟

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd openclawfortest
   ```

2. **設定環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 檔案，填入必要的設定值
   ```

3. **啟動服務**
   ```bash
   docker-compose up -d
   ```

4. **執行資料庫遷移**
   ```bash
   docker-compose exec backend npx prisma migrate dev
   ```

5. **訪問應用**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

## 專案結構

```
.
├── backend/                # Backend API 服務
│   ├── prisma/            # Prisma Schema & Migrations
│   │   └── schema.prisma  # 資料庫 Schema 定義
│   ├── src/
│   │   ├── config/        # 設定檔
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中間件
│   │   ├── routes/        # 路由
│   │   ├── services/      # 業務邏輯
│   │   ├── types/         # TypeScript 類型定義
│   │   └── index.ts       # 應用入口
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/              # Vue 3 前端應用
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── scheduler/             # 排程服務（每日提醒）
│   ├── src/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml     # Docker Compose 配置
├── .env.example           # 環境變數範例
└── README.md
```

## 資料庫 Schema

### 5 個核心資料表

1. **Employee** - 員工表
   - 儲存員工資訊、權限等級、Slack User ID

2. **Project** - 專案表
   - 專案基本資訊、開始/結束日期、狀態

3. **Task** - 任務表
   - 任務資訊、負責人、計劃/實際日期、進度百分比

4. **Milestone** - 里程碑表
   - 專案里程碑、目標日期、達成狀態

5. **ProgressLog** - 進度記錄表
   - 每日進度回報記錄、備註

## Slack 整合設定

### 1. 建立 Slack App

1. 前往 https://api.slack.com/apps
2. 點選「Create New App」→「From scratch」
3. 輸入 App 名稱（如：ProgressHub）
4. 選擇要安裝的 Workspace

### 2. 設定 OAuth Permissions

在「OAuth & Permissions」頁面，新增以下 Bot Token Scopes：

- `chat:write` - 發送訊息
- `commands` - 處理 Slash Commands
- `users:read` - 讀取用戶資訊
- `users:read.email` - 讀取用戶 Email

### 3. 建立 Slash Command

在「Slash Commands」頁面，建立指令：

- **Command**: `/report`
- **Request URL**: `https://your-domain.com/api/slack/commands`
- **Short Description**: 回報工作進度

### 4. 安裝 App 到 Workspace

1. 在「Install App」頁面，點選「Install to Workspace」
2. 授權後，複製「Bot User OAuth Token」（以 `xoxb-` 開頭）
3. 將 Token 貼到 `.env` 檔案的 `SLACK_BOT_TOKEN`

### 5. 取得其他 Credentials

- **Client ID** & **Client Secret**: 在「Basic Information」→「App Credentials」
- **Signing Secret**: 在「Basic Information」→「App Credentials」

將這些值填入 `.env` 檔案。

## 開發指南

### Backend 開發

```bash
cd backend

# 安裝依賴
npm install

# 執行資料庫遷移
npx prisma migrate dev

# 啟動開發伺服器
npm run dev

# 開啟 Prisma Studio (資料庫管理介面)
npx prisma studio
```

### Scheduler 開發

```bash
cd scheduler

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

## API 端點

### 認證相關
- `POST /api/auth/slack` - Slack OAuth 登入
- `GET /api/auth/me` - 取得當前用戶資訊

### 專案管理
- `GET /api/projects` - 取得專案列表
- `POST /api/projects` - 建立新專案 (PM/Admin)
- `GET /api/projects/:id` - 取得單一專案詳情
- `PUT /api/projects/:id` - 更新專案 (PM/Admin)

### 任務管理
- `GET /api/projects/:projectId/tasks` - 取得專案任務
- `POST /api/projects/:projectId/tasks` - 建立新任務 (PM/Admin)
- `GET /api/tasks/my` - 取得我的任務

### 進度回報
- `POST /api/progress` - 提交進度回報
- `GET /api/progress` - 查詢進度記錄

### 甘特圖
- `GET /api/gantt` - 取得甘特圖資料（支援多種篩選）

## 權限系統

### Employee (一般員工)
- 回報自己負責任務的進度
- 查看自己參與的專案甘特圖

### PM (專案經理)
- 查看所有專案的甘特圖
- 編輯專案資訊、任務、里程碑
- 分配任務給員工

### Admin (系統管理員)
- 擁有所有 PM 權限
- 管理員工帳號
- 系統設定

## 自動提醒機制

Scheduler 服務會在每天下午 5:00（可設定）自動檢查當日尚未回報進度的員工，並透過 Slack 發送提醒訊息。

提醒設定：
- **時間**: 在 `.env` 中設定 `REMINDER_TIME`
- **時區**: 在 `.env` 中設定 `REMINDER_TIMEZONE`
- **排除**: 週末不提醒

## 常見問題

### 如何重置資料庫？

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate dev
```

### 如何查看 logs？

```bash
# 查看所有服務 logs
docker-compose logs -f

# 查看特定服務 logs
docker-compose logs -f backend
docker-compose logs -f scheduler
```

### Scheduler 沒有發送提醒？

1. 檢查 `SLACK_BOT_TOKEN` 是否正確設定
2. 檢查 Bot 是否有 `chat:write` 權限
3. 查看 scheduler 服務 logs

## License

MIT

## 開發團隊

ProgressHub Development Team
