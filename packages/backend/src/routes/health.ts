import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { sendSuccess, sendError } from '../middleware/responseFormatter'

const router = Router()

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceStatus
  }
}

interface ServiceStatus {
  status: 'up' | 'down'
  latency?: number
  message?: string
}

// GET /health - Basic health check
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now()

  // Check database connectivity
  let dbStatus: ServiceStatus
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart
    dbStatus = {
      status: 'up',
      latency: dbLatency
    }
  } catch (error) {
    dbStatus = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Database connection failed'
    }
  }

  // Determine overall health
  const isHealthy = dbStatus.status === 'up'

  const healthStatus: HealthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: dbStatus
    }
  }

  if (isHealthy) {
    return sendSuccess(res, healthStatus)
  } else {
    // Return unhealthy status with details directly
    return res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service is unhealthy' },
      data: healthStatus
    })
  }
})

// GET /health/live - Kubernetes liveness probe
router.get('/live', (_req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

// GET /health/ready - Kubernetes readiness probe
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`

    return sendSuccess(res, {
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: { code: 'NOT_READY', message: 'Service is not ready' },
      data: {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
})

export default router
