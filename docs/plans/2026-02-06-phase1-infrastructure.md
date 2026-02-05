# Phase 1：基礎設施 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立 `/packages/backend/` 專案結構，包含 TypeScript 設定、Prisma Schema、統一回應格式、錯誤處理中介軟體、測試基礎設施。

**Architecture:** 採用 Express.js + TypeScript + Prisma 架構，所有 API 回應使用統一的 `ApiResponse<T>` 格式，錯誤處理集中管理。

**Tech Stack:** Express.js, TypeScript, Prisma, PostgreSQL, Jest, Supertest

---

## Task 1: 建立專案結構

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/.env.example`

**Step 1: 建立 package.json**

```json
{
  "name": "@progresshub/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.8.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.6",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.8.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

**Step 2: 建立 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: 建立 src/index.ts（基本 Express 伺服器）**

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
```

**Step 4: 建立 .env.example**

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/progresshub?schema=public"

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
```

**Step 5: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): 初始化專案結構"
```

---

## Task 2: 設定 Jest 測試框架

**Files:**
- Create: `packages/backend/jest.config.js`
- Create: `packages/backend/tests/setup.ts`
- Create: `packages/backend/tests/health.test.ts`

**Step 1: 建立 jest.config.js**

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

**Step 2: 建立 tests/setup.ts**

```typescript
// Global test setup
beforeAll(() => {
  // Setup before all tests
})

afterAll(() => {
  // Cleanup after all tests
})
```

**Step 3: 寫第一個測試（TDD - RED）**

```typescript
// tests/health.test.ts
import request from 'supertest'
import app from '../src/index'

describe('Health Check', () => {
  it('should return success response', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok'
      }
    })
    expect(response.body.data.timestamp).toBeDefined()
  })
})
```

**Step 4: 執行測試確認通過**

```bash
cd packages/backend && npm install && npm test
```

Expected: PASS（因為 index.ts 已實作）

**Step 5: Commit**

```bash
git add packages/backend/
git commit -m "test(backend): 新增 Jest 設定與 health check 測試"
```

---

## Task 3: 建立共用類型定義

**Files:**
- Modify: `packages/shared/types/index.ts`
- Create: `packages/shared/types/api.ts`
- Create: `packages/shared/types/task.ts`

**Step 1: 建立 api.ts（API 回應格式）**

```typescript
// packages/shared/types/api.ts

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: PaginationMeta
}

