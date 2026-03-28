FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install all dependencies
RUN npm ci

# Copy source
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Build shared types, then the React app
RUN npm -w @soberano/shared run build
RUN npm -w @soberano/web run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
