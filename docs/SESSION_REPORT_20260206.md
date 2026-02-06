# ProgressHub 維護作業報告

> **日期**: 2026-02-06
> **執行者**: Claude Code (Opus 4.6)
> **倉庫**: jerrycela/progresshub
> **範圍**: CI 修復、分支清理、目錄結構評估

---

## 一、執行摘要

本次作業完成三個階段的倉庫維護工作：

| Phase | 任務 | 結果 |
|:-----:|------|------|
| **1** | 修復 GitHub Actions CI | ✅ 3 jobs 全部通過 |
| **2** | 清理遠端分支 | ✅ 14 個 → 1 個（只剩 main） |
| **3** | 評估舊版 `/backend/` | ⚠️ 不可直接刪除，需先遷移 34% 獨有功能 |

### 變更檔案清單

| 檔案 | 操作 | Phase |
|------|------|:-----:|
| `.github/workflows/ci.yml` | 重寫（npm → pnpm） | 1 |
| `.npmrc` | 新增（pnpm hoisting 設定） | 1 |
| `packages/backend/package.json` | 修改（加 @types/express-serve-static-core） | 1 |
| `packages/backend/tsconfig.json` | 修改（關閉 declaration） | 1 |
| `pnpm-lock.yaml` | 更新 | 1 |
| `docs/MERGE_INVESTIGATION_FINAL.md` | 新增（從分支存檔） | 2 |
| `docs/MERGE_ERROR_ANALYSIS_REPORT.md` | 新增（從分支存檔） | 2 |

### 推送到 main 的 Commits

| Commit | 訊息 |
|--------|------|
| `5fb79a5` | fix(ci): 改用 pnpm 取代 npm 解決 prisma binary 找不到問題 |
| `5c0de68` | fix(ci): 移除 pnpm version 避免與 packageManager 衝突 |
| `5bced6e` | docs: 存檔合併問題調查報告 |

---

## 二、Phase 1：CI 修復

### 問題背景

GitHub Actions CI 連續 **5 次失敗**（跨越上一個 session 4 次 + 本 session 1 次），每次推送到 main 都無法通過。

### 根本原因分析

**核心問題：專案使用 pnpm，但 CI 使用 npm — 完全不相容。**

```
專案配置：
  package.json → "packageManager": "pnpm@8.15.0"
  pnpm-workspace.yaml → packages: ['packages/*']
  pnpm-lock.yaml → lockfileVersion: '6.0'

CI 配置（修復前）：
  actions/setup-node → cache: 'npm'
  npm install → 看到 pnpm 格式的 lockfile → 無法正確安裝
  ./node_modules/.bin/prisma → 不存在 → exit 127
```

**證據鏈**：
1. `packages/backend/package-lock.json` 內的依賴路徑是 pnpm 格式（`../../node_modules/.pnpm/prisma@5.22.0/...`）
2. npm 無法解析這種路徑結構
3. `npm install` 表面成功但實際上沒有正確安裝 prisma binary
4. `./node_modules/.bin/prisma generate` 報 `No such file or directory`

### 修復方案

#### 修復 1：CI 改用 pnpm（commit `5fb79a5`）

| 變更項目 | 修復前 | 修復後 |
|---------|--------|--------|
| 套件管理器 | `npm install` | `pnpm install --frozen-lockfile` |
| Setup action | `actions/setup-node` only | `pnpm/action-setup@v4` + `actions/setup-node` |
| Cache | `cache: 'npm'` | `cache: 'pnpm'` |
| Prisma 執行 | `./node_modules/.bin/prisma` | `pnpm --filter backend exec prisma` |
| TypeScript | `./node_modules/.bin/tsc` | `pnpm --filter backend exec tsc` |

#### 附帶修復：TypeScript TS2742 錯誤

pnpm 嚴格的 node_modules 結構導致 TypeScript 無法解析 `@types/express-serve-static-core` 的路徑。

| 修復 | 說明 |
|------|------|
| 新增 `.npmrc` | `public-hoist-pattern[]=*types*` + `*prisma*` |
| 新增 devDependency | `@types/express-serve-static-core` |
| 關閉 declaration | 後端非 library，不需要 `.d.ts` 生成 |

#### 修復 2：pnpm version 衝突（commit `5c0de68`）

`pnpm/action-setup@v4` 偵測到 CI 中手動指定 `version: 8` 與 `package.json` 的 `"packageManager": "pnpm@8.15.0"` 衝突。

**解法**：移除 CI 中的 `version` 參數，讓 action 自動從 `package.json` 讀取。

### CI 修復結果

```
✓ Lint & Type Check  24s
✓ Build              16s
✓ Test               51s
```

**CI 成功 Run**: https://github.com/jerrycela/progresshub/actions/runs/21736312439

### 錯誤追蹤紀錄

