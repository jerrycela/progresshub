import { prismaMock } from '../__mocks__/prisma'
import request from 'supertest'
import app from '../../src/index'

describe('Health Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /health', () => {
    it('should return healthy status when database is connected', async () => {
      ;(prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('healthy')
      expect(response.body.data.services.database.status).toBe('up')
      expect(response.body.data.services.database.latency).toBeDefined()
      expect(response.body.data.uptime).toBeDefined()
      expect(response.body.data.timestamp).toBeDefined()
    })

    it('should return unhealthy status when database is down', async () => {
      ;(prismaMock.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'))

      const response = await request(app).get('/health')

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE')
      expect(response.body.data.status).toBe('unhealthy')
      expect(response.body.data.services.database.status).toBe('down')
    })
  })

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app).get('/health/live')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('alive')
      expect(response.body.data.timestamp).toBeDefined()
    })
  })

  describe('GET /health/ready', () => {
    it('should return ready status when database is connected', async () => {
      ;(prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }])

      const response = await request(app).get('/health/ready')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('ready')
    })

    it('should return not ready status when database is down', async () => {
      ;(prismaMock.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'))

      const response = await request(app).get('/health/ready')

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NOT_READY')
      expect(response.body.data.status).toBe('not_ready')
    })
  })
})
