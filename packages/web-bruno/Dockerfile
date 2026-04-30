FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/web-bruno/package.json ./packages/web-bruno/

# Install all dependencies including devDeps (needed for tsc, vite)
RUN npm ci --include=dev

# Copy source
COPY packages/web-bruno ./packages/web-bruno

# Prevent local env overrides from being baked into the production bundle
RUN find packages/web-bruno -maxdepth 1 -type f \( -name '.env' -o -name '.env.*' \) ! -name '.env.example' -delete

# Build-time env vars
ARG VITE_TENANT_SLUG
ENV VITE_TENANT_SLUG=$VITE_TENANT_SLUG

# Build the React app
RUN npm -w psicologo run build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/packages/web-bruno/dist /usr/share/nginx/html
COPY packages/web-bruno/nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
