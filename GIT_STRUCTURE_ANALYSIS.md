# ProgressHub Git 結構分析與清理建議報告

> **報告日期**: 2026-02-05
> **目的**: 分析目前 Git 倉庫結構混亂問題，並提供清理建議

---

## 1. 問題概述

目前的 Git 倉庫中存在 **三套重複的前後端程式碼**，這會導致：
- 開發時容易修改到錯誤的檔案
- 部署時可能部署到錯誤的版本
- 維護成本大幅增加
- 新加入的開發者難以理解專案結構

---

## 2. 目前目錄結構分析

```
/progresshub/                          ← Git 倉庫根目錄
│
├── packages/                          ← 🟢 Monorepo 結構 (Zeabur 部署用)
│   ├── frontend/   (2,500+ 行)       ← ✅ Zeabur 前端部署來源
│   ├── backend/    (41 行)           ← ⚠️ 幾乎是空的骨架！
│   └── shared/                        ← 共用程式碼
│
├── frontend/       (舊版)             ← ❌ 未使用，包含廢棄的工時功能
├── backend/        (8,076 行)         ← ⚠️ 最完整的後端，但未被 Monorepo 使用
├── scheduler/                         ← ❌ 舊版排程器
│
└── progresshub/                       ← ❌ 巢狀重複的完整專案！
    ├── frontend/   (舊版)
    ├── backend/    (2,777 行)
    └── scheduler/
```

---

## 3. 三套程式碼詳細比較

### 3.1 Frontend 比較

| 位置 | 狀態 | Zeabur 使用 | 特點 |
|-----|------|------------|------|
| `packages/frontend/` | **最新版** | ✅ 是 | 無工時功能、有任務池、角色權限 |
| `frontend/` | 舊版 | ❌ 否 | 包含工時填報、工時審核等廢棄功能 |
| `progresshub/frontend/` | 舊版 | ❌ 否 | 類似根目錄 frontend，但有些差異 |

### 3.2 Backend 比較

| 位置 | 程式碼行數 | 完整度 | 問題 |
|-----|-----------|-------|------|
| `packages/backend/` | **41 行** | 🔴 空骨架 | 幾乎沒有實作！ |
| `backend/` | **8,076 行** | 🟢 最完整 | 有完整的 routes, services, prisma |
| `progresshub/backend/` | **2,777 行** | 🟡 中等 | 舊版，功能不完整 |

### 3.3 關鍵發現

```
⚠️ 嚴重問題：

   Zeabur 前端使用 packages/frontend/ ✓
   Zeabur 後端應該使用 packages/backend/
   但 packages/backend/ 只有 41 行程式碼！

   真正完整的後端在 /backend/ (8,076 行)
```

---

## 4. 對後端部署的影響

### 4.1 目前風險

如果您按照目前的 Monorepo 結構部署後端到 Zeabur：

| 情境 | 結果 |
|-----|------|
| 部署 `packages/backend/` | ❌ 失敗 - 幾乎沒有程式碼 |
| 部署 `/backend/` | ⚠️ 可行但不一致 - 不在 Monorepo 結構中 |

### 4.2 API 路徑不一致風險

```
packages/frontend/ 呼叫的 API:
├── /api/auth/*
├── /api/tasks/*
├── /api/projects/*
└── 期望的後端結構...

/backend/ 提供的 API:
├── /api/auth/*          ✓ 存在
├── /api/tasks/*         ✓ 存在
├── /api/projects/*      ✓ 存在
├── /api/timesheet/*     ⚠️ 存在但前端不需要
└── /api/gantt/*         ❓ 需確認

packages/backend/ 提供的 API:
└── 幾乎沒有實作...
```

---

## 5. 建議清理方案

### 方案 A：整合到 Monorepo（推薦）

將 `/backend/` 的程式碼遷移到 `packages/backend/`，維持 Monorepo 結構。

**優點**：
- 前後端在同一個結構下，部署一致
- pnpm workspace 可以管理共用依賴
- 未來可以輕鬆新增其他 packages

**步驟**：

```bash
# 1. 備份現有 packages/backend
mv packages/backend packages/backend.bak

# 2. 複製完整的 backend 到 packages/
cp -r backend packages/backend

# 3. 調整 package.json 的 name 為 "backend"
# 4. 確保 pnpm-workspace.yaml 包含 packages/*
# 5. 刪除舊的空骨架
rm -rf packages/backend.bak

# 6. 刪除根目錄的重複程式碼
rm -rf backend/
rm -rf frontend/
rm -rf progresshub/
rm -rf scheduler/
```

**最終結構**：
```
/progresshub/
├── packages/
│   ├── frontend/     ← Zeabur 前端
│   ├── backend/      ← Zeabur 後端 (從 /backend/ 遷移)
│   └── shared/       ← 共用程式碼
├── pnpm-workspace.yaml
├── package.json
└── docs/
```

---

### 方案 B：放棄 Monorepo，使用獨立目錄

如果不想維護 Monorepo 結構，可以簡化為傳統結構。

**步驟**：

```bash
# 1. 刪除 packages/ 目錄
rm -rf packages/

# 2. 保留根目錄的 frontend 和 backend
# 3. 將 packages/frontend 的內容合併到 frontend/
# 4. 刪除巢狀的 progresshub/ 目錄
rm -rf progresshub/

# 5. 更新 Zeabur 配置指向新位置
```

**最終結構**：
```
/progresshub/
├── frontend/         ← Zeabur 前端
├── backend/          ← Zeabur 後端
├── scheduler/        ← 排程服務
└── docs/
```

---

## 6. 推薦方案：方案 A (Monorepo)

### 6.1 理由

1. **Zeabur 已經配置使用 `packages/frontend/`**
   - 不需要改變前端部署設定
   - 只需要填充 `packages/backend/`

