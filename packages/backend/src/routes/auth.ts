import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'
import { sendSuccess, sendError } from '../middleware/responseFormatter'

const router = Router()

// GET /api/auth/me
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

// POST /api/auth/refresh
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return sendError(res, 'AUTH_REQUIRED', '需要 refresh token', 401)
    }

    const decoded = verifyRefreshToken(refreshToken)

    const tokens = generateTokens({
      userId: decoded.userId,
      email: 'user@example.com',
      role: 'EMPLOYEE'
    })

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    })
  } catch {
    return sendError(res, 'AUTH_INVALID_TOKEN', 'Refresh token 無效或已過期', 401)
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  return sendSuccess(res, { message: '登出成功' })
})

// POST /api/auth/slack
router.post('/slack', async (req: Request, res: Response) => {
  const { code } = req.body

  if (!code) {
    return sendError(res, 'VALIDATION_REQUIRED', '需要 OAuth code', 400)
  }

  // Mock response
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
})

export default router
