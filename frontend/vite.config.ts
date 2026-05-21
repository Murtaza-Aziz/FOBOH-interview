import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api/* requests to the backend during development so we don't need
// CORS headers when both run locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/openapi.json': 'http://localhost:3001',
    },
  },
});
