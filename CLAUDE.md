# ProgressHub - 專案指令

## 架構概述

- **Frontend**: `packages/frontend/` (Vue 3 + TypeScript + Tailwind CSS)
- **Backend**: `backend/` (Express + Prisma + PostgreSQL)
- **Shared Types**: `packages/shared/types/`
- **Mock Data**: `packages/frontend/src/mocks/`

## 認證架構

`createAuthService()` 在模組頂層執行一次，根據 `VITE_USE_MOCK` 決定 Mock 或 API 模式。

| 模式 | 條件 | 行為 |
|------|------|------|
| Mock 登入 | `VITE_USE_MOCK=true` | 直接使用 mock 資料，不需後端 |
| API 登入 | `VITE_USE_MOCK=false` | 呼叫後端 `POST /api/auth/dev-login`，需 `ENABLE_DEV_LOGIN=true` |
| Slack 登入 | 透過 service 層 | 依環境變數選擇 mock 或真實 API |
| Demo Token | `'demo-token'` | `initAuth()` 直接從 mock 恢復，不呼叫 API |

## 部署架構

- **Frontend**：Zeabur 靜態部署（Vue + Caddy）→ `progresshub.zeabur.app`
- **Backend**：Zeabur 容器部署（Express + Prisma）→ `progresshub-api.zeabur.app`
- **Database**：Zeabur PostgreSQL Marketplace
- **關鍵環境變數**：`ENABLE_DEV_LOGIN=true`（暫時方案，Slack OAuth 就緒後移除）

## 開發指令

```bash
# 前端開發
pnpm --filter frontend dev

# 型別檢查
pnpm --filter frontend exec vue-tsc --noEmit

# 前端測試
pnpm --filter frontend exec vitest run

# 後端測試
cd backend && npx jest --no-coverage

# 前端建置
pnpm --filter frontend build

# 後端開發
pnpm --filter backend dev
```

## 前端設計系統規範

- **表單元素**：所有 `<input>`、`<textarea>`、`<select>` 必須使用 `.input` class（定義於 `main.css`），禁止使用不存在的 `.input-field`
- **卡片容器**：使用 `.card` class，自動支援深色模式
- **文字顏色**：使用 CSS 變數 `var(--text-primary)`、`var(--text-secondary)`，禁止硬編碼 `text-gray-900`、`text-gray-500` 等
- **背景顏色**：使用 CSS 變數 `var(--bg-primary)`、`var(--bg-secondary)`、`var(--bg-tertiary)`，禁止硬編碼 `bg-white` 等
- **按鈕無障礙**：純圖示按鈕必須加 `aria-label` 屬性

## Mock Service 規範

Mock Service（`packages/frontend/src/services/` 中的 `MockXxxService`）只做資料模擬，禁止包含商業邏輯：

- **每個方法不超過 5 行**（建立假資料 → 回傳）
- **禁止 if/else 條件判斷**（狀態計算、欄位映射、權限判斷等屬於後端邏輯）
- **禁止狀態聯動**（如「進度 100% 時自動改狀態為 DONE」應由後端處理）
- **違規檢測**：Mock 中出現 `if`/`switch`/三元運算子 = Mock 在做後端的事，應移到後端

> 背景：Mock 曾因包含過多商業邏輯而成為「影子後端」，導致 Mock 模式正常但 API 模式壞掉的問題大量出現。

## 參考資源

- `docs/lessons-learned.md` — 環境變數、Demo 功能、Service Factory 等教訓記錄
