# 教訓記錄

## Vite 環境變數是編譯時常數
修改 `.env` 後**必須重啟 dev server** 才會生效。不要假設修改 `.env` 後立即生效。

## Demo 功能必須獨立於環境變數
任何「不需要後端也能運作」的功能，不能依賴 `VITE_USE_MOCK` 環境變數。應建立獨立的程式碼路徑。

## 修復前先確認根因
不能只修表面症狀（如加錯誤提示），要追溯到根本原因（如 Demo 按鈕呼叫了錯誤的 handler）。

## Service Layer Factory 在模組頂層執行一次
`createAuthService()` 的結果在整個應用生命週期中不會改變。切換 mock/API 需要修改環境變數並重啟。

## 修改安全配置必須同步更新測試
修改 `backend/src/config/env.ts` 的預設值或安全檢查邏輯時，必須搜尋所有 `NODE_ENV.*production` 的測試並確認它們提供了必要的環境變數。Logger 等模組透過 import chain 間接依賴 env.ts，也會受到影響。

## 本地 .env 會干擾後端測試
`backend/.env` 會被 `dotenv.config()` 載入，導致本地測試結果與 CI 不同。驗證 CI 相關修正時，暫時移除 `.env`（`mv .env .env.bak`）可模擬 CI 環境。
