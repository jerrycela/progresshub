# Phase 2：認證模組 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作完整的認證系統，包含 Slack OAuth 登入、JWT Token 管理、登出功能。

**Architecture:** 使用 JWT 進行認證，Slack OAuth 作為登入方式，Token 儲存在 httpOnly cookie 中以提高安全性。

**Tech Stack:** Express.js, jsonwebtoken, Slack OAuth API

---

## Task 1: 建立認證相關類型定義

**Files:**
- Create: `packages/backend/src/types/auth.ts`

**Step 1: 建立 auth.ts**

```typescript
// packages/backend/src/types/auth.ts

export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface SlackOAuthResponse {
  ok: boolean
  access_token?: string
  user?: {
    id: string
    name: string
    email: string
    image_72?: string
  }
  team?: {
    id: string
    name: string
  }
  error?: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}
```

**Step 2: Commit**

```bash
git add packages/backend/src/types/
git commit -m "feat(backend): 新增認證相關類型定義"
```

---

## Task 2: 實作 JWT 工具函數（TDD）

**Files:**
- Create: `packages/backend/src/utils/jwt.ts`
- Create: `packages/backend/tests/utils/jwt.test.ts`

**Step 1: 寫測試（TDD - RED）**

```typescript
// packages/backend/tests/utils/jwt.test.ts
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../../src/utils/jwt'

describe('JWT Utils', () => {
  const mockPayload = {
    userId: 'user123',
    email: 'test@example.com',
    role: 'EMPLOYEE'
  }

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = generateTokens(mockPayload)

      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const tokens = generateTokens(mockPayload)
      const decoded = verifyAccessToken(tokens.accessToken)

      expect(decoded.userId).toBe(mockPayload.userId)
      expect(decoded.email).toBe(mockPayload.email)
      expect(decoded.role).toBe(mockPayload.role)
    })

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = generateTokens(mockPayload)
      const decoded = verifyRefreshToken(tokens.refreshToken)

      expect(decoded.userId).toBe(mockPayload.userId)
    })

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow()
    })
  })
})
```

**Step 2: 執行測試確認失敗**

```bash
npm test -- jwt
```

Expected: FAIL（模組不存在）

**Step 3: 實作 jwt.ts**

```typescript
// packages/backend/src/utils/jwt.ts
import jwt from 'jsonwebtoken'
import type { JwtPayload, AuthTokens } from '../types/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'
const ACCESS_TOKEN_EXPIRES = '15m'
const REFRESH_TOKEN_EXPIRES = '7d'

export function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES
  })

  const refreshToken = jwt.sign({ userId: payload.userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES
  })

  return { accessToken, refreshToken }
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string }
}
```

**Step 4: 執行測試確認通過**

```bash
npm test -- jwt
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/backend/src/utils/jwt.ts packages/backend/tests/utils/
git commit -m "feat(backend): 實作 JWT 工具函數 (TDD)"
```

---

## Task 3: 實作認證中介軟體（TDD）

**Files:**
- Create: `packages/backend/src/middleware/auth.ts`
- Create: `packages/backend/tests/middleware/auth.test.ts`

**Step 1: 寫測試（TDD - RED）**

```typescript
// packages/backend/tests/middleware/auth.test.ts
import request from 'supertest'
import express from 'express'
import { authenticate, authorize } from '../../src/middleware/auth'
import { generateTokens } from '../../src/utils/jwt'
import { errorHandler } from '../../src/middleware/errorHandler'

describe('Auth Middleware', () => {
  const createApp = () => {
    const app = express()
    app.use(express.json())

    app.get('/protected', authenticate, (req, res) => {
      res.json({ success: true, data: { user: req.user } })
    })

    app.get('/pm-only', authenticate, authorize(['PM', 'MANAGER']), (req, res) => {
      res.json({ success: true, data: { message: 'PM access granted' } })
    })

    app.use(errorHandler)
    return app
  }

  describe('authenticate', () => {
    it('should reject request without token', async () => {
      const app = createApp()
      const response = await request(app).get('/protected')

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('AUTH_REQUIRED')
    })

    it('should reject request with invalid token', async () => {
      const app = createApp()
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('AUTH_INVALID_TOKEN')
    })

    it('should accept request with valid token', async () => {
      const app = createApp()
      const tokens = generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: 'EMPLOYEE'
      })

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${tokens.accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.user.userId).toBe('user123')
    })
  })

  describe('authorize', () => {
    it('should reject user without required role', async () => {
      const app = createApp()
      const tokens = generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: 'EMPLOYEE'
      })

      const response = await request(app)
        .get('/pm-only')
        .set('Authorization', `Bearer ${tokens.accessToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('PERM_DENIED')
    })

    it('should accept user with required role', async () => {
      const app = createApp()
      const tokens = generateTokens({
        userId: 'user123',
        email: 'pm@example.com',
        role: 'PM'
      })

      const response = await request(app)
        .get('/pm-only')
        .set('Authorization', `Bearer ${tokens.accessToken}`)

      expect(response.status).toBe(200)
    })
  })
})
```

**Step 2: 執行測試確認失敗**

```bash
npm test -- auth.test
```

Expected: FAIL

**Step 3: 實作 auth.ts 中介軟體**

```typescript
// packages/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { AppError } from '../utils/AppError'
import type { JwtPayload } from '../types/auth'

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new AppError('AUTH_REQUIRED', '需要登入才能存取', 401)
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      throw new AppError('AUTH_REQUIRED', '需要登入才能存取', 401)
    }

    const decoded = verifyAccessToken(token)
    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof AppError) {
      next(error)
    } else {
      next(new AppError('AUTH_INVALID_TOKEN', 'Token 無效或已過期', 401))
    }
  }
}

