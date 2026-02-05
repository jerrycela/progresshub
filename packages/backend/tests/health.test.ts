import { prismaMock } from './__mocks__/prisma'
import request from 'supertest'
import app from '../src/index'

describe('Health Check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return success response with status healthy', async () => {
    ;(prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'healthy'
      }
    })
    expect(response.body.data.timestamp).toBeDefined()
  })

  it('should have a valid timestamp', async () => {
    ;(prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

    const response = await request(app).get('/health')
    const timestamp = new Date(response.body.data.timestamp)

    expect(timestamp).toBeInstanceOf(Date)
    expect(timestamp.getTime()).not.toBeNaN()
  })
})