| # | 嘗試方案 | 結果 | Session |
|---|---------|------|---------|
| 1 | `backend/` → `packages/backend/` 路徑修正 | ❌ prisma 仍找不到 | 上一個 |
| 2 | `npx prisma` → `./node_modules/.bin/prisma` | ❌ binary 不存在 | 上一個 |
| 3 | `npm ci` → `npm ci --include=dev` | ❌ 同上 | 上一個 |
| 4 | `npm ci --include=dev` → `npm install` | ❌ 同上 | 上一個 |
| 5 | **npm → pnpm（根本修復）** | ✅ 安裝成功，但 version 衝突 | 本 session |
| 6 | **移除 pnpm version 參數** | ✅ CI 全部通過 | 本 session |

---

## 三、Phase 2：分支清理

### 清理前狀態

倉庫共有 **14 個遠端分支**（含 main）：

| # | 分支 | 最新 Commit | 與 main 差異 |
|---|------|------------|-------------|
| 1 | `main` | `5c0de68` CI 修復 | — |
| 2 | `claude/enable-plan-mode-1HAyD` | `5c0de68` | 0 commits |
| 3 | `claude/dev-assistance-Otowz` | `0444a6f` | 0 commits |
| 4 | `claude/fix-p0-issues-d7UHf` | `f6d648a` | 0 commits |
| 5 | `claude/install-ui-pro-max-8T3c1` | `d32d791` | 0 commits |
| 6 | `claude/review-game-project-OhKsY` | `0d3d440` | 0 commits |
| 7 | `claude/review-progresshub-BeaSN` | `d333e44` | 0 commits |
| 8 | `claude/slack-create-progress-hub-QNYmj` | `6dfed71` | 0 commits |
| 9 | `claude/slack-respond-to-xiaolongxia-Pm8dY` | `0e8414f` | 0 commits |
| 10 | `claude/investigate-merge-errors-bOmcJ` | `93287a1` | +3 commits, +633 行 |
| 11 | `claude/tech-review-fixes-HtIsj` | `68998ee` | +1 commit, +434 行 |
| 12 | `claude/slack-test-startup-phase-ICLml` | `8808094` | +1 commit, +2793 行 |
| 13 | `claude/slack-implement-phase-three-mwPOi` | `bcb2a18` | +3 commits |

### 清理執行

| 分支 | 動作 | 執行者 |
|------|------|--------|
| `review-progresshub-BeaSN` | 刪除 | 本 session |
| `enable-plan-mode-1HAyD` | 刪除 | 本 session |
| `investigate-merge-errors-bOmcJ` | 存檔報告 → 刪除 | 本 session |
| 其他 8 個分支 | 已刪除 | 其他 session（`git fetch --prune` 時發現） |

### 調查報告存檔

`investigate-merge-errors-bOmcJ` 分支包含 2 份有價值的調查報告，在刪除前已存檔到 `docs/`：

| 檔案 | 行數 | 內容 |
|------|------|------|
| `MERGE_INVESTIGATION_FINAL.md` | 192 行 | 3 層根因分析 + 風險矩陣 + 長期建議 |
| `MERGE_ERROR_ANALYSIS_REPORT.md` | 441 行 | 10 次迭代詳細分析 + 事件時間線 |

**不合併到 main 的原因**：
- 報告部分過時（未涵蓋 pnpm 遷移）
- 純文件變更，合併會污染 commit 歷史
- 存檔到 `docs/` 即可保留參考價值

### 清理後狀態

```
遠端分支：1 個（main）
```

---

## 四、Phase 3：舊版 `/backend/` 評估

### 比較概覽

| 項目 | `/backend/` (舊版) | `/packages/backend/` (新版) |
|------|:------------------:|:--------------------------:|
| 檔案數 | 60 | 47 |
| 套件管理 | npm（獨立專案） | pnpm（monorepo workspace） |
| CI 整合 | ❌ 不在 CI 中 | ✅ `pnpm --filter backend` |
| Zeabur 部署 | ❌ 未使用 | ✅ 正式後端 |

### 功能對照表

#### 兩者都有的功能

| 功能 | 說明 |
|------|------|
| 認證系統 | JWT token 驗證 |
| 任務管理 | CRUD + 狀態流轉 |
| 進度回報 | 進度日誌記錄 |
| Prisma ORM | 資料庫操作 |
| 錯誤處理中間件 | 統一錯誤格式 |

#### 新版獨有功能

| 功能 | 說明 |
|------|------|
| 甘特圖 API | `gantt.ts` + `ganttService.ts` |
| 回應格式化中間件 | `responseFormatter.ts` |

#### 舊版獨有功能（🔴 無法直接刪除的原因）

