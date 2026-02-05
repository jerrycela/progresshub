import request from 'supertest'
import express from 'express'
import { errorHandler } from '../../src/middleware/errorHandler'
import { AppError } from '../../src/utils/AppError'

describe('Error Handler', () => {
  const createApp = () => {
    const app = express()
    app.use(express.json())

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
