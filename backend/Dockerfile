# ===================================
# Stage 1: Build
# ===================================
FROM node:20-alpine AS build

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ===================================
# Stage 2: Production
# ===================================
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma (CRITICAL for Alpine)
RUN apk add --no-cache openssl

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma

# Regenerate Prisma Client for production
RUN npx prisma generate

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application (auto migrate + start)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