export interface ApiError {
  code: string
  message: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Error codes
export const ErrorCodes = {
  // Auth
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',

  // Permission
  PERM_DENIED: 'PERM_DENIED',
  PERM_ROLE_REQUIRED: 'PERM_ROLE_REQUIRED',

  // Resource
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',

  // Server
  SERVER_ERROR: 'SERVER_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
```

**Step 2: 更新 task.ts（任務狀態）**

```typescript
// packages/shared/types/task.ts

export enum TaskStatus {
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE'
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  progress: number
  dueDate?: string
  projectId: string
  assigneeId?: string
  createdAt: string
  updatedAt: string
}
```

**Step 3: 更新 index.ts 匯出**

```typescript
// packages/shared/types/index.ts

export * from './api'
export * from './task'
// ... 其他既有匯出
```

**Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): 新增 API 回應格式與任務狀態類型定義"
```

---

## Task 4: 實作統一回應格式中介軟體

**Files:**
- Create: `packages/backend/src/middleware/responseFormatter.ts`
- Create: `packages/backend/tests/middleware/responseFormatter.test.ts`

**Step 1: 寫測試（TDD - RED）**

```typescript
// tests/middleware/responseFormatter.test.ts
import { Request, Response } from 'express'
import { sendSuccess, sendError, sendPaginated } from '../../src/middleware/responseFormatter'

describe('Response Formatter', () => {
  let mockRes: Partial<Response>
  let mockReq: Partial<Request>

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    mockReq = {}
  })

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: '1', name: 'Test' }
      sendSuccess(mockRes as Response, data)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      })
    })

    it('should send success response with custom status', () => {
      const data = { id: '1' }
      sendSuccess(mockRes as Response, data, 201)

      expect(mockRes.status).toHaveBeenCalledWith(201)
    })
  })

  describe('sendError', () => {
    it('should send error response', () => {
      sendError(mockRes as Response, 'RESOURCE_NOT_FOUND', '找不到資源', 404)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '找不到資源'
        }
      })
    })
  })

  describe('sendPaginated', () => {
    it('should send paginated response', () => {
      const data = [{ id: '1' }, { id: '2' }]
      sendPaginated(mockRes as Response, data, { total: 10, page: 1, limit: 2 })

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        meta: {
          total: 10,
          page: 1,
          limit: 2,
          hasMore: true
        }
      })
    })
  })
})
```

**Step 2: 執行測試確認失敗**

```bash
cd packages/backend && npm test -- responseFormatter
```

Expected: FAIL（模組不存在）

**Step 3: 實作 responseFormatter.ts**

```typescript
// src/middleware/responseFormatter.ts
import { Response } from 'express'
import type { ApiResponse, ApiError, PaginationMeta } from '@progresshub/shared/types'

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data
  }
  return res.status(statusCode).json(response)
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400
): Response {
  const response: ApiResponse<never> = {
    success: false,
    error: { code, message }
  }
  return res.status(statusCode).json(response)
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { total: number; page: number; limit: number },
  statusCode: number = 200
): Response {
  const meta: PaginationMeta = {
    ...pagination,
    hasMore: pagination.page * pagination.limit < pagination.total
  }
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta
  }
  return res.status(statusCode).json(response)
}
```

**Step 4: 執行測試確認通過**

```bash
cd packages/backend && npm test -- responseFormatter
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): 實作統一回應格式中介軟體"
```

---

## Task 5: 實作錯誤處理中介軟體

**Files:**
- Create: `packages/backend/src/middleware/errorHandler.ts`
- Create: `packages/backend/src/utils/AppError.ts`
- Create: `packages/backend/tests/middleware/errorHandler.test.ts`

**Step 1: 寫測試（TDD - RED）**

```typescript
// tests/middleware/errorHandler.test.ts
import request from 'supertest'
import express from 'express'
import { errorHandler } from '../../src/middleware/errorHandler'
import { AppError } from '../../src/utils/AppError'

describe('Error Handler', () => {
  const createApp = () => {
    const app = express()
    app.use(express.json())

    // Test routes
    app.get('/throw-app-error', () => {
      throw new AppError('RESOURCE_NOT_FOUND', '找不到資源', 404)
    })

    app.get('/throw-error', () => {
      throw new Error('Something went wrong')
    })

    app.use(errorHandler)
    return app
  }

  it('should handle AppError correctly', async () => {
    const app = createApp()
    const response = await request(app).get('/throw-app-error')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: '找不到資源'
      }
    })
  })

  it('should handle generic Error as 500', async () => {
    const app = createApp()
    const response = await request(app).get('/throw-error')

    expect(response.status).toBe(500)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('SERVER_ERROR')
  })
})
```

**Step 2: 執行測試確認失敗**

```bash
cd packages/backend && npm test -- errorHandler
```

Expected: FAIL

**Step 3: 實作 AppError.ts**

```typescript
// src/utils/AppError.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}
```

**Step 4: 實作 errorHandler.ts**

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // AppError - 預期的錯誤
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    })
  }

  // 未預期的錯誤
  console.error('Unexpected error:', err)

  return res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? '伺服器錯誤'
        : err.message
    }
  })
}
```

**Step 5: 執行測試確認通過**

```bash
cd packages/backend && npm test -- errorHandler
```

Expected: PASS

**Step 6: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): 實作錯誤處理中介軟體"
```

---

## Task 6: 建立 Prisma Schema

**Files:**
- Create: `packages/backend/prisma/schema.prisma`

**Step 1: 建立 schema.prisma（更新版）**