2. **Monorepo 的優勢**
   - 共用 TypeScript 類型定義 (`packages/shared/`)
   - 統一的依賴管理
   - 方便的本地開發體驗

3. **最小變動原則**
   - 前端不需要改動
   - 後端只需要遷移位置

### 6.2 詳細執行計畫

#### Phase 1：準備工作（預計 30 分鐘）

```bash
# 1. 建立新分支進行清理
git checkout -b cleanup/monorepo-structure

# 2. 確認 packages/frontend 是最新版本
# (已確認，這是 Zeabur 部署的版本)

# 3. 備份現有結構
mkdir -p .backup
cp -r backend .backup/
cp -r packages/backend .backup/packages-backend
```

#### Phase 2：遷移後端（預計 1 小時）

```bash
# 1. 刪除空的 packages/backend
rm -rf packages/backend

# 2. 複製完整後端到 packages/
cp -r backend packages/backend

# 3. 更新 packages/backend/package.json
#    - name: "backend" (不變)
#    - 確認 scripts 正確

# 4. 處理 Prisma
#    - 確保 prisma/ 目錄存在
#    - 更新 schema.prisma 路徑如有需要
```

#### Phase 3：清理重複程式碼（預計 30 分鐘）

```bash
# 1. 刪除根目錄的重複程式碼
rm -rf backend/
rm -rf frontend/
rm -rf scheduler/

# 2. 刪除巢狀的 progresshub/ 目錄
rm -rf progresshub/

# 3. 清理不需要的文件
rm -f docker-compose.yml  # 如果有獨立的 compose 檔案
```

#### Phase 4：更新配置（預計 30 分鐘）

```bash
# 1. 更新根目錄 package.json
#    - 確保 scripts 指向正確位置

# 2. 更新 .github/workflows/ci.yml
#    - 調整 backend 的路徑

# 3. 更新 CLAUDE.md 文件
#    - 反映新的專案結構

# 4. 建立 packages/backend/Dockerfile
#    - 從 /backend/Dockerfile 複製並調整

# 5. 建立 packages/backend/zeabur.json
```

#### Phase 5：測試與驗證（預計 1 小時）

```bash
# 1. 本地測試
cd packages/frontend && pnpm build
cd packages/backend && pnpm build

# 2. 測試 Prisma
cd packages/backend && npx prisma generate

# 3. 提交變更
git add .
git commit -m "refactor: 整合專案結構為 Monorepo，清理重複程式碼"

# 4. 推送並測試 Zeabur 部署
git push origin cleanup/monorepo-structure
```

---

## 7. 需要刪除的檔案清單

### 確定刪除

| 路徑 | 原因 |
|-----|------|
| `/frontend/` | 舊版前端，包含廢棄的工時功能 |
| `/backend/` | 遷移到 packages/backend 後刪除 |
| `/scheduler/` | 如不需要，刪除；或遷移到 packages/ |
| `/progresshub/` | 完全重複的巢狀專案 |

### 保留

| 路徑 | 原因 |
|-----|------|
| `/packages/frontend/` | Zeabur 前端部署來源 |
| `/packages/backend/` | 遷移後的完整後端 |
| `/packages/shared/` | 共用程式碼 |
| `/.github/` | CI/CD 配置 |
| `/docs/` | 文件 |
| `CLAUDE.md`, `README.md` | 專案說明 |

---

## 8. Zeabur 部署配置建議

### 8.1 前端服務（已配置）

```
Root Directory: /
Dockerfile: (使用您提供的 Dockerfile)
Build Output: /src/packages/frontend/dist
```

### 8.2 後端服務（需新增/調整）

```
Root Directory: /packages/backend
Dockerfile: packages/backend/Dockerfile

# packages/backend/Dockerfile 範例
FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 8.3 環境變數

```
# 後端需要的環境變數
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-secret
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
CORS_ORIGINS=https://progresshub.zeabur.app
```

---

## 9. 清理前後對照

### 清理前

```
/progresshub/ (28 個目錄, 500+ 檔案)
├── packages/
│   ├── frontend/    ← 使用中
│   ├── backend/     ← 空的
│   └── shared/
├── frontend/        ← 重複！
├── backend/         ← 重複！
├── scheduler/       ← 重複！
└── progresshub/     ← 完全重複！
    ├── frontend/
    ├── backend/
    └── scheduler/
```

### 清理後

```
/progresshub/ (6 個目錄, ~200 檔案)
├── packages/
│   ├── frontend/    ← Zeabur 前端
│   ├── backend/     ← Zeabur 後端 (完整)
│   └── shared/      ← 共用類型
├── docs/
├── .github/
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

**預計減少**: ~60% 的檔案數量和程式碼重複

---

## 10. 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|-----|------|------|---------|
| 刪除錯誤檔案 | 低 | 高 | 先備份，使用新分支 |
| Zeabur 部署失敗 | 中 | 中 | 在新分支測試後再合併 |
| API 路徑不一致 | 中 | 中 | 遷移後仔細檢查 routes |
| Prisma 配置問題 | 中 | 中 | 確保 schema 路徑正確 |

---

## 11. 結論與下一步

### 立即行動

1. **確認**您要採用方案 A (Monorepo) 還是方案 B (獨立目錄)
2. **建立新分支**進行清理工作
3. **備份**現有程式碼

### 建議順序

1. ✅ 先完成前端假頁面測試（目前狀態）
2. 🔄 整理 Git 結構（本報告建議）
3. 📦 遷移後端程式碼到 packages/backend
4. 🚀 部署後端到 Zeabur
5. 🔗 開始前後端整合開發

---

**是否需要我協助執行清理工作？請確認您選擇的方案。**