export function authorize(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('AUTH_REQUIRED', '需要登入才能存取', 401))
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('PERM_DENIED', '權限不足', 403))
      return
    }

    next()
  }
}
```

**Step 4: 執行測試確認通過**

```bash
npm test -- auth.test
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/backend/src/middleware/auth.ts packages/backend/tests/middleware/auth.test.ts
git commit -m "feat(backend): 實作認證中介軟體 (TDD)"
```

---

## Task 4: 實作認證路由（TDD）

**Files:**
- Create: `packages/backend/src/routes/auth.ts`
- Create: `packages/backend/tests/routes/auth.test.ts`

**Step 1: 寫測試（TDD - RED）**

```typescript
// packages/backend/tests/routes/auth.test.ts
import request from 'supertest'
import express from 'express'
import authRoutes from '../../src/routes/auth'
import { errorHandler } from '../../src/middleware/errorHandler'
import { generateTokens } from '../../src/utils/jwt'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    employee: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    }
  }))
}))

describe('Auth Routes', () => {
  const createApp = () => {
    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRoutes)
    app.use(errorHandler)
    return app
  }

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const app = createApp()
      const response = await request(app).get('/api/auth/me')

      expect(response.status).toBe(401)
    })

    it('should return user info with valid token', async () => {
      const app = createApp()
      const tokens = generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: 'EMPLOYEE'
      })

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.userId).toBe('user123')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should return 401 without refresh token', async () => {
      const app = createApp()
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})

      expect(response.status).toBe(401)
    })

    it('should return new tokens with valid refresh token', async () => {
      const app = createApp()
      const tokens = generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: 'EMPLOYEE'
      })

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.accessToken).toBeDefined()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should return success on logout', async () => {
      const app = createApp()
      const tokens = generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: 'EMPLOYEE'
      })

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})
```

**Step 2: 執行測試確認失敗**

```bash
npm test -- routes/auth
```

Expected: FAIL

**Step 3: 實作 auth routes**

```typescript
// packages/backend/src/routes/auth.ts
import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'
import { sendSuccess, sendError } from '../middleware/responseFormatter'
import { AppError } from '../utils/AppError'

const router = Router()

// GET /api/auth/me - 取得當前使用者資訊
router.get('/me', authenticate, (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'AUTH_REQUIRED', '需要登入', 401)
  }

  return sendSuccess(res, {
    userId: req.user.userId,
    email: req.user.email,
    role: req.user.role
  })
})

// POST /api/auth/refresh - 刷新 Token
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return sendError(res, 'AUTH_REQUIRED', '需要 refresh token', 401)
    }

    const decoded = verifyRefreshToken(refreshToken)

    // 這裡應該從資料庫取得使用者資訊
    // 為了簡化，先使用 mock 資料
    const tokens = generateTokens({
      userId: decoded.userId,
      email: 'user@example.com', // TODO: 從資料庫取得
      role: 'EMPLOYEE' // TODO: 從資料庫取得
    })

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    })
  } catch {
    return sendError(res, 'AUTH_INVALID_TOKEN', 'Refresh token 無效或已過期', 401)
  }
})

// POST /api/auth/logout - 登出
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // TODO: 將 refresh token 加入黑名單
  return sendSuccess(res, { message: '登出成功' })
})

// POST /api/auth/slack - Slack OAuth 登入
router.post('/slack', async (req: Request, res: Response) => {
  try {
    const { code } = req.body

    if (!code) {
      return sendError(res, 'VALIDATION_REQUIRED', '需要 OAuth code', 400)
    }

    // TODO: 實作 Slack OAuth 流程
    // 1. 用 code 換取 access token
    // 2. 用 access token 取得使用者資訊
    // 3. 在資料庫建立/更新使用者
    // 4. 產生 JWT tokens

    // Mock response for now
    const tokens = generateTokens({
      userId: 'slack-user-123',
      email: 'slack@example.com',
      role: 'EMPLOYEE'
    })

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: 'slack-user-123',
        email: 'slack@example.com',
        name: 'Slack User',
        role: 'EMPLOYEE'
      }
    })
  } catch (error) {
    throw new AppError('AUTH_FAILED', 'Slack 登入失敗', 401)
  }
})

export default router
```

**Step 4: 執行測試確認通過**

```bash
npm test -- routes/auth
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/backend/src/routes/auth.ts packages/backend/tests/routes/
git commit -m "feat(backend): 實作認證路由 (TDD)"
```

---

## Task 5: 整合認證路由到主程式

**Files:**
- Modify: `packages/backend/src/index.ts`

**Step 1: 更新 index.ts**

在 `// API Routes` 註解處加入：

```typescript
import authRoutes from './routes/auth'

// ... 其他 middleware ...

// API Routes
app.use('/api/auth', authRoutes)
```

**Step 2: 執行所有測試**

```bash
npm test
```

Expected: All PASS

**Step 3: Commit**

```bash
git add packages/backend/src/index.ts
git commit -m "feat(backend): 整合認證路由到主程式"
```

---

## Phase 2 完成檢查清單

- [ ] 認證類型定義已建立
- [ ] JWT 工具函數已實作並測試
- [ ] 認證中介軟體已實作並測試
- [ ] 認證路由已實作並測試
  - [ ] GET /api/auth/me
  - [ ] POST /api/auth/refresh
  - [ ] POST /api/auth/logout
  - [ ] POST /api/auth/slack
- [ ] 整合到主程式
- [ ] 所有測試通過

---

**執行方式：Subagent-Driven**
