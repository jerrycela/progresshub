import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import prisma from './config/database';
import logger, { httpLogStream } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startScheduler } from './scheduler/reminder';
import routes from './routes';
import healthRoutes from './routes/health';

const app: Application = express();

// Middleware
app.use(helmet()); // Security headers

// Issue #2 修復：CORS 白名單配置
const corsOptions = {
  origin:
    env.NODE_ENV === 'production'
      ? env.ALLOWED_ORIGINS.length > 0
        ? env.ALLOWED_ORIGINS
        : ['https://your-domain.com']
      : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Issue #3 修復：Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每個 IP 最多 100 次請求
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 登入嘗試限制更嚴格
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Issue #15: 整合 Winston logger
app.use(
  morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
    stream: httpLogStream,
  })
);

// Issue #14: Swagger API 文檔
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Issue #16: 增強健康檢查端點
app.use('/health', healthRoutes);

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Start the scheduler (integrated mode)
    const enableScheduler = process.env.ENABLE_SCHEDULER !== 'false';
    if (enableScheduler) {
      startScheduler();
    }

    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Scheduler: ${enableScheduler ? 'enabled' : 'disabled'}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`API Docs: http://localhost:${env.PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
