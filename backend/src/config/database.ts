import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || "";
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  if (!url.includes("connection_limit")) {
    const poolSize = parseInt(process.env.DB_POOL_SIZE || "10") || 10;
    const poolTimeout = parseInt(process.env.DB_POOL_TIMEOUT || "5") || 5;
    return `${url}${separator}connection_limit=${poolSize}&pool_timeout=${poolTimeout}`;
  }
  return url;
}

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

export async function connectWithRetry(maxRetries = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      console.log("[DB] Connected successfully");
      return;
    } catch (error) {
      console.error(`[DB] Connection attempt ${attempt}/${maxRetries} failed`);
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = attempt * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export default prisma;
