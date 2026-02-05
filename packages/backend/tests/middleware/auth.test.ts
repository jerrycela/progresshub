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
