import request from 'supertest'
import app from '../src/index'

describe('Health Check', () => {
  it('should return success response with status ok', async () => {
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

  it('should have a valid timestamp', async () => {
    const response = await request(app).get('/health')
    const timestamp = new Date(response.body.data.timestamp)

    expect(timestamp).toBeInstanceOf(Date)
    expect(timestamp.getTime()).not.toBeNaN()
  })
})
