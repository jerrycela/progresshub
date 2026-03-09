# ===================================
# Stage 1: Build
# ===================================
FROM node:20-alpine AS build

WORKDIR /app

# Install OpenSSL for Prisma generate (CRITICAL for Alpine)
RUN apk add --no-cache openssl

# Install ALL dependencies including devDependencies for build
# (NODE_ENV=production from Zeabur env would skip devDeps, so override here)
COPY package.json ./
RUN NODE_ENV=development npm install

# Copy source code
COPY . .

# Build TypeScript (includes prisma generate)
RUN npm run build

# Compile seed script for production use (seed uses upsert, safe to re-run)
RUN npx tsc --esModuleInterop --skipLibCheck --module commonjs \
    --moduleResolution node --target ES2020 --outDir seed-out prisma/seed.ts

# ===================================
# Stage 2: Production
# ===================================
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma (CRITICAL for Alpine)
RUN apk add --no-cache openssl

# Copy production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/seed-out/seed.js ./prisma/seed.js

# Create logs directory for Winston file transport
RUN mkdir -p logs

# Set environment
ENV NODE_ENV=production

# Expose port (Zeabur sets WEB_PORT=8080; PORT env var must match)
EXPOSE 8080

# Health check (must match actual listening port)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health/ready || exit 1

# Start application (auto migrate + start)
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node dist/index.js"]
