# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build:back

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/back ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --legacy-peer-deps
COPY apps/back/.env.example .env
CMD ["node", "dist/main.js"]
