import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['@soberano/ui'],
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // bind to all interfaces so soberano.localhost resolves correctly
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false, // preserve the original Host header for tenant resolution
      },
    },
  },
});
