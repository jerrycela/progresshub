import request from 'supertest'
import express from 'express'
import authRoutes from '../../src/routes/auth'
import { errorHandler } from '../../src/middleware/errorHandler'
import { generateTokens } from '../../src/utils/jwt'

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

  describe('POST /api/auth/slack', () => {
    it('should return 400 without code', async () => {
      const app = createApp()
      const response = await request(app)
        .post('/api/auth/slack')
        .send({})

      expect(response.status).toBe(400)
    })

    it('should return tokens with code', async () => {
      const app = createApp()
      const response = await request(app)
        .post('/api/auth/slack')
        .send({ code: 'mock-code' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.accessToken).toBeDefined()
    })
  })
})
