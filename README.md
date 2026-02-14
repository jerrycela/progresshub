# ProgressHub

[![CI](https://github.com/jerrycela/progresshub/actions/workflows/ci.yml/badge.svg)](https://github.com/jerrycela/progresshub/actions/workflows/ci.yml)

專案進度回報系統 — 讓團隊協作更透明

## 系統概述

ProgressHub 是內網專案進度管理系統，員工透過 Slack 回報每日工作進度，PM 則能透過甘特圖即時掌握所有專案的執行狀況。

### 核心功能

- 任務池管理（認領、指派、自建）
- 甘特圖進度追蹤（篩選、分組、里程碑）
- Slack OAuth 登入 + JWT 認證
- 權限分層管理（Employee / PM / Admin）
- 每日自動提醒回報

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Vue 3, TypeScript, Pinia, Tailwind CSS, Vite |
| 後端 | Express.js, TypeScript, Prisma, PostgreSQL |
| 認證 | Slack OAuth + JWT |
| 部署 | Docker, Zeabur |

## 專案結構

```
.
├── packages/
│   ├── frontend/          # Vue 3 前端應用
│   │   └── src/
│   │       ├── pages/         # 頁面元件
│   │       ├── components/    # 共用元件 (common/, layout/, task/, gantt/)
│   │       ├── stores/        # Pinia stores
│   │       ├── services/      # API service layer
│   │       ├── composables/   # Vue composables
│   │       └── mocks/         # Mock 資料
│   └── shared/
│       └── types/         # 前後端共用 TypeScript 類型
│
├── backend/               # Express.js 後端 API
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/        # 環境設定
│       ├── controllers/   # 控制器
│       ├── middleware/     # 中間件 (auth, rate-limit, CORS)
│       ├── routes/        # 路由
│       └── services/      # 業務邏輯
│
├── .github/workflows/     # CI/CD
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 開發環境設定

### 前置需求

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose（後端開發需要）

### 快速開始（Mock 模式）

不需要後端和資料庫，適合前端開發：

```bash
# 安裝依賴
pnpm install

# 啟動前端（預設使用 mock 資料）
pnpm --filter frontend dev
```

前端會啟動在 `http://localhost:5173`，可使用 Demo 登入。

### 完整開發環境

需要後端 API 和 PostgreSQL：

```bash
# 1. 啟動 PostgreSQL
docker compose up -d postgres

# 2. 設定後端環境變數
cp .env.example backend/.env
# 編輯 backend/.env 填入必要設定

# 3. 初始化資料庫
pnpm --filter backend exec prisma migrate dev
pnpm --filter backend exec prisma db seed

# 4. 啟動後端
pnpm --filter backend dev

# 5. 啟動前端（API 模式）
# 在 packages/frontend/.env 設定 VITE_USE_MOCK=false
pnpm --filter frontend dev
```

### Docker 一鍵啟動

```bash
docker compose up -d
```

### 環境變數

複製 `.env.example` 並填入必要設定。

**必要變數（生產環境）**：

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `JWT_SECRET` | JWT 簽章金鑰 |
| `JWT_REFRESH_SECRET` | JWT Refresh Token 金鑰 |
| `SLACK_CLIENT_ID` | Slack App Client ID |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret |
| `SLACK_BOT_TOKEN` | Slack Bot Token (`xoxb-`) |

**可選變數**：

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `NODE_ENV` | `development` | 執行環境 |
| `BACKEND_PORT` | `3000` | 後端埠號 |
| `JWT_EXPIRES_IN` | `2h` | Token 有效期 |
| `VITE_USE_MOCK` | `true` | 前端是否使用 Mock 資料 |
| `VITE_API_URL` | `http://localhost:3000/api` | 後端 API URL |

## API 端點

### 認證
- `POST /api/auth/slack` — Slack OAuth 登入
- `POST /api/auth/refresh` — 重新整理 Token
- `GET /api/auth/me` — 取得當前使用者

### 任務管理
- `GET /api/projects/:projectId/tasks` — 取得專案任務
- `POST /api/projects/:projectId/tasks` — 建立任務 (PM/Admin)
- `PUT /api/tasks/:id` — 更新任務
- `DELETE /api/tasks/:id` — 刪除任務
- `GET /api/tasks/my` — 取得我的任務
- `POST /api/tasks/:id/claim` — 認領任務
- `POST /api/tasks/:id/unclaim` — 取消認領

### 進度回報
- `POST /api/progress` — 提交進度回報
- `GET /api/progress` — 查詢進度記錄

### 甘特圖
- `GET /api/gantt` — 取得甘特圖資料

## 權限系統

| 角色 | 權限 |
|------|------|
| Employee | 回報進度、查看參與的專案 |
| PM | 管理專案/任務/里程碑、查看所有專案甘特圖 |
| Admin | 所有 PM 權限 + 員工管理 + 系統設定 |

## 安全措施

- Helmet.js 安全標頭
- CORS 白名單
- API Rate Limiting
- JWT Token 認證（Access + Refresh）
- AES-256-GCM 加密敏感資料
- 生產環境強制設定 JWT_SECRET / JWT_REFRESH_SECRET

## Contributing

1. Fork 此 repo
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

請確保 CI 通過後再提交 PR。

## License

MIT