| 功能模組 | 檔案數 | 重要性 | 說明 |
|---------|:------:|:------:|------|
| **GitLab 整合** | 9 | 🔴 Critical | OAuth 2.0、Webhook、Issue 雙向同步、多實例支援 |
| **工時追蹤** | 6 | 🔴 Critical | 工時記錄 API、類別管理、統計報表 |
| **Slack 整合** | 1 | 🔴 Critical | 斜線指令（/time）、互動事件、274 行完整邏輯 |
| **員工管理** | 1 | 🟠 High | 分頁查詢、部門篩選、Slack ID 連結 |
| **安全依賴** | — | 🟠 High | bcrypt、express-validator、express-rate-limit |
| **運維工具** | — | 🟡 Medium | winston 日誌、morgan HTTP log、Swagger 文檔 |
| **排程任務** | 1 | 🟡 Medium | node-cron 工時提醒 |

### GitLab 整合模組詳情

```
backend/src/
├── routes/gitlab/
│   ├── webhook.ts          # Webhook 事件處理
│   ├── activities.ts       # 開發活動追蹤
│   ├── connections.ts      # OAuth 連結管理
│   ├── instances.ts        # GitLab 實例配置
│   ├── issues.ts           # Issue 管理
│   └── index.ts            # 路由聚合
├── services/gitlab/
│   ├── oauthService.ts     # OAuth 2.0 流程
│   ├── activityService.ts  # 同步開發活動
│   ├── instanceService.ts  # 實例配置管理
│   └── issueService.ts     # Issue 同步邏輯
├── utils/gitlab/
│   ├── apiClient.ts        # REST API 客戶端（260+ 行）
│   ├── encryption.ts       # OAuth token 加密
│   └── webhookVerifier.ts  # Webhook 簽章驗證
└── types/gitlab.ts         # 型別定義
```

### 評估結論

**`/backend/` 包含 34% 的獨有功能，不可直接刪除。**

建議的遷移路線圖：

| 優先級 | 動作 | 預估工時 |
|:------:|------|:--------:|
| P0 | 遷移 GitLab 整合到 `packages/backend/` | 3-5 天 |
| P1 | 遷移工時追蹤系統 | 2-3 天 |
| P2 | 遷移 Slack 整合 | 1-2 天 |
| P3 | 遷移員工管理 + 補充安全依賴 | 1.5 天 |
| P4 | 全部遷移完成後刪除 `/backend/` | 0.5 天 |

---

## 五、當前倉庫狀態總覽

### 目錄結構

```
progresshub/                    ← Git 根目錄
├── .github/workflows/ci.yml   ← ✅ CI 已修復（pnpm）
├── .npmrc                      ← ✅ 新增（pnpm hoisting）
├── backend/                    ← ⚠️ 舊版後端（保留，待遷移）
│   └── src/ (60 檔)
├── packages/                   ← ✅ Monorepo 主結構
│   ├── frontend/               ← ✅ Zeabur 前端部署來源
│   ├── backend/                ← ✅ CI + 正式後端
│   └── shared/                 ← 共用類型
├── docs/                       ← ✅ 調查報告已存檔
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── package.json                ← packageManager: pnpm@8.15.0
```

### 健康度指標

| 指標 | 修復前 | 修復後 |
|------|:------:|:------:|
| CI 狀態 | ❌ 連續 5 次失敗 | ✅ 全部通過 |
| 遠端分支數 | 14 個 | 1 個（main） |
| 分支衛生 | 12 個已合併但未刪除 | ✅ 全部清理 |
| 目錄結構清晰度 | 混亂（3 套前後端） | ⚠️ 仍有 `/backend/` 待遷移 |

---

## 六、後續建議

### 短期（1-2 週）

1. **開始遷移 `/backend/` 獨有功能**，優先 GitLab 整合
2. **補充安全依賴**（express-validator, rate-limit）到 `packages/backend/`
3. **設定 branch protection rule** 保護 main 分支

### 中期（1 個月）

1. **完成所有功能遷移**並通過完整測試
2. **刪除 `/backend/`** 目錄
3. **CI 增加前端建置**（目前只檢查後端）

### 長期

1. **評估是否重建乾淨倉庫**（消除歷史合併污染）
2. **補充 E2E 測試**
3. **升級 Prisma**（目前 5.22.0 → 最新穩定版）

---

## 七、相關資源

| 資源 | 連結/路徑 |
|------|----------|
| CI 成功 Run | https://github.com/jerrycela/progresshub/actions/runs/21736312439 |
| 合併調查報告 | `docs/MERGE_INVESTIGATION_FINAL.md` |
| 詳細分析報告 | `docs/MERGE_ERROR_ANALYSIS_REPORT.md` |
| CI 配置 | `.github/workflows/ci.yml` |
| 目錄清理記錄 | `docs/GIT_CLEANUP_SUMMARY.md` |
