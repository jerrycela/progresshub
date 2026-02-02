# QA 技術審查報告 - P0 安全性問題

> **審查日期**: 2026-02-02
> **審查人員**: QA 技術人員
> **交接對象**: 資深程式人員
> **審查範圍**: TECH_REVIEW_ISSUES.md 中所有 P0 問題

---

## 📊 問題驗證摘要

| Issue | 問題描述 | 檔案位置 | 驗證狀態 | 風險等級 |
|-------|----------|----------|----------|----------|
| #1 | JWT Secret 預設值不安全 | `backend/src/config/env.ts:21` | ✅ 確認存在 | 🔴 嚴重 |
| #2 | CORS 全開放 | `backend/src/index.ts:13` | ✅ 確認存在 | 🔴 嚴重 |
| #3 | 缺少 Rate Limiting | `backend/src/index.ts` | ✅ 確認存在 | 🔴 嚴重 |
| #4 | 環境變數驗證不完整 | `backend/src/config/env.ts:30-36` | ✅ 確認存在 | 🔴 嚴重 |
| #5 | Docker Compose 預設密碼 | `docker-compose.yml:10-12` | ✅ 確認存在 | 🟠 高 |

**結論：所有 5 個 P0 問題皆已驗證確實存在，需立即修復。**

---

## 🔴 Issue #1: JWT Secret 預設值不安全

### 檔案位置
`backend/src/config/env.ts:21`

### 目前代碼
```typescript
JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
```

### 問題說明
- 使用硬編碼的預設密鑰 `'your-secret-key-change-in-production'`
- 生產環境若未設定 `JWT_SECRET`，系統會靜默使用此弱密鑰
- 攻擊者可利用此已知密鑰偽造任意 JWT Token

### 建議修復方案
```typescript
JWT_SECRET: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return secret || 'dev-only-secret-key';
})(),
```

### 驗證方式
- [ ] 生產環境下不設定 JWT_SECRET，確認應用程式拒絕啟動
- [ ] 確認錯誤訊息清楚明確

---

## 🔴 Issue #2: CORS 全開放

### 檔案位置
`backend/src/index.ts:13`

### 目前代碼
```typescript
app.use(cors()); // Enable CORS
```

### 問題說明
- CORS middleware 完全未設定任何選項
- 任意網域都可以發送跨域請求
- 可能導致 CSRF 攻擊或敏感資料洩漏

### 建議修復方案
```typescript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'])
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

### 環境變數新增
```env
# .env.example 需新增
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### 驗證方式
- [ ] 從非白名單網域發送請求，確認被拒絕
- [ ] 從白名單網域發送請求，確認正常運作

---

## 🔴 Issue #3: 缺少 Rate Limiting

### 檔案位置
`backend/src/index.ts`

### 目前狀況
- 檢視整個 index.ts，**完全沒有** rate limiting 相關設定
- API 端點無任何請求頻率限制
- 容易遭受 DDoS 攻擊或暴力密碼破解

### 需安裝依賴
```bash
cd backend && npm install express-rate-limit
```

### 建議修復方案
```typescript
import rateLimit from 'express-rate-limit';

// 通用 API 限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每個 IP 最多 100 次請求
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登入 API 嚴格限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 登入嘗試限制更嚴格
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### 驗證方式
- [ ] 短時間內發送超過限制次數的請求，確認回傳 429 狀態碼
- [ ] 確認錯誤訊息格式正確

---

## 🔴 Issue #4: 環境變數驗證不完整

### 檔案位置
`backend/src/config/env.ts:30-36`

### 目前代碼
```typescript
const requiredEnvVars = ['DATABASE_URL'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set in environment variables`);
  }
}
```

### 問題說明
- 只驗證 `DATABASE_URL`，缺少其他關鍵變數
- 僅使用 `console.warn`，不會中斷程式執行
- 生產環境缺少必要配置時仍會啟動，導致運行時錯誤

### 建議修復方案
```typescript
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SLACK_BOT_TOKEN',
  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'SLACK_SIGNING_SECRET',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

if (missingVars.length > 0) {
  console.warn(`⚠️ Missing environment variables (dev mode): ${missingVars.join(', ')}`);
}
```

### 驗證方式
- [ ] 生產環境缺少必要變數時，確認應用程式拒絕啟動
- [ ] 開發環境缺少變數時，確認顯示警告但仍可啟動

---

## 🟠 Issue #5: Docker Compose 預設密碼

### 檔案位置
`docker-compose.yml:10-12`

### 目前代碼
```yaml
POSTGRES_USER: ${POSTGRES_USER:-progresshub}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-progresshub_password}
```

### 問題說明
- 資料庫密碼預設值為 `progresshub_password`，過於簡單且可預測
- 同樣問題也存在於 `docker-compose.yml:35` 的 `JWT_SECRET`

### 建議修復方案
```yaml
# 強制要求設定，未設定則拒絕啟動
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set}
```

### 驗證方式
- [ ] 未設定 POSTGRES_PASSWORD 時，docker-compose 拒絕啟動
- [ ] 確認錯誤訊息清楚指示需要設定哪個變數

---

## 📋 建議實作順序

### 第一階段（可同時修改，影響範圍小）

| 順序 | Issue | 檔案 | 說明 |
|------|-------|------|------|
| 1 | #1 + #4 | `backend/src/config/env.ts` | 兩個問題在同一檔案，可一次處理 |
| 2 | #5 | `docker-compose.yml` | 簡單的 YAML 修改 |

### 第二階段（需新增依賴）

| 順序 | Issue | 檔案 | 說明 |
|------|-------|------|------|
| 3 | #2 | `backend/src/index.ts` | CORS 配置修改 |
| 4 | #3 | `backend/src/index.ts` | 需先安裝 `express-rate-limit` |

---

## ✅ 完成驗收檢查清單

修復完成後，請確認以下項目全部通過：

### 安全性驗收
- [ ] JWT Secret 在生產環境必須設定，否則拒絕啟動
- [ ] CORS 白名單正確配置，非白名單網域被拒絕
- [ ] Rate Limiting 正常運作，超限請求回傳 429
- [ ] 所有必要環境變數都有驗證
- [ ] Docker Compose 未設定密碼時拒絕啟動

### 功能驗收
- [ ] 開發環境正常啟動
- [ ] 所有現有 API 端點正常運作
- [ ] TypeScript 編譯無錯誤

---

## 📚 參考資料

- 原始審查文件：`TECH_REVIEW_ISSUES.md`
- [Express.js 安全最佳實踐](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

> **備註**: 此報告由 QA 技術人員產出，已驗證所有 P0 問題確實存在。請資深程式人員依優先順序進行修復，完成後更新檢查清單狀態。
