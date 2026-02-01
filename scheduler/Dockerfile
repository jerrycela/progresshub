FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Copy Prisma schema from backend
COPY ../backend/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Start application
CMD ["npm", "run", "dev"]
