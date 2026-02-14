# ProgressHub 全面審計修復報告 (2026-02-14)

## 概述

對 ProgressHub 專案進行全面審計，涵蓋前端（117 個 TS/Vue 檔案）、後端（API/Service/Auth）、資料庫與基礎設施。共修改 23 個檔案（+898/-225 行），修復 18 個問題。

Commit: `8adbf5c` on `main`

## 批次一：CRITICAL + HIGH

| 編號 | 問題 | 修復方式 |
|------|------|---------|
| C1 | DepartmentStore `departmentOptions` 非響應式 | 改為 `computed()` |
| C3 | UserManagementPage 未支援 Dark Mode | 17 處 hardcoded 顏色改用 CSS 變數 |
| H1 | 後端 17 處 console.log | 替換為 winston logger |
| H2 | MyTasksPage 硬編碼 Mock 備註 | 從 progressLogStore 動態取得 |
| H3 | WorkloadPage `as any` 型別轉換 | 定義 BadgeVariant 型別，消除 as any |

## 批次二：HIGH 安全性

| 編號 | 問題 | 修復方式 |
|------|------|---------|
| C2 | Slack OAuth 缺少 State 驗證 | 新增 CSRF state 產生/驗證（crypto.randomBytes，10 分鐘 TTL，一次性使用） |
| H4 | 後端角色權限控制過於粗糙 | 新增 `authorizeTaskAccess`（creator/assignee/collaborator）和 `authorizeSelfOrAdmin` |
| H5 | JWT 缺少 Refresh 機制 | Access Token 2h + Refresh Token 7d，含 token rotation 和主動撤銷 |
| H6 | Docker Compose 未傳遞敏感環境變數 | 補齊 JWT_SECRET、SLACK_* 等必要變數 |

## 批次三：MEDIUM

| 編號 | 問題 | 修復方式 |
|------|------|---------|
| M1 | functionTags 無 enum 驗證 | taskService 加入白名單驗證 |
| M2 | dependencies 無外鍵約束 | service 層驗證所有 dependency ID 存在 |
| M3 | 專案刪除未檢查關聯任務 | deleteProject 檢查進行中任務，有則拒絕 |
| M5 | Store 初始化無顯式 fetch | MainLayout onMounted 呼叫 fetchProjects/fetchEmployees/fetchTasks |
| M6 | 後端缺少 XSS 防護 | 自建 sanitizeHtml utility + sanitizeBody middleware（無外部套件） |
| M8 | 缺少工時追蹤 Seed 資料 | 新增 TimeCategory/TimeEntry/TimeEstimate seed |
| M9 | 後端 Prettier/TypeScript 版本落後 | prettier 3.1.1→3.8.1，typescript 5.3.3→5.4.2 |
| H7 | @typescript-eslint 主版本不一致 | backend v6.18.0→v7.1.1 與 frontend 對齊 |
| M10 | 缺少操作審計日誌 | auditLog middleware factory，記錄 DELETE/PUT/PATCH 敏感操作 |

## 新增檔案

- `backend/src/middleware/auditLog.ts` — 審計日誌 middleware
- `backend/src/middleware/sanitize.ts` — XSS sanitize middleware
- `backend/src/utils/sanitize.ts` — HTML 消毒 utility

## 未完成

- M7: Prisma Migration 檔案（需啟動 PostgreSQL 後執行 `npx prisma migrate dev --name init`）

## 驗證

- 後端 `tsc --noEmit` 通過
- 前端 `vue-tsc --noEmit` 通過
- pre-commit hooks（ESLint + Prettier）通過
