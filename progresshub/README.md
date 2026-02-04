# ProgressHub - 專案進度回報系統

ProgressHub 是一個內網專案進度回報系統，讓員工可以透過 Slack 回報每日工作進度，PM 則能透過甘特圖即時掌握所有專案的執行狀況。

## 功能特色

- **Slack 整合**：使用 `/report` 指令快速回報進度
- **甘特圖視覺化**：Frappe Gantt 呈現專案時程
- **多維度篩選**：依專案、員工、職能篩選檢視
- **自動提醒**：每日自動提醒未回報的員工
- **權限分層**：員工、PM、管理員三層權限

## 技術架構

### 前端
- Vue 3 + Vite
- Pinia (狀態管理)
- Vue Router
- Tailwind CSS
- Frappe Gantt

### 後端
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL

### 部署
- Docker + Docker Compose
- Nginx (前端靜態檔案)

## 快速開始

### 1. 環境準備

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 填入實際配置
# 特別是 Slack OAuth 相關設定
```

### 2. 啟動服務

```bash
# 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f backend
```

### 3. 資料庫初始化

```bash
# 進入 backend 容器
docker-compose exec backend sh

# 執行 migration
npx prisma migrate deploy

# 查看資料庫
npx prisma studio
```

### 4. 存取系統

- 前端：http://localhost:3000
- 後端 API：http://localhost:4000
- Prisma Studio：http://localhost:5555

## Slack 應用程式設定

### 1. 建立 Slack App

1. 前往 [Slack API](https://api.slack.com/apps)
2. 點選「Create New App」→「From scratch」
3. 輸入 App 名稱（如 ProgressHub）
4. 選擇要安裝的 Workspace

### 2. OAuth 設定

在「OAuth & Permissions」設定：

**Scopes (Bot Token Scopes):**
- `chat:write` - 發送訊息
- `users:read` - 讀取用戶資訊
- `users:read.email` - 讀取用戶 Email

**Redirect URLs:**
```
http://localhost:3000/oauth/callback
```

### 3. Slash Commands 設定

在「Slash Commands」建立指令：

- **Command:** `/report`
- **Request URL:** `https://your-domain/api/slack/commands`
- **Description:** 回報工作進度

### 4. Interactivity 設定

在「Interactivity & Shortcuts」啟用：

- **Request URL:** `https://your-domain/api/slack/interactions`

### 5. 取得憑證

在「Basic Information」複製：
- App ID
- Client ID
- Client Secret
- Signing Secret

在「OAuth & Permissions」複製：
- Bot User OAuth Token (xoxb-...)

## API 端點

### 認證
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/slack` | Slack OAuth 登入 |
| GET | `/api/auth/me` | 取得當前用戶 |
| POST | `/api/auth/refresh` | 刷新 Token |

### 專案
| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/projects` | 取得專案列表 | All |
| POST | `/api/projects` | 建立專案 | PM |
| GET | `/api/projects/:id` | 取得專案詳情 | All |
| PUT | `/api/projects/:id` | 更新專案 | PM |
| DELETE | `/api/projects/:id` | 刪除專案 | Admin |

### 任務
| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/tasks/my` | 我的任務 | All |
| GET | `/api/tasks/project/:id` | 專案任務 | All |
| POST | `/api/tasks` | 建立任務 | PM |
| PUT | `/api/tasks/:id` | 更新任務 | PM |
| DELETE | `/api/tasks/:id` | 刪除任務 | PM |

### 進度回報
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/progress` | 提交進度 |
| GET | `/api/progress` | 查詢記錄 |
| GET | `/api/progress/my` | 我的回報 |

### 甘特圖
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/gantt` | 甘特圖資料 |
| GET | `/api/gantt/stats` | 統計數據 |

## 權限系統

| 角色 | 權限 |
|------|------|
| Employee | 回報進度、查看自己任務 |
| PM | 管理專案、任務、查看甘特圖 |
| Admin | 所有權限 + 員工管理 |

## 開發指南

### 本地開發

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### 資料庫 Migration

```bash
cd backend

# 建立新的 migration
npx prisma migrate dev --name your_migration_name

# 重新生成 Prisma Client
npx prisma generate
```

## 目錄結構

```
progresshub/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # 資料庫結構定義
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   ├── middleware/        # 中間件
│   │   └── index.ts           # 入口點
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/               # API 封裝
│   │   ├── components/        # Vue 元件
│   │   ├── views/             # 頁面
│   │   ├── stores/            # Pinia 狀態
│   │   ├── router/            # 路由設定
│   │   └── types/             # TypeScript 型別
│   ├── Dockerfile
│   └── package.json
│
├── scheduler/
│   ├── src/
│   │   └── index.ts           # 排程邏輯
│   └── package.json
│
├── docker-compose.yml
└── .env.example
```

## 授權

MIT License
