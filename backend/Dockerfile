# ===================================
# Stage 1: Build
# ===================================
FROM node:20-alpine AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (lockfile is at monorepo root, not in backend/)
COPY package.json ./
RUN pnpm install

# Copy source code
COPY . .

# Build TypeScript (includes prisma generate)
RUN pnpm run build

# ===================================
# Stage 2: Production
# ===================================
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma (CRITICAL for Alpine)
RUN apk add --no-cache openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy production dependencies
COPY package.json ./
RUN pnpm install --prod

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma

# Create logs directory for Winston file transport
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application (auto migrate + start)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
