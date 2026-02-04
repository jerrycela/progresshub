# ProgressHub 技術審查報告 - 待處理項目清單

> **審查日期**: 2026-02-02
> **審查人員**: CTO 技術審查
> **專案分支**: `claude/review-progresshub-BeaSN`

---

## 📋 問題分類說明

| 優先級 | 說明 | 處理時程 |
|--------|------|----------|
| 🔴 P0 | 嚴重/安全性問題，必須立即修復 | 立即 |
| 🟡 P1 | 重要問題，短期內需要處理 | 1-2 週 |
| 🟢 P2 | 改進項目，中期優化 | 1 個月內 |

---

## 🔴 P0 - 立即處理（安全性問題）

### Issue #1: JWT Secret 預設值不安全

**檔案位置**: `backend/src/config/env.ts:21`

**問題描述**:
```typescript
// 目前的代碼 - 危險
JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
```

**風險**: 如果生產環境遺漏設定 `JWT_SECRET`，系統將使用弱密鑰，攻擊者可輕易偽造 JWT Token。

**修復方案**:
```typescript
// 建議修改為
JWT_SECRET: (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return secret || 'dev-only-secret-key';
})(),
```

**驗證方式**:
- [ ] 在生產環境下不設定 JWT_SECRET，確認應用程式拒絕啟動
- [ ] 確認錯誤訊息清楚明確

---

### Issue #2: CORS 全開放

**檔案位置**: `backend/src/index.ts:13`

**問題描述**:
```typescript
// 目前的代碼 - 危險
app.use(cors());
```

**風險**: 允許任意網域發送跨域請求，可能遭受 CSRF 攻擊。

**修復方案**:
```typescript
import cors from 'cors';

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

**環境變數新增**:
```env
# .env.example 新增
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

**驗證方式**:
- [ ] 從非白名單網域發送請求，確認被拒絕
- [ ] 從白名單網域發送請求，確認正常運作

---

### Issue #3: 缺少 Rate Limiting

**檔案位置**: `backend/src/index.ts`

**問題描述**: 目前 API 沒有任何請求頻率限制，容易遭受 DDoS 或暴力破解攻擊。

**修復方案**:
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

**依賴安裝**:
```bash
cd backend && npm install express-rate-limit
```

**驗證方式**:
- [ ] 短時間內發送超過限制次數的請求，確認回傳 429 狀態碼
- [ ] 確認錯誤訊息格式正確

---

### Issue #4: 環境變數驗證不完整

**檔案位置**: `backend/src/config/env.ts:30-36`

**問題描述**:
```typescript
// 目前的代碼 - 只警告但不中斷
const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set`);  // 只警告不中斷
  }
}
```

**風險**: 缺少必要配置時應用程式仍會啟動，可能導致運行時錯誤。

**修復方案**:
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

**驗證方式**:
- [ ] 生產環境缺少必要變數時，確認應用程式拒絕啟動
- [ ] 開發環境缺少變數時，確認顯示警告但仍可啟動

---

### Issue #5: Docker Compose 預設密碼

**檔案位置**: `docker-compose.yml:10-12`

**問題描述**:
```yaml
POSTGRES_USER: ${POSTGRES_USER:-progresshub}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-progresshub_password}
```

**風險**: 預設密碼過於簡單，容易被猜測。

**修復方案**:
1. 移除預設密碼或使用更複雜的預設值
2. 在 README 中強調必須設定 `.env`
3. 新增啟動檢查腳本

```yaml
# docker-compose.yml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
```

**驗證方式**:
- [ ] 未設定 POSTGRES_PASSWORD 時，docker-compose 拒絕啟動
- [ ] 確認錯誤訊息清楚指示需要設定哪個變數

---

## 🟡 P1 - 短期處理（1-2 週內）

### Issue #6: 認證中間件每次查詢資料庫

**檔案位置**: `backend/src/middleware/auth.ts:39-46`

**問題描述**:
```typescript
const user = await prisma.employee.findUnique({
  where: { id: decoded.userId },
});
```

**問題**: 每個 API 請求都會查詢資料庫驗證用戶，造成效能瓶頸。

**修復方案 A - Redis 快取**:
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

const user = await redis.get(`user:${decoded.userId}`);
if (!user) {
  const dbUser = await prisma.employee.findUnique({ where: { id: decoded.userId } });
  if (dbUser) {
    await redis.setex(`user:${decoded.userId}`, 300, JSON.stringify(dbUser)); // 5 分鐘快取
  }
}
```

