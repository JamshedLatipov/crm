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
RUN npx nx build front --configuration=nets

# Production stage
FROM nginx:stable-alpine AS runner

# Install OpenSSL for generating self-signed certificates
RUN apk add --no-cache openssl

# Generate self-signed SSL certificate
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=CRM/OU=IT/CN=localhost"

# Replace default nginx config with SPA-friendly config (we copy a file below)
RUN rm /etc/nginx/conf.d/default.conf || true
# nginx.conf is located at apps/front/nginx.conf in the repo root build context
COPY apps/front/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts. Adjust path if your build outputs elsewhere.
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /workspace/dist/apps/front/browser /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
