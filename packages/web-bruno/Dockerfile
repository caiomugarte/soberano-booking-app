FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/web-bruno/package.json ./packages/web-bruno/

# Install all dependencies including devDeps (needed for tsc, vite)
RUN npm ci --include=dev

# Copy source
COPY packages/web-bruno ./packages/web-bruno

# Build-time env vars
ARG VITE_API_URL
ARG VITE_TENANT_SLUG
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_SLUG=$VITE_TENANT_SLUG

# Build the React app
RUN npm -w psicologo run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/packages/web-bruno/dist /usr/share/nginx/html
COPY packages/web-bruno/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
