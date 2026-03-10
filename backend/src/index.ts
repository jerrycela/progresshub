import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import prisma, { connectWithRetry } from "./config/database";
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
  // If ALLOWED_ORIGINS is configured, always use it (production or development)
  if (env.ALLOWED_ORIGINS.length > 0) {
    if (env.NODE_ENV !== "production") {
      // In development, also allow localhost in addition to ALLOWED_ORIGINS
      return (origin, callback) => {
        if (
          !origin ||
          env.ALLOWED_ORIGINS.includes(origin) ||
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error("CORS policy: origin not allowed"));
        }
      };
    }
    return env.ALLOWED_ORIGINS;
  }

  if (env.NODE_ENV === "production") {
    logger.warn("生產環境未設定 ALLOWED_ORIGINS，僅允許同源請求");
    return (origin, callback) => {
      if (!origin) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed: ALLOWED_ORIGINS not configured"));
      }
    };
  }

  // Development without ALLOWED_ORIGINS: allow localhost only
  return (origin, callback) => {
    if (
      !origin ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: origin not allowed"));
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

// Rate Limiting

// Auth rate limiter (IP-based, before authenticate)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max:
    parseInt(
      process.env.RATE_LIMIT_AUTH_MAX ||
        process.env.AUTH_RATE_LIMIT_MAX ||
        "10",
    ) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "請求過於頻繁，請稍後再試" },
    });
  },
});

// Global API rate limiter (IP-based DDoS protection layer)
// Note: userId-based fine-grained limiting should be added at router level after authenticate
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: parseInt(process.env.RATE_LIMIT_API_MAX || "300") || 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "請求過於頻繁，請稍後再試" },
    });
  },
});

// Auth rate limiter on sensitive endpoints (IP-based, before authenticate)
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/dev-login", authLimiter);
app.use("/api/auth/slack", authLimiter);
app.use("/api/auth/refresh", authLimiter);
// Global API rate limiter (IP-based, high threshold for DDoS protection)
app.use("/api/", globalLimiter);

// Preserve raw body for Slack signature verification
const preserveRawBody = (req: any, _res: any, buf: Buffer) => {
  req.rawBody = buf.toString();
};

app.use(express.json({ limit: "1mb", verify: preserveRawBody }));
app.use(
  express.urlencoded({ extended: true, limit: "1mb", verify: preserveRawBody }),
);
// Issue #15: 整合 Winston logger
app.use(
  morgan(env.NODE_ENV === "development" ? "dev" : "combined", {
    stream: httpLogStream,
  }),
);

// Issue #14: Swagger API 文檔
if (env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

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
    // Test database connection with retry
    await connectWithRetry();
    logger.info("Database connected successfully");

    // Start the scheduler (integrated mode)
    const enableScheduler = process.env.ENABLE_SCHEDULER !== "false";
    if (enableScheduler) {
      startScheduler();
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Scheduler: ${enableScheduler ? "enabled" : "disabled"}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info("Trust proxy config", {
        trustProxy: app.get("trust proxy"),
        note: "Expects 1 for Zeabur single-layer reverse proxy",
      });
      if (env.NODE_ENV !== "production") {
        logger.info(`API Docs: http://localhost:${env.PORT}/api-docs`);
      }
    });

    // Unified graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`[SHUTDOWN] Received ${signal}, closing gracefully...`);
      server.close(() => {
        prisma
          .$disconnect()
          .then(() => {
            logger.info("[SHUTDOWN] Cleanup complete, exiting");
            process.exit(0);
          })
          .catch(() => {
            process.exit(1);
          });
      });
      // Force exit after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error("[SHUTDOWN] Forced exit after timeout");
        process.exit(1);
      }, 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Global error handlers — catch unhandled errors to prevent silent crashes
process.on("uncaughtException", (err) => {
  logger.error("[FATAL] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("[FATAL] Unhandled rejection:", reason);
  process.exit(1);
});

startServer();

export default app;
