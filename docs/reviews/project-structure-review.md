# ProgressHub 專案結構審查報告

**審查日期**: 2026-02-07
**審查範圍**: 整體專案結構、架構設計、程式碼品質、安全性、測試、DevOps

---

## 專案概述

ProgressHub 是一個專案進度管理系統（認領制），技術棧為 Vue 3 + Express.js + PostgreSQL，採用 pnpm monorepo 架構，整合 Slack OAuth 認證與 GitLab 活動追蹤。

---

## 一、架構設計 (Architecture) — 7.5 / 10

**優點：**
- pnpm workspace monorepo 結構清晰，前後端分離得當
- `packages/shared/types` 實現前後端型別共享，概念正確
- 後端採用 Routes → Services → Prisma ORM 的分層架構，職責分離合理
- 前端 Pages → Stores (Pinia) → Services (Axios) → API 的分層清楚
- Composables 抽取了可複用邏輯（theme、toast、formValidation 等）

**問題：**
- docker-compose.yml 路徑與實際結構不匹配（frontend → `./frontend` vs `./packages/frontend`）
- 缺少 API 版本控制（`/api/` 無版本前綴）
- Scheduler 的定位模糊：既在 backend index.ts 整合，docker-compose 又定義獨立 service

---

## 二、型別安全與一致性 (Type Safety) — 5.5 / 10

**嚴重問題：**
- Shared types `TaskStatus` 有 6 種狀態，Prisma schema 只有 3 種，完全不同步
- `Role = 'MEMBER'` vs `PermissionLevel = EMPLOYEE`，命名不一致
- 錯誤碼在 `index.ts` 和 `api.ts` 有兩套不同的定義
- API 回應格式：後端 `{ error: string }` vs shared types `{ error: { code, message } }`

---

## 三、安全性 (Security) — 7.0 / 10

**優點：** Helmet、CORS 白名單、Rate limiting、JWT 驗證、Slack webhook HMAC 簽名
**問題：** express.json() 無 body size limit、JWT 7 天偏長、localStorage 存 token 有 XSS 風險

---

## 四、前端品質 (Frontend) — 6.5 / 10

**優點：** Vue 3 Composition API、Pinia composition style、lazy loading、完整 auth guard
**問題：** 仍使用 mock 硬編碼、前後端整合未完成、E2E 無實際測試案例

---

## 五、後端品質 (Backend) — 7.5 / 10

**優點：** Middleware stack 正確、Service layer 分離、錯誤處理完善、Graceful shutdown
**問題：** lint-staged 不跑 ESLint、測試覆蓋率門檻 50% 偏低、只有 2 個 test 檔案

---

## 六、資料庫設計 (Database) — 7.0 / 10

**優點：** UUID 主鍵、合理 index、完整的 enum 和關聯
**問題：** `dependencies`/`collaborators` 用 `String[]` 而非 join table、無 soft delete

---

## 七、DevOps / CI/CD — 7.0 / 10

**優點：** GitHub Actions 4 job 並行、frozen-lockfile、PostgreSQL health check
**問題：** docker-compose 路徑錯誤、無 CD 流程、無 Docker image tag 策略

---

## 八、程式碼品質 (Maintainability) — 7.0 / 10

**優點：** 中文註解、Issue number reference、一致命名慣例
**問題：** Ralph Loop 迭代標註不適合留在程式碼、中英文錯誤訊息混雜

---

## 九、文檔 (Documentation) — 6.0 / 10

**優點：** README 有架構說明、Swagger 自動文檔
**缺失：** 無 Contributing Guide、無 ADR、無 Deployment 指南

---

## 十、測試 (Testing) — 5.0 / 10

**優點：** 前端 166 個 Vitest 測試、CI 有 DB integration
**問題：** 後端只有 2 個 test 檔案、E2E 框架無測試案例、覆蓋率門檻過低

---

## 總評分：6.71 / 10

| 面向 | 分數 | 權重 | 加權分 |
|------|------|------|--------|
| 架構設計 | 7.5 | 15% | 1.13 |
| 型別安全與一致性 | 5.5 | 15% | 0.83 |
| 安全性 | 7.0 | 15% | 1.05 |
| 前端品質 | 6.5 | 10% | 0.65 |
| 後端品質 | 7.5 | 10% | 0.75 |
| 資料庫設計 | 7.0 | 10% | 0.70 |
| DevOps / CI/CD | 7.0 | 10% | 0.70 |
| 程式碼品質與可維護性 | 7.0 | 5% | 0.35 |
| 文檔 | 6.0 | 5% | 0.30 |
| 測試 | 5.0 | 5% | 0.25 |
| **總計** | | **100%** | **6.71** |

---

## 最關鍵的 3 個建議（優先處理）

1. **修復前後端型別斷裂**：Prisma schema 和 shared types 的 TaskStatus、Role 必須統一
2. **完成前後端整合**：移除 mock 硬編碼，建立正式的 API adapter 層
3. **補齊後端測試**：核心 service 和 API routes 需要 unit + integration test