```prisma
// packages/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========== Enums ==========

enum UserRole {
  EMPLOYEE
  PM
  PRODUCER
  MANAGER
}

enum Department {
  ART
  PROGRAMMING
  PLANNING
  QA
  SOUND
  MANAGEMENT
}

enum TaskStatus {
  UNCLAIMED
  CLAIMED
  IN_PROGRESS
  PAUSED
  BLOCKED
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
}

// ========== Models ==========

model Employee {
  id            String      @id @default(cuid())
  slackId       String?     @unique
  email         String      @unique
  name          String
  avatar        String?
  role          UserRole    @default(EMPLOYEE)
  department    Department?
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations
  assignedTasks Task[]       @relation("AssignedTasks")
  createdTasks  Task[]       @relation("CreatedTasks")
  progressLogs  ProgressLog[]

  @@map("employees")
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relations
  tasks       Task[]
  milestones  Milestone[]

  @@map("projects")
}

model Milestone {
  id          String    @id @default(cuid())
  name        String
  description String?
  dueDate     DateTime
  projectId   String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks       Task[]

  @@map("milestones")
}

model Task {
  id            String       @id @default(cuid())
  title         String
  description   String?
  status        TaskStatus   @default(UNCLAIMED)
  priority      TaskPriority @default(MEDIUM)
  progress      Int          @default(0)
  estimatedHours Float?
  actualHours   Float?
  dueDate       DateTime?
  startedAt     DateTime?
  completedAt   DateTime?
  projectId     String
  milestoneId   String?
  assigneeId    String?
  createdById   String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  // Relations
  project       Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  milestone     Milestone?   @relation(fields: [milestoneId], references: [id])
  assignee      Employee?    @relation("AssignedTasks", fields: [assigneeId], references: [id])
  createdBy     Employee     @relation("CreatedTasks", fields: [createdById], references: [id])
  progressLogs  ProgressLog[]

  @@map("tasks")
}

model ProgressLog {
  id          String   @id @default(cuid())
  content     String
  progress    Int
  hoursSpent  Float?
  taskId      String
  employeeId  String
  createdAt   DateTime @default(now())

  // Relations
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  employee    Employee @relation(fields: [employeeId], references: [id])

  @@map("progress_logs")
}
```

**Step 2: 產生 Prisma Client**

```bash
cd packages/backend && npx prisma generate
```

**Step 3: Commit**

```bash
git add packages/backend/prisma/
git commit -m "feat(backend): 新增 Prisma Schema（統一欄位命名與狀態）"
```

---

## Task 7: 整合所有中介軟體到主程式

**Files:**
- Modify: `packages/backend/src/index.ts`

**Step 1: 更新 index.ts**

```typescript
// src/index.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { sendSuccess } from './middleware/responseFormatter'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Security Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API Routes (TODO: 後續 Phase 加入)
// app.use('/api/auth', authRoutes)
// app.use('/api/tasks', taskRoutes)

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: '找不到請求的資源'
    }
  })
})

// Error Handler (必須放最後)
app.use(errorHandler)

// Start server (只在非測試環境啟動)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
  })
}

export default app
```

**Step 2: 執行所有測試**

```bash
cd packages/backend && npm test
```

Expected: All PASS

**Step 3: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): 整合中介軟體到主程式"
```

---

## Task 8: 建立 Dockerfile

**Files:**
- Create: `packages/backend/Dockerfile`
- Create: `packages/backend/.dockerignore`

**Step 1: 建立 Dockerfile**

```dockerfile
# packages/backend/Dockerfile

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy built files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**Step 2: 建立 .dockerignore**

```
node_modules
dist
.env
.env.local
*.log
.git
.gitignore
README.md
tests
coverage
```

**Step 3: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): 新增 Dockerfile 用於 Zeabur 部署"
```

---

## Task 9: 更新 pnpm-workspace.yaml

**Files:**
- Modify: `pnpm-workspace.yaml`

**Step 1: 確認 workspace 設定**

```yaml
packages:
  - 'packages/*'
```

**Step 2: 安裝所有依賴**

```bash
pnpm install
```

**Step 3: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: 更新 workspace 設定"
```

---

## Phase 1 完成檢查清單

- [ ] `packages/backend/` 專案結構已建立
- [ ] TypeScript 設定正確
- [ ] Jest 測試框架運作正常
- [ ] 共用類型定義已新增到 `packages/shared/types/`
- [ ] 統一回應格式中介軟體已實作並測試
- [ ] 錯誤處理中介軟體已實作並測試
- [ ] Prisma Schema 已建立（新版欄位命名）
- [ ] Dockerfile 已建立
- [ ] 所有測試通過
- [ ] 所有變更已提交

---

**執行方式選擇：**

1. **Subagent-Driven（本 session）** - 我逐個 Task 派遣 subagent 執行，每個 Task 完成後 review

2. **手動執行** - 你自己按照計畫逐步執行，我提供支援

**選擇哪種方式？**
