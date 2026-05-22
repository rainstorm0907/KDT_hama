import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000';
const cacheDir = process.env.VITE_CACHE_DIR;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  ...(cacheDir ? { cacheDir } : {}),
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
    proxy: {
      '/api': apiProxyTarget,
    },
  },
});
