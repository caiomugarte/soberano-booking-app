import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars!!',
      BASE_URL: 'http://localhost:5173',
      ALLOWED_ORIGINS: 'http://localhost:5173',
      SUPER_ADMIN_JWT_SECRET: 'test-super-admin-jwt-secret-min-32-chars!!',
      SUPER_ADMIN_EMAIL: 'admin@test.com',
      SUPER_ADMIN_PASSWORD_HASH: 'test-password-hash-placeholder',
      INTERNAL_API_SECRET: 'test-internal-api-secret-16c!!',
    },
  },
  resolve: {
    alias: {
      '@soberano/shared': path.resolve('../shared/src/index.ts'),
    },
  },
});
