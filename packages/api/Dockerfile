FROM node:20-slim

# Required by Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install all dependencies including devDeps (needed for tsc)
RUN npm ci --include=dev

# Copy source
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build shared types, then API
RUN npm -w @soberano/shared run build
RUN npm -w @soberano/api run build

# Generate Prisma client (DATABASE_URL not needed at generate time)
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npm -w @soberano/api exec -- prisma generate

EXPOSE 3000

# Run pending migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/api/prisma/schema.prisma && node packages/api/dist/server.js"]
