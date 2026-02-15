import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import prisma from "./config/database";
import logger, { httpLogStream } from "./config/logger";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { startScheduler } from "./scheduler/reminder";
import routes from "./routes";
import healthRoutes from "./routes/health";

const app: Application = express();

// Trust proxy (required for rate limiter behind Zeabur/reverse proxy)
app.set("trust proxy", 1);

// Middleware
app.use(helmet()); // Security headers

// CORS 白名單配置（安全強化版）
// 生產環境必須設定 ALLOWED_ORIGINS 環境變數（逗號分隔多個 origin）
// 開發環境允許 localhost 存取
const getCorsOrigin = (): cors.CorsOptions["origin"] => {
  if (env.NODE_ENV === "production") {
    if (env.ALLOWED_ORIGINS.length === 0) {
      logger.warn("生產環境未設定 ALLOWED_ORIGINS，僅允許同源請求");
      // 允許同源請求（origin 為 undefined 時表示同源或非瀏覽器請求）
      return (origin, callback) => {
        if (!origin) {
          callback(null, true);
        } else {
          callback(
            new Error("CORS not allowed: ALLOWED_ORIGINS not configured"),
          );
        }
      };
    }
    return env.ALLOWED_ORIGINS;
  }
  // 開發環境：允許 localhost 的各種埠號
  return (origin, callback) => {
    if (
      !origin ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS 不允許來自 ${origin} 的請求`));
    }
  };
};

const corsOptions: cors.CorsOptions = {
  origin: getCorsOrigin(),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Rate Limiting: 每使用者 120 req/min（支援 200 人同時在線）
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 120, // 每位使用者 120 次/分
  keyGenerator: (req) => {
    const authReq = req as { user?: { userId: string } };
    return authReq.user?.userId || req.ip || "anonymous";
  },
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 10, // 登入嘗試限制
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/dev-login", authLimiter);

app.use(express.json({ limit: "1mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: "1mb" })); // Parse URL-encoded bodies
// Issue #15: 整合 Winston logger
app.use(
  morgan(env.NODE_ENV === "development" ? "dev" : "combined", {
    stream: httpLogStream,
  }),
);

// Issue #14: Swagger API 文檔
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Issue #16: 增強健康檢查端點
app.use("/health", healthRoutes);

// API Routes
app.use("/api", routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Database connected successfully");

    // Start the scheduler (integrated mode)
    const enableScheduler = process.env.ENABLE_SCHEDULER !== "false";
    if (enableScheduler) {
      startScheduler();
    }

    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Scheduler: ${enableScheduler ? "enabled" : "disabled"}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`API Docs: http://localhost:${env.PORT}/api-docs`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
