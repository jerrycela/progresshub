# ProgressHub 後端 404 故障報告

**服務名稱：** progresshub-api
**報告時間：** 2026-03-06 10:42 (GMT+8)
**狀態：** 已解決

---

## 一、事件摘要

後端 API 在外部測試時回傳 HTTP 404（純文字 "Not Found"），導致誤判為「系統全面癱瘓」。經排查後發現包含兩個獨立問題：

1. **測試域名錯誤**（根本原因）：一直測試 `progresshub-api.zeabur.app`，但後端服務實際綁定的域名是 `progresshubfortest.zeabur.app`
2. **express-rate-limit IPv6 錯誤**（已修復）：`ERR_ERL_KEY_GEN_IPV6` 警告可能在某些環境下導致中介層異常

**實際影響：** 前端 `.env.production` 配置了正確的 API URL（`progresshubfortest.zeabur.app`），因此前後端連線**一直是通的**。外部手動測試用了錯誤域名才產生 404。

---

## 二、問題時間線

| 時間 (GMT+8) | 事件 |
|-------------|------|
| ~09:30 | 發現 `progresshub-api.zeabur.app` 所有端點回傳 404 |
| 09:47 | 初步報告：判斷為 Zeabur 平台路由問題 |
| 09:57 | 修復 express-rate-limit IPv6 錯誤（`validate: { keyGeneratorIpFallback: false }`） |
| 10:00 | 提交修復並部署（PR #6 合併） |
| 10:09 | 嘗試修改 Dockerfile port 從 3000 改為 8080（PR #7, #8） |
| 10:14 | 修改 zeabur.json healthcheck port |
| 10:20 | 意外用 `variable update` 清除所有環境變數，緊急用 `variable create` 恢復 |
| 10:30 | 確認 PORT 需設為 3000，全面回退 port 配置（PR #10） |
| 10:38 | 容器內部驗證：Express 在 port 3000 正常運行，健康端點正常回應 |
| 10:41 | 發現根本原因：`zeabur domain list` 顯示服務綁定域名為 `progresshubfortest.zeabur.app` |
| 10:42 | 驗證正確域名：所有端點回傳 200，後端完全正常 |

---

## 三、根本原因分析

### 3.1 測試域名錯誤（主因）

| 項目 | 值 |
|------|------|
| 測試使用的域名 | `progresshub-api.zeabur.app` |
| 實際綁定的域名 | `progresshubfortest.zeabur.app` |
| 前端配置的 API URL | `https://progresshubfortest.zeabur.app/api`（正確） |

`progresshub-api.zeabur.app` 這個域名並未綁定到任何服務，因此 Zeabur 閘道回傳 `text/plain "Not Found"`。這不是 Express 的 404，而是平台層的「找不到服務」回應。

**驗證方式：**
```
zeabur domain list --id 69919980578031156931b2b5
=> progresshubfortest.zeabur.app (PROVISIONED)
```

### 3.2 express-rate-limit IPv6 錯誤（已修復）

`express-rate-limit` v8 在自訂 `keyGenerator` 使用 `req.ip` 但未使用 `ipKeyGenerator` 時拋出 `ERR_ERL_KEY_GEN_IPV6` 驗證錯誤。

**修復方式：** 在 apiLimiter 設定中加入 `validate: { keyGeneratorIpFallback: false }`，因為我們的 keyGenerator 優先使用 userId，IP 只是備用。

---

## 四、修復過程中的附帶問題

### 4.1 環境變數被清除

使用 `npx zeabur variable update` 時，該指令會**清除所有現有變數再重新設定**。僅設定了 PORT=3000，導致其餘 6 個變數（DATABASE_URL、JWT_SECRET 等）全部遺失。

**教訓：** Zeabur CLI 修改環境變數必須使用 `variable create`，絕不用 `variable update`。

### 4.2 Port 配置來回修改

因為誤判為 port 不匹配問題，Dockerfile 和 zeabur.json 的 port 配置在 3000 和 8080 之間反覆修改，產生了 4 個 PR。最終確認正確配置為 port 3000。

---

## 五、最終驗證結果

| 端點 | 狀態碼 | 回應 |
|------|--------|------|
| `/health` | 200 | `{"status":"ok","uptime":...}` |
| `/health/ready` | 200 | `{"status":"ready","database":"connected"}` |
| `/api/` | 200 | `{"name":"ProgressHub API","version":"1.0.0"}` |
| `/api/auth/dev-login` | 400 | 正確的驗證錯誤回應 |
| 前端 | 200 | 正常載入 |

---

## 六、預防措施

| 項目 | 行動 |
|------|------|
| 域名管理 | 在專案文件中明確記錄各服務的域名對應關係 |
| 環境變數 | 禁用 `zeabur variable update`，一律使用 `variable create` |
| 測試流程 | 排查前先用 `zeabur domain list` 確認正確域名 |
| Port 配置 | Dockerfile EXPOSE、zeabur.json healthcheck、env PORT 三者必須一致（目前皆為 3000） |

---

## 七、服務資訊

| 項目 | 值 |
|------|------|
| Zeabur 專案 ID | `6981dcd8660671a403f1390a` |
| 後端服務 ID | `69919980578031156931b2b5` |
| 前端服務 ID | `6981dd90f9d3bc4cce7d1bf0` |
| 後端域名 | `progresshubfortest.zeabur.app` |
| 前端域名 | `progresshub.zeabur.app` |
| 容器監聽端口 | 3000 |
| 資料庫 | `postgresql.zeabur.internal:5432/zeabur` |
