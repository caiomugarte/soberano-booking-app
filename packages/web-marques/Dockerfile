FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/web-marques/package.json ./packages/web-marques/

RUN npm ci --include=dev

COPY packages/web-marques ./packages/web-marques

# Build-time env vars (Vite bakes these into the bundle)
ARG VITE_API_URL
ARG VITE_TENANT_SLUG
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_SLUG=$VITE_TENANT_SLUG

RUN npm -w @soberano/web-marques run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/packages/web-marques/dist /usr/share/nginx/html
COPY packages/web-marques/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
