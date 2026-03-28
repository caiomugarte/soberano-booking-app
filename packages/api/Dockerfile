FROM node:20-slim

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install all dependencies
RUN npm ci

# Copy source
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build shared types, then API
RUN npm -w @soberano/shared run build
RUN npm -w @soberano/api run build

# Generate Prisma client for the current platform
RUN npm -w @soberano/api exec -- prisma generate

EXPOSE 3000

# Run pending migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=packages/api/prisma/schema.prisma && node packages/api/dist/server.js"]
