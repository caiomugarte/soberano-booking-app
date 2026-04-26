import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    define: {
      'import.meta.env.VITE_TENANT_SLUG': JSON.stringify('test'),
      'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000'),
    },
  },
});
