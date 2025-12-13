# Stage 1: Build
FROM node:20 AS builder
ARG DUMMY
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/back ./dist
# Copy the root package.json (and lockfile if present) so production
# dependencies required at runtime are installed in the final image.
COPY --from=builder /app/dist/apps/back/package.json ./package.json
RUN npm install --only=production --legacy-peer-deps
# Ensure the Nest WebSockets platform driver is present at runtime
RUN npm install --no-save --legacy-peer-deps @nestjs/platform-socket.io
COPY apps/back/.env.example .env
CMD ["node", "dist/main.js"]
