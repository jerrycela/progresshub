# ProgressHub 專案結構審查報告 (v2)

**審查日期**: 2026-02-08
**審查方法**: 完整原始碼逐行審閱（所有 route, service, store, composable, config, test, DevOps 檔案）
**總分**: 6.23 / 10

---

## 評分總表

| 面向 | 分數 | 權重 | 加權分 |
|------|------|------|--------|
| 架構設計 | 7.5 | 15% | 1.125 |
| 型別安全與一致性 | 4.5 | 15% | 0.675 |
| 安全性 | 6.5 | 12% | 0.780 |
| 後端程式碼品質 | 7.0 | 12% | 0.840 |
| 前端程式碼品質 | 6.0 | 12% | 0.720 |
| 資料庫設計 | 7.0 | 8% | 0.560 |
| 測試 | 5.0 | 10% | 0.500 |
| DevOps / CI/CD | 6.5 | 8% | 0.520 |
| 程式碼品質與可維護性 | 6.5 | 5% | 0.325 |
| 文檔 | 6.0 | 3% | 0.180 |
| **總計** | | **100%** | **6.23** |

---

## 一、架構設計 — 7.5 / 10

**優點**: pnpm monorepo 清晰、後端 routes→services→Prisma 分層、GitLab 模組化、Health check 三端點（liveness/readiness/live）
**問題**: docker-compose 路徑錯誤、Scheduler 定位模糊、無 API 版本控制、部分 route 繞過 service 層直接操作 Prisma

## 二、型別安全與一致性 — 4.5 / 10

**核心問題**: Prisma schema 與 shared types 是兩套完全不同的 domain model
- TaskStatus: 3 種 vs 6 種
- 角色: EMPLOYEE vs MEMBER
- 欄位名: name vs title, assignedToId vs assigneeId
- 專案狀態: PAUSED vs ON_HOLD
- ErrorCode 重複定義兩套
- API response 格式三種不同

## 三、安全性 — 6.5 / 10

**優點**: Helmet、CORS fail-secure、Rate limiting、JWT 生產環境強制驗證、AES-256-GCM 加密
**問題**: Auth 端點可偽造身份、Slack 簽名驗證有 raw body bug、加密 salt 硬編碼、JWT 存 localStorage

## 四、後端品質 — 7.0 / 10

**優點**: TimeEntry 業務規則完整、ProgressService 有 transaction、express-validator 完整驗證、error handler 層次分明
**問題**: console.error 與 Winston 混用、route catch 吞掉全域 error handler、service 功能重複（taskService vs progressService）、batch 操作無 transaction

## 五、前端品質 — 6.0 / 10

**優點**: API client 設計專業、樂觀更新有 rollback、細粒度 loading、Composition API 風格統一
**問題**: 整個前端 100% mock 運行、API client 是死碼、SVG inline 難維護、computed factory 可能 memory leak

## 六、資料庫設計 — 7.0 / 10

**優點**: UUID 主鍵、完整 index、複合唯一約束、snake_case mapping
**問題**: String[] 取代 join table、無 soft delete、Task 缺少 description/priority 欄位（與 shared types 不符）

## 七、測試 — 5.0 / 10

**後端**: 僅 11 個 test cases（2 個 test 檔案），10 個 route + 8 個 service 無測試
**前端**: 8 個 spec 檔案但都測 mock 行為
**E2E**: 有 Playwright config 無實際 test

## 八、DevOps — 6.5 / 10

**優點**: CI 4 job、frozen-lockfile、multi-stage Dockerfile、HEALTHCHECK
**問題**: docker-compose 路徑錯、Dockerfile 用 npm 但專案用 pnpm、無 CD 流程、前端無 Dockerfile

## 九、程式碼品質 — 6.5 / 10

**優點**: 中文註解、Issue reference、strict TS、graceful shutdown
**問題**: Ralph Loop 標註殘留、中英文混雜、route handler 冗余 try/catch 模式

## 十、文檔 — 6.0 / 10

**有**: README、Release notes、Swagger、docs/ feature specs
**缺**: ADR、Contributing Guide、Migration 文檔、API 範例

---

## Top 5 優先建議

1. **統一前後端資料模型** — Prisma schema 為 source of truth，同步 shared types
2. **完成前後端整合** — Store actions 呼叫已建好的 API client 取代 mock
3. **修復 Auth 端點** — 實作真正的 Slack OAuth code exchange
4. **錯誤流經全域 handler** — Route handler 用 next(error) 取代自行 catch
5. **補齊後端測試** — 核心 services 和 routes 需要 unit + integration test
