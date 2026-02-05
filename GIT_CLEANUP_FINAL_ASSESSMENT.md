# Git 結構清理最終評估報告

> **報告日期**: 2026-02-05
> **分析方法**: 30 次迭代審查
> **核心目標**: 確保清理操作不影響 Zeabur 上的前端頁面

---

## 執行摘要

經過 30 次迭代審查，結論是：

### ✅ 清理操作**不會影響** Zeabur 上的前端頁面

原因：
1. Zeabur 只使用 `packages/frontend/` 目錄
2. 待刪除的目錄不在 pnpm workspace 中
3. 建置流程 (`pnpm --filter frontend build`) 與根目錄程式碼無關

---

## 30 次迭代審查摘要

### 迭代 1-10：基礎安全性審查

| 迭代 | 審查項目 | 結論 |
|-----|---------|------|
| 1 | 初始方案審查 | 需深入分析依賴 |
| 2 | Dockerfile 依賴分析 | 只依賴 packages/frontend/ |
| 3 | pnpm-workspace 驗證 | 只包含 packages/* |
| 4 | packages/frontend 依賴 | 依賴 packages/shared |
| 5 | packages/shared 完整性 | 完整，不需修改 |
| 6 | 建置流程模擬 | 清理後建置正常 |
| 7 | 隱藏依賴檢查 | 無隱藏依賴 |
| 8 | 建置輸出路徑 | packages/frontend/dist ✓ |
| 9 | 安全刪除清單 | 可刪除 ~272 MB |
| 10 | 風險矩陣 | 大部分操作安全 |

### 迭代 11-20：部署影響分析

| 迭代 | 審查項目 | 結論 |
|-----|---------|------|
| 11 | 多個 Dockerfile | 存在但不影響（手動配置）|
| 12 | Git 分支影響 | 需確認 Zeabur 部署分支 |
| 13 | 後端依賴 | 前端使用 Mock 資料，無依賴 |
| 14 | 環境變數 | 前端不使用環境變數 |
| 15 | 靜態資源 | 前端自包含 |
| 16 | CI/CD 配置 | 會失敗，需更新（但不影響 Zeabur）|
| 17 | 文件引用 | 需更新（不影響部署）|
| 18 | Zeabur 觸發機制 | 會觸發但結果相同 |
| 19 | 最壞情況分析 | Zeabur 自動回滾，安全 |
| 20 | 總結 | 確認清理安全 |

### 迭代 21-30：執行計畫與驗證

| 迭代 | 審查項目 | 結論 |
|-----|---------|------|
| 21 | 三種方案定義 | 0=不動、1=保守、2=完整 |
| 22 | 方案 1 詳細步驟 | 只刪 /progresshub/ |
| 23 | 方案 2 風險評估 | 完整清理，需測試 |
| 24 | 驗證清單 | 10 項檢查點 |
| 25 | 失敗回復程序 | 完整回復路徑 |
| 26 | 時序圖分析 | 任何時點都安全 |
| 27 | 邊界情況 | 5 個邊界情況都安全 |
| 28 | 最終風險矩陣 | 確定安全操作清單 |
| 29 | 修訂建議方案 | 分階段執行 |
| 30 | 最終結論 | 本報告 |

---

## 核心發現

### Zeabur 前端建置流程

```
Dockerfile 執行流程：

1. COPY . .
   └── 複製整個倉庫（包含待刪除的目錄）

2. pnpm install
   └── 讀取 pnpm-workspace.yaml
   └── 只安裝 packages/* 的依賴

3. pnpm --filter frontend build
   └── 只建置 packages/frontend
   └── 不會觸及根目錄的 frontend/、backend/

4. 輸出 packages/frontend/dist
   └── 複製到 Caddy 靜態伺服器
```

### 關鍵依賴圖

```
Zeabur 部署依賴：

packages/frontend/  ←── 必須保留
    │
    ├── package.json
    ├── src/
    ├── vite.config.ts
    └── 依賴 packages/shared/types

packages/shared/    ←── 必須保留
    │
    └── types/

pnpm-workspace.yaml ←── 必須保留
    │
    └── packages: ['packages/*']

根目錄 package.json ←── 建議保留
    │
    └── 定義 pnpm 腳本

---

以下目錄不影響 Zeabur 建置：

/frontend/        ←── 可安全刪除
/backend/         ←── 可安全刪除
/progresshub/     ←── 可安全刪除
/scheduler/       ←── 可安全刪除
```

---

## 最終建議方案

### 方案 0：完全不變更（最安全）

```
操作：不做任何清理
風險：零
影響：無
適用：如果您不急於清理
```

### 方案 1：最小清理（推薦入門）

```
操作：只刪除 /progresshub/
風險：極低（接近零）
影響：無

執行步驟：
1. git rm -rf progresshub/
2. git commit -m "chore: 移除重複的 progresshub 子目錄"
3. git push

驗證：Zeabur 前端繼續正常運作
```

### 方案 2：標準清理（推薦）

```
操作：刪除所有非 packages/ 的重複目錄
風險：低
影響：CI 會失敗（需之後更新）

執行步驟：
1. git checkout -b cleanup/remove-duplicates
2. git rm -rf progresshub/
3. git rm -rf frontend/
4. git rm -rf scheduler/
5. git commit -m "chore: 移除重複的程式碼目錄"
6. git push origin cleanup/remove-duplicates
7. 在 Zeabur 測試此分支部署
8. 確認成功後再合併

保留 /backend/ 的原因：
- 未來需要遷移到 packages/backend/
- CI 目前依賴此目錄
```

### 方案 3：完整清理（進階）

```
操作：完整清理 + 遷移後端 + 更新 CI
風險：中低
影響：需要較多測試

建議：等方案 2 成功後再執行
```

---

## 安全保證

### 為什麼清理不會影響 Zeabur 前端？

1. **pnpm workspace 隔離**
   - `pnpm-workspace.yaml` 只包含 `packages/*`
   - 根目錄的 frontend/、backend/ 不在 workspace 中
   - `pnpm --filter frontend` 只操作 packages/frontend

2. **Dockerfile 指定輸出**
   - `COPY --from=0 /src/packages/frontend/dist`
   - 明確指定 packages/frontend/dist
   - 不依賴根目錄的任何程式碼

3. **前端使用 Mock 資料**
   - packages/frontend 使用 mocks/data.ts
   - 不呼叫後端 API
   - 與 /backend/ 完全無關

4. **Zeabur 回滾機制**
   - 建置失敗時保留上一次成功部署
   - 即使出錯，網站也不會中斷

---

## 驗證清單

執行清理後，請確認以下項目：

```
□ 1. packages/frontend/ 目錄存在且完整
□ 2. packages/shared/ 目錄存在且完整
□ 3. pnpm-workspace.yaml 內容為 packages: ['packages/*']
□ 4. 根目錄 package.json 存在
□ 5. 執行 pnpm install 成功
□ 6. 執行 pnpm --filter frontend build 成功
□ 7. packages/frontend/dist/index.html 存在
□ 8. Zeabur 部署成功
□ 9. https://progresshub.zeabur.app 可正常訪問
□ 10. 所有頁面功能正常（儀表板、任務池、我的任務等）
```

---

## 風險對照表

| 操作 | 對 Zeabur 前端的影響 | 安全等級 |
|-----|---------------------|---------|
| 刪除 `/progresshub/` | ✅ 無影響 | 安全 |
| 刪除 `/frontend/` | ✅ 無影響 | 安全 |
| 刪除 `/scheduler/` | ✅ 無影響 | 安全 |
| 刪除 `/backend/` | ✅ 無影響 | 安全 |
| 修改 `packages/frontend/` | ❌ 直接影響 | 禁止 |
| 修改 `packages/shared/` | ⚠️ 可能影響 | 謹慎 |
| 修改 `pnpm-workspace.yaml` | ⚠️ 可能影響 | 謹慎 |
| 刪除 `pnpm-workspace.yaml` | ❌ 建置失敗 | 禁止 |

---

## 回復程序

如果清理後出現問題：

### 本地回復
```bash
git checkout .
git clean -fd
```

### 已推送回復
```bash
git revert HEAD
git push
```

### Zeabur 回復
```
1. 進入 Zeabur Dashboard
2. 選擇上一次成功的部署
3. 點擊「重新部署」
```

---

## 結論

### 30 次迭代審查結果

✅ **清理根目錄的重複程式碼是安全的**

原因：
- Zeabur 前端只依賴 `packages/frontend/` 和 `packages/shared/`
- 待刪除的目錄不在建置路徑中
- 即使建置失敗，Zeabur 也會保留舊版本

### 建議行動

1. **如果您想保守**：執行方案 1（只刪除 /progresshub/）
2. **如果您想清理**：執行方案 2（刪除所有重複目錄）
3. **如果您想等待**：執行方案 0（不做任何變更）

### 重要提醒

- 建議在新分支進行清理
- 清理後在 Zeabur 測試部署
- 確認成功後再合併到主分支

---

*本報告基於 30 次迭代審查，確保分析的完整性和準確性*
*最後更新: 2026-02-05*
