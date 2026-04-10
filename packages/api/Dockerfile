FROM node:20-slim

# Required by Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install all dependencies including devDeps (needed for tsc, vitest)
RUN npm ci --include=dev

# Copy source
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Generate Prisma client before tests (tests import PrismaClient)
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npm -w @soberano/api exec -- prisma generate

# Run tests with dummy env vars so env.ts validation passes
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    JWT_SECRET="testsecretthatisfortycharacterslong1234567890ab" \
    JWT_REFRESH_SECRET="testrefreshsecretthatisfortycharacterslong12345" \
    SUPER_ADMIN_JWT_SECRET="testsuperadminjwtsecretfortycharacterslong12345" \
    SUPER_ADMIN_EMAIL="test@example.com" \
    SUPER_ADMIN_PASSWORD_HASH='$2a$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
    ALLOWED_ORIGINS="http://localhost:5173" \
    npm -w @soberano/shared run test && \
    DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    JWT_SECRET="testsecretthatisfortycharacterslong1234567890ab" \
    JWT_REFRESH_SECRET="testrefreshsecretthatisfortycharacterslong12345" \
    SUPER_ADMIN_JWT_SECRET="testsuperadminjwtsecretfortycharacterslong12345" \
    SUPER_ADMIN_EMAIL="test@example.com" \
    SUPER_ADMIN_PASSWORD_HASH='$2a$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
    ALLOWED_ORIGINS="http://localhost:5173" \
    npm -w @soberano/api run test

# Build shared types, then API
RUN npm -w @soberano/shared run build
RUN npm -w @soberano/api run build

EXPOSE 3000

# Run pending migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/api/prisma/schema.prisma && node packages/api/dist/server.js"]
