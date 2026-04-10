FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Install all dependencies including devDeps (needed for tsc, vitest, vite)
RUN npm ci --include=dev

# Copy source
COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

# Build-time env vars
ARG VITE_API_URL
ARG VITE_TENANT_SLUG
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_SLUG=$VITE_TENANT_SLUG

# Run tests — fails the build if any test fails
RUN npm -w @soberano/web run test

# Build shared types, then the React app
RUN npm -w @soberano/shared run build
RUN npm -w @soberano/web run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
