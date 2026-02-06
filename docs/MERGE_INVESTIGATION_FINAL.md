# ProgressHub 合併問題調查與解決方案

> **報告日期**: 2026-02-06
> **調查分支**: `claude/investigate-merge-errors-bOmcJ`
> **主要工作分支**: `claude/enable-plan-mode-1HAyD`

---

## 一、問題描述

將開發分支合併到 `main` 時反覆失敗。本報告整合了以下資料來源：

- 本次 Git 歷史追溯分析
- `1HAyD` 分支上的三份清理報告（`GIT_STRUCTURE_ANALYSIS.md`、`GIT_CLEANUP_FINAL_ASSESSMENT.md`、`docs/GIT_CLEANUP_SUMMARY.md`）
- `main` 分支上的 4 個 CI 修復 commit

---

## 二、根本原因（3 層）

### 第 1 層：CI 配置指向錯誤路徑（直接原因）

`.github/workflows/ci.yml` 在合併 commit `d5124ea` 中首次被引入，從一開始就指向舊版 `backend/` 目錄。

| CI 步驟 | 錯誤路徑 | 正確路徑 |
|---------|----------|----------|
| cache-dependency-path | `backend/package-lock.json` | `packages/backend/package-lock.json` |
| npm install | `cd backend && npm ci` | `cd packages/backend && npm install` |
| prisma generate | `cd backend && npx prisma generate` | `cd packages/backend && ./node_modules/.bin/prisma generate` |
| tsc --noEmit | `cd backend && npx tsc --noEmit` | `cd packages/backend && ./node_modules/.bin/tsc --noEmit` |
| scheduler build | `cd scheduler && npm ci` | **已移除**（目錄不存在） |

其中 `cd scheduler && npm ci` 指向不存在的目錄，**每次必定失敗**。

### 第 2 層：倉庫目錄結構混亂（結構原因）

倉庫中同時存在三套前後端程式碼：

```
progresshub/                          ← Git 根目錄
├── backend/          (8,076 行)      ← 舊版後端（最完整但未被 monorepo 管理）
├── frontend/                         ← 舊版前端（含廢棄工時功能）
├── progresshub/                      ← 巢狀重複的完整專案副本
│   ├── backend/      (2,777 行)
│   ├── frontend/
│   └── scheduler/
├── scheduler/                        ← 舊版排程器
└── packages/                         ← Monorepo 結構（pnpm workspace）
    ├── frontend/     (2,500+ 行)     ← ⭐ Zeabur 前端部署來源
    ├── backend/                      ← ⭐ Phase 1-6 新後端（已填充）
    └── shared/                       ← 共用類型定義
```

**只有 `packages/` 是正確的開發目錄**，其餘都是歷史遺留。

### 第 3 層：歷史合併引入大量無關檔案（歷史原因）

`review-progresshub-BeaSN` 分支的根 commit `a159e3a` 是一個合併 commit，其父 commit `cc7e39e` 追溯到 `openclawfortest` 倉庫的完整歷史（57+ commits）。當這個分支被合併回 main（commit `d5124ea`）時，引入了 **215 個檔案、+54,977 行**的變更。

---

## 三、已完成的修復

### 3.1 main 上的 CI 修復（4 個 commit）

| Commit | 修改內容 | 解決的問題 |
|--------|----------|-----------|
| `2ac75e9` | `backend/` → `packages/backend/`，移除 scheduler 和 ESLint | 路徑錯誤、不存在的 scheduler |
| `fbe18b0` | `npx prisma` → `./node_modules/.bin/prisma` | npx 全局查找失敗 |
| `86fa283` | `npm ci` → `npm ci --include=dev` | devDependencies 未安裝 |
| `3cee471` | `npm ci --include=dev` → `npm install`，移除 Slack 環境變數 | npm ci 嚴格模式問題 |

### 3.2 1HAyD 分支的目錄清理（commit `f2d228e`）

已刪除 114 個檔案、26,884 行程式碼：
- `/progresshub/` — 巢狀重複專案
- `/frontend/` — 舊版前端
- `/scheduler/` — 舊版排程器
- 保留 `/backend/` 作為參考（待遷移到 `packages/backend/`）

### 3.3 1HAyD 的 Phase 1-6 後端開發

`packages/backend/` 從原本的 41 行空骨架，已填充為完整的後端 API（Phase 1-6）。

---

## 四、目前分支狀態

