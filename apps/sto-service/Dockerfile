FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json tsconfig.base.json ./

# Copy all source code
COPY apps/sto-service ./apps/sto-service
COPY libs/shared/sto-types ./libs/shared/sto-types

# Install dependencies
RUN npm ci --legacy-peer-deps

# Build the application
RUN npx nx build sto-service --configuration=production

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist/apps/sto-service ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001 3002

CMD ["node", "dist/main.js"]
