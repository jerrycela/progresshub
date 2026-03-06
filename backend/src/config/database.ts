import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
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