**修復方案 B - JWT 自包含（短期方案）**:
將必要資訊包含在 JWT 中，減少資料庫查詢：
```typescript
// 只在需要最新資料時才查詢資料庫
// 一般請求直接信任 JWT 中的資訊
```

**驗證方式**:
- [ ] 使用負載測試工具（如 k6）測試認證 API 效能
- [ ] 確認快取機制正常運作

---

### Issue #7: 缺少輸入驗證

**檔案位置**: 所有路由檔案

**問題描述**: 已安裝 `express-validator` 但未使用，API 端點缺少輸入驗證。

**修復方案**:
```typescript
import { body, validationResult } from 'express-validator';

// 範例：建立專案 API
router.post('/projects',
  [
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... 業務邏輯
  }
);
```

**驗證方式**:
- [ ] 發送無效格式的請求，確認回傳 400 錯誤
- [ ] 確認錯誤訊息包含具體欄位資訊

---

### Issue #8: 測試覆蓋率 0%

**問題描述**: 目前專案沒有任何測試檔案。

**需要建立的測試**:

```
backend/
├── __tests__/
│   ├── unit/
│   │   ├── middleware/
│   │   │   ├── auth.test.ts          # JWT 認證測試
│   │   │   └── errorHandler.test.ts  # 錯誤處理測試
│   │   └── config/
│   │       └── env.test.ts           # 環境變數驗證測試
│   ├── integration/
│   │   ├── auth.test.ts              # 認證流程整合測試
│   │   ├── projects.test.ts          # 專案 CRUD 測試
│   │   └── tasks.test.ts             # 任務管理測試
│   └── setup.ts                       # 測試環境設定
scheduler/
├── __tests__/
│   ├── checkUnreportedEmployees.test.ts
│   └── sendReminder.test.ts
```

**依賴安裝**:
```bash
cd backend && npm install -D jest @types/jest ts-jest supertest @types/supertest
```

**Jest 配置** (`backend/jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

**驗證方式**:
- [ ] 執行 `npm test` 確認所有測試通過
- [ ] 執行 `npm run test:coverage` 確認覆蓋率達標

---

### Issue #9: 缺少 Service 層

**問題描述**: 目前架構缺少業務邏輯層，路由直接處理業務邏輯，不利於測試和維護。

**建議的目錄結構**:
```
backend/src/
├── routes/          # 路由層 - HTTP 請求處理
├── services/        # 業務邏輯層 (新增)
│   ├── authService.ts
│   ├── projectService.ts
│   ├── taskService.ts
│   └── progressService.ts
├── repositories/    # 資料存取層 (可選)
├── middleware/
├── config/
└── types/
```

**範例重構**:
```typescript
// services/projectService.ts
export class ProjectService {
  async createProject(data: CreateProjectDto): Promise<Project> {
    // 業務邏輯
    return await prisma.project.create({ data });
  }

  async getProjectById(id: string): Promise<Project | null> {
    return await prisma.project.findUnique({ where: { id } });
  }
}

// routes/projects.ts
router.post('/', async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});
```

---

### Issue #10: 缺少 CI/CD 配置

**問題描述**: 沒有自動化測試和部署流程。

**建議新增** `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../scheduler && npm ci

      - name: Run linter
        run: cd backend && npm run lint

      - name: Run tests
        run: cd backend && npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          JWT_SECRET: test-secret
          NODE_ENV: test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

### Issue #11: Slack Token 啟動時未驗證

**檔案位置**: `scheduler/src/index.ts:68-71`

**問題描述**:
```typescript
if (!process.env.SLACK_BOT_TOKEN) {
  console.warn('SLACK_BOT_TOKEN not configured, skipping reminder');
  return;
}
```

**問題**: Token 可能無效但格式正確，只有在發送訊息時才會發現錯誤。

