FROM node:20-alpine

WORKDIR /app

# Copy scheduler package files
COPY scheduler/package*.json ./
RUN npm install

# Copy prisma schema from backend
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy scheduler source code
COPY scheduler/src ./src
COPY scheduler/tsconfig.json ./

# Build TypeScript
RUN npm run build

CMD ["npm", "start"]
