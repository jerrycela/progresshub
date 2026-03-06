# ProgressHub 後端服務故障報告

**服務名稱：** progresshub-api
**報告時間：** 2026-03-06 09:47 (GMT+8)
**嚴重程度：** P0 — 所有 API 端點完全無法存取

---

## 一、現況摘要

後端 API 服務（progresshub-api.zeabur.app）目前所有端點回傳 HTTP 404，包含根路徑 `/`、健康檢查 `/api/health`、以及所有業務 API。前端應用因此完全無法與後端通訊，等同於**系統全面癱瘓**。

---

## 二、問題時間線

| 時間 (UTC) | 事件 |
|------------|------|
| 03/05 23:48 | 服務第一次啟動，日誌顯示正常運行於 port 8080 |
| 03/06 00:26 | 服務重啟（執行 migration + seed），啟動成功 |
| 03/06 01:40:33 | 服務收到 SIGTERM，優雅關閉 |
| 03/06 01:40:35 | 服務重新啟動，日誌顯示 port 8080 正常監聽 |
| 03/06 01:40:36 | 日誌確認「Database connected successfully」 |
| 03/06 ~01:41+ | 透過 CLI 手動重啟服務，仍然 404 |
| 03/06 09:47 | 所有端點持續回傳 404 |

---

## 三、診斷結果

### 3.1 Express 應用本身正常啟動

每次啟動日誌都完整顯示：
- Prisma migrate deploy 成功
- Seed 腳本執行完成
- 「Slack integration disabled」（正常，未設定 Slack）
- 「Dev login enabled」（正常，開發模式）
- **「Server is running on port 8080」**
- **「Database connected successfully」**

結論：Express 應用程式本身啟動流程**沒有錯誤**。

### 3.2 404 不是來自 Express

關鍵證據：
- 404 回應的 `content-type` 是 `text/plain`，內容僅為 "Not Found"
- **缺少 `X-Powered-By: Express` header**（Express 預設會加上此 header）
- Express 的 404 通常回傳 HTML 或 JSON 格式，而非純文字

結論：**404 是 Zeabur 平台的反向代理/閘道層回傳的**，請求根本沒有到達 Express 應用。

### 3.3 可疑的 rate-limit 警告

每次啟動都出現以下警告：

```
ERR_ERL_KEY_GEN_IPV6 — ValidationError: Custom keyGenerator appears to use
request IP without calling the ipKeyGenerator helper function for IPv6 addresses
```

這是 `express-rate-limit` 套件的 IPv6 驗證錯誤。雖然這個警告本身**不太可能**直接導致 404（因為它只是警告，不是致命錯誤），但需要排查是否造成了中介層異常。

### 3.4 可能的根本原因

依可能性排序：

| 優先級 | 可能原因 | 說明 |
|--------|---------|------|
| **最高** | Zeabur 平台路由/閘道配置異常 | 平台的反向代理未正確轉發請求到容器的 port 8080。可能是部署配置、域名綁定、或平台側問題 |
| **中** | 容器健康檢查失敗 | 如果 Zeabur 有健康檢查機制，而檢查端點或方式不匹配，平台可能判定容器「不健康」而不轉發流量 |
| **中** | Port 綁定不匹配 | 容器監聽 8080，但 Zeabur 期望的端口不同（需確認 `zeabur.json` 配置） |
| **低** | rate-limit IPv6 錯誤導致中介層崩潰 | 雖然是警告級別，但如果某個中介層因此拋出未捕捉的例外，可能影響請求處理 |

---

## 四、已嘗試的修復

| 動作 | 結果 |
|------|------|
| 透過 Zeabur CLI 手動重啟服務 | 服務重啟成功（日誌確認），但 404 持續 |
| 等待 60+ 秒後重新測試 | 無改善 |
| 檢查多個端點（`/`、`/api/`、`/api/health`） | 全部 404 |

---

## 五、建議的下一步排查

### 立即行動（P0）

1. **檢查 Zeabur 後台的服務配置**
   - 確認 port 設定是否為 8080
   - 確認域名 `progresshub-api.zeabur.app` 是否正確綁定到此服務
   - 確認服務狀態是否顯示為「Running」

2. **檢查 `zeabur.json` 的端口配置**
   - 確認 `start_command` 和 exposed port 是否一致

3. **嘗試重新部署（Redeploy）而非重啟（Restart）**
   - Restart 只重啟容器，Redeploy 會重建映像檔
   - 可能解決平台路由快取問題

### 進一步排查

4. **修復 rate-limit IPv6 警告**
   - 更新 `express-rate-limit` 的 keyGenerator 使用 `ipKeyGenerator` helper
   - 排除此警告作為潛在干擾因素

5. **聯繫 Zeabur 支援**
   - 如果以上步驟無效，提供服務 ID（`69919980578031156931b2b5`）和專案 ID（`6981dcd8660671a403f1390a`）給 Zeabur 技術支援排查平台側問題

---

## 六、影響範圍

- 前端所有需要後端 API 的功能**完全不可用**
- 包含：登入、任務管理、專案管理、甘特圖、工時追蹤、GitLab 整合
- Demo 登入功能也無法使用（依賴後端 API）
- 唯一不受影響的是前端靜態頁面的載入本身

---

## 七、服務資訊

| 項目 | 值 |
|------|------|
| Zeabur 專案 ID | `6981dcd8660671a403f1390a` |
| 後端服務 ID | `69919980578031156931b2b5` |
| 服務 URL | `progresshub-api.zeabur.app` |
| 容器監聽端口 | 8080 |
| 最後成功啟動 | 2026-03-06 01:40:36 UTC |
| 資料庫連線 | 正常 |
| Express 應用 | 正常啟動 |
| 外部可達性 | 全部 404 |
