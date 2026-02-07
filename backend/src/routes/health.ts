import { Router } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get("/", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check (includes database)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service not ready
 */
router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    sendError(res, "SERVICE_NOT_READY", "Service not ready", 503, {
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get("/live", (_req, res) => {
  sendSuccess(res, {
    status: "alive",
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

export default router;
