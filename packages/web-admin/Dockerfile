FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web-admin/package.json ./packages/web-admin/

# Install all dependencies including devDeps (needed for tsc, vite)
RUN npm ci --include=dev

# Copy source
COPY packages/shared ./packages/shared
COPY packages/web-admin ./packages/web-admin

# API URL injected at build time (e.g. https://api.soberano.altion.com.br)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build shared types, then the React app
RUN npm -w @soberano/shared run build
RUN npm -w @soberano/web-admin run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/packages/web-admin/dist /usr/share/nginx/html
COPY packages/web-admin/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