```
origin/main (3cee471)
  ├── CI 修復 ✅
  ├── 目錄清理 ❌（仍有 frontend/, progresshub/, scheduler/）
  └── Phase 1-6 後端 ❌

claude/enable-plan-mode-1HAyD (67b5668 → 本地已 fast-forward 到 3cee471)
  ├── CI 修復 ✅（已合併 main，但尚未推送到遠端）
  ├── 目錄清理 ✅（已刪除 frontend/, progresshub/, scheduler/）
  └── Phase 1-6 後端 ✅

claude/investigate-merge-errors-bOmcJ (f2b66d9)
  ├── CI 修復 ✅（已合併 main）
  ├── 分析報告 ✅
  └── 其餘同 1HAyD 的 67b5668 狀態
```

### 關鍵問題

`1HAyD` 分支本地已合併 main（fast-forward 到 `3cee471`），但因 session 權限限制無法推送到遠端。遠端的 `1HAyD` 仍停在 `67b5668`。

---

## 五、待執行的操作

### 步驟 1：推送 1HAyD（需你手動執行）

```bash
# 在你的本地環境執行
git checkout claude/enable-plan-mode-1HAyD
git fetch origin main
git merge origin/main    # fast-forward，無衝突
git push origin claude/enable-plan-mode-1HAyD
```

### 步驟 2：驗證 CI 通過

推送後確認：
```bash
# CI 配置驗證
grep -c "packages/backend" .github/workflows/ci.yml   # 應為 13
grep -c "cd backend &&" .github/workflows/ci.yml      # 應為 0
grep -c "scheduler" .github/workflows/ci.yml          # 應為 0
```

### 步驟 3：從 1HAyD 發 PR 到 main

```bash
# 建立 PR
gh pr create \
  --base main \
  --head claude/enable-plan-mode-1HAyD \
  --title "feat: Phase 1-6 後端 API + 目錄結構清理" \
  --body "## 變更內容
- Phase 1-6 後端 API 完整實作（packages/backend/）
- 清理歷史遺留的重複目錄（frontend/, progresshub/, scheduler/）
- 前端 UI 優化（甘特圖、按鈕系統、任務池）
- 多份技術文件和審計報告"
```

### 步驟 4（選做）：清理根目錄的 /backend/

`1HAyD` 目前保留了 `/backend/`（8,076 行舊版後端）作為參考。
`packages/backend/` 已有完整的 Phase 1-6 後端。

如果確認不再需要，可以刪除：
```bash
git rm -rf backend/
git commit -m "chore: 移除舊版 backend/，已遷移到 packages/backend/"
```

---

## 六、風險矩陣

| 問題 | 嚴重度 | 狀態 |
|------|--------|------|
| CI 指向錯誤路徑 | 🔴 Critical | ✅ main 已修復，1HAyD 本地已同步 |
| scheduler 建構失敗 | 🔴 Critical | ✅ 已從 CI 移除 |
| 三套目錄結構混亂 | 🟡 High | ⚠️ 1HAyD 已清理，main 未同步 |
| 套件管理器不一致（npm vs pnpm） | 🟡 High | ⚠️ CI 用 npm，workspace 用 pnpm |
| `/backend/` 舊版程式碼殘留 | 🟠 Medium | ⚠️ 1HAyD 保留中，可選擇刪除 |

---

## 七、長期建議

| 優先級 | 動作 | 說明 |
|--------|------|------|
| P0 | 推送 1HAyD + 發 PR 到 main | 同步所有修復到 main |
| P1 | 刪除 `/backend/` 舊版目錄 | `packages/backend/` 已完整，不再需要 |
| P2 | CI 改用 pnpm | 與 `pnpm-workspace.yaml` 一致 |
| P3 | 評估是否重建乾淨倉庫 | 徹底消除歷史污染 |

---

## 八、參考文件

| 文件 | 位置（1HAyD 分支） | 內容 |
|------|---------------------|------|
| Git 結構分析報告 | `GIT_STRUCTURE_ANALYSIS.md` | 三套程式碼的詳細比較 |
| Git 清理最終評估（30 次迭代） | `GIT_CLEANUP_FINAL_ASSESSMENT.md` | 清理安全性驗證 |
| Git 清理執行報告 | `docs/GIT_CLEANUP_SUMMARY.md` | 清理操作記錄 |
| 合併錯誤分析報告 | `MERGE_ERROR_ANALYSIS_REPORT.md` | 本次調查的詳細分析 |
