# Multi-stage build for the frontend (Angular + Vite)
# Build stage
FROM node:24-alpine AS builder
WORKDIR /workspace

# NOTE: This Dockerfile expects the build context to be the repository root.
# Build command (from repo root):
# docker build -f apps/front/Dockerfile -t front .

# Copy repository into the image first
COPY . .

# Install all dependencies from the root (including devDependencies for the build)
# Use `npm install` since this repo doesn't have a package-lock.json at the root.
# Don't set NODE_ENV=production here as we need devDependencies (nx, @angular/cli, etc.)
RUN npm install --legacy-peer-deps

# Run the Nx build using the locally installed binary
RUN npx nx build front

# Production stage
FROM nginx:stable-alpine AS runner

# Replace default nginx config with SPA-friendly config (we copy a file below)
RUN rm /etc/nginx/conf.d/default.conf || true
# nginx.conf is located at apps/front/nginx.conf in the repo root build context
COPY apps/front/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts. Adjust path if your build outputs elsewhere.
COPY --from=builder /workspace/dist/apps/front /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
