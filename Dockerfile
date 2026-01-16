# Stage 1: Build
FROM node:24.12.0-slim AS builder
ARG DUMMY
WORKDIR /app
COPY package*.json ./
# Use `npm install` here to tolerate an out-of-sync lockfile during image build.
# Prefer updating the repo's package-lock.json and switching back to `npm ci` later.
RUN npm install --legacy-peer-deps --loglevel=info
COPY . .
# Build backend to produce /app/dist/apps/back
RUN npm run build:back --loglevel=info

# Stage 2: Production
FROM node:24.12.0-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app/dist/apps/back ./dist
# Copy the workspace root package.json and lockfile from the builder so
# production dependencies required at runtime are installed in the final image.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
RUN npm install --only=production --legacy-peer-deps
# Ensure the Nest WebSockets platform driver is present at runtime
RUN npm install --no-save --legacy-peer-deps @nestjs/platform-socket.io
COPY apps/back/.env.example .env
CMD ["node", "dist/main.js"]