**修復方案**:
```typescript
async function validateSlackToken(): Promise<boolean> {
  try {
    const result = await slackClient.auth.test();
    console.log(`✅ Slack connected as: ${result.user}`);
    return true;
  } catch (error) {
    console.error('❌ Invalid Slack token:', error);
    return false;
  }
}

async function startScheduler(): Promise<void> {
  // ... 資料庫連線

  if (process.env.SLACK_BOT_TOKEN) {
    const isValid = await validateSlackToken();
    if (!isValid && process.env.NODE_ENV === 'production') {
      throw new Error('Slack token validation failed');
    }
  }

  // ... 排程設定
}
```

---

## 🟢 P2 - 中期優化（1 個月內）

### Issue #12: Scheduler 單點故障

**問題描述**: 排程服務為單一實例，無法水平擴展且存在單點故障風險。

**修復方案**: 使用 Redis 分散式鎖
```typescript
import Redis from 'ioredis';
import Redlock from 'redlock';

const redis = new Redis(process.env.REDIS_URL);
const redlock = new Redlock([redis]);

cron.schedule(cronExpression, async () => {
  try {
    const lock = await redlock.acquire(['reminder-job-lock'], 60000);
    try {
      await checkUnreportedEmployees();
    } finally {
      await lock.release();
    }
  } catch (error) {
    // 其他實例已在執行，跳過
    console.log('Job already running on another instance');
  }
});
```

---

### Issue #13: Scheduler 全表掃描效能問題

**檔案位置**: `scheduler/src/index.ts:25-55`

**問題描述**:
```typescript
const employees = await prisma.employee.findMany({
  include: { assignedTasks: { where: { status: 'IN_PROGRESS' } } },
});
```

**問題**: 當員工數量達數千時，全表掃描效能會下降。

**修復方案**:
```typescript
async function checkUnreportedEmployees(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const batchSize = 100;
  let cursor: string | undefined;

  while (true) {
    const employees = await prisma.employee.findMany({
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        assignedTasks: {
          some: { status: 'IN_PROGRESS' },
        },
      },
      include: {
        progressLogs: {
          where: { reportedAt: { gte: today } },
          take: 1,
        },
      },
    });

    if (employees.length === 0) break;

    for (const employee of employees) {
      if (employee.progressLogs.length === 0) {
        await sendReminder(employee.slackUserId, employee.name);
      }
    }

    cursor = employees[employees.length - 1].id;

    if (employees.length < batchSize) break;
  }
}
```

---

### Issue #14: 缺少 API 文檔

**問題描述**: 沒有 OpenAPI/Swagger 文檔，前端開發者難以了解 API 規格。

**修復方案**:
```bash
cd backend && npm install swagger-jsdoc swagger-ui-express @types/swagger-jsdoc @types/swagger-ui-express
```

```typescript
// backend/src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ProgressHub API',
      version: '1.0.0',
      description: '專案進度管理系統 API 文檔',
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

---

### Issue #15: 缺少日誌系統

**問題描述**: 目前使用 `console.log`，不利於生產環境監控和問題追蹤。

**修復方案**:
```bash
cd backend && npm install winston
```

```typescript
// backend/src/config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          )
        : winston.format.json(),
    }),
  ],
});
```

---

### Issue #16: 缺少健康檢查端點

**問題描述**: 沒有健康檢查端點供 K8s 或負載均衡器使用。

**修復方案**:
```typescript
// backend/src/routes/health.ts
import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});

export default router;
```

---

## ✅ 驗收檢查清單

完成所有修復後，請確認以下項目：

### 安全性驗收
- [ ] JWT Secret 在生產環境必須設定
- [ ] CORS 白名單正確配置
- [ ] Rate Limiting 正常運作
- [ ] 所有必要環境變數都有驗證

### 品質驗收
- [ ] 測試覆蓋率 >= 70%
- [ ] ESLint 無錯誤
- [ ] TypeScript 編譯無錯誤
- [ ] 所有 API 端點有輸入驗證

### 運維驗收
- [ ] 健康檢查端點正常
- [ ] 日誌格式符合規範
- [ ] CI/CD Pipeline 正常運作
- [ ] API 文檔可訪問

---

## 📚 參考資源

- [Express.js 安全最佳實踐](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Jest 測試框架](https://jestjs.io/docs/getting-started)
- [Prisma 最佳實踐](https://www.prisma.io/docs/guides/performance-and-optimization)

---

> **備註**: 此文件由 CTO 技術審查產出，請 QA 技術人員依優先級順序處理各項問題。完成修復後請更新此文件的檢查清單狀態。
