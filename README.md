# ProgressHub

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
│   ├── frontend/          # Vue 3 前端應用 (Zeabur 部署)
│   │   ├── src/
│   │   │   ├── pages/         # 頁面元件
│   │   │   ├── components/    # 共用元件 (common/, layout/, task/, gantt/)
│   │   │   ├── stores/        # Pinia stores
│   │   │   ├── services/      # API service layer
│   │   │   ├── composables/   # Vue composables
│   │   │   ├── constants/     # 常數定義
│   │   │   ├── mocks/         # Mock 資料 (VITE_USE_MOCK=true)
│   │   │   └── assets/        # 靜態資源
│   │   └── package.json
│   │
│   ├── backend/           # Express.js 後端 API (開發中)
│   │   ├── prisma/
│   │   └── src/
│   │
│   └── shared/
│       └── types/         # 前後端共用 TypeScript 類型
│
├── backend/               # 後端 API 服務 (已部署)
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/        # 環境設定
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中間件 (auth, rate-limit, CORS)
│   │   ├── routes/        # 路由
│   │   ├── services/      # 業務邏輯
│   │   └── index.ts
│   └── Dockerfile
│
├── .github/workflows/     # CI/CD
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 快速開始

### 前置需求

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose (可選)

### 安裝

```bash
# 安裝依賴
pnpm install

# 啟動前端開發伺服器
cd packages/frontend
pnpm dev
```

### 環境變數

複製 `.env.example` 並填入必要設定：

```bash
cp .env.example .env
```

必要變數：

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `JWT_SECRET` | JWT 簽章金鑰 |
| `SLACK_CLIENT_ID` | Slack App Client ID |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret |
| `SLACK_BOT_TOKEN` | Slack Bot Token (`xoxb-`) |

## API 端點

### 認證
- `POST /api/auth/slack` — Slack OAuth 登入
- `GET /api/auth/me` — 取得當前使用者

### 任務管理
- `GET /api/projects/:projectId/tasks` — 取得專案任務
- `POST /api/projects/:projectId/tasks` — 建立任務 (PM/Admin)
- `GET /api/tasks/my` — 取得我的任務

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
- JWT Token 認證
- AES-256-GCM 加密敏感資料
- 生產環境強制設定 JWT_SECRET

## License

MIT
