# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
# Install all dependencies including devDependencies for TypeScript compilation
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy production dependencies and build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./

# Generate Prisma Client for production
RUN npx prisma generate

EXPOSE 3000

# Run production server
CMD ["node", "dist/index.js"]
