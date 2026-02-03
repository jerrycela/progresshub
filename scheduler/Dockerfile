# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Note: Prisma schema must be copied before building
# For Zeabur: use zeabur.json to copy from backend/prisma
# For Docker Compose: mount as volume

# Generate Prisma Client (if prisma folder exists)
RUN if [ -d "./prisma" ]; then npx prisma generate; fi

# Start application
CMD ["npm", "run", "dev"]

# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN if [ -d "./prisma" ]; then npx prisma generate; fi
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy production dependencies and build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Copy Prisma files if they exist
COPY --from=build /app/prisma ./prisma 2>/dev/null || true

RUN if [ -d "./prisma" ]; then npx prisma generate; fi

# Run production server
CMD ["node", "dist/index.ts"]
