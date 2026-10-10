import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Regency — FiveM server website
// In production, /fivem-api/* is reverse-proxied by Caddy (see Caddyfile).
// In local dev, Vite proxies the same path so `npm run dev` behaves identically.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: ['**/public/images/gallery/**'],
    },
    proxy: {
      '/fivem-api': {
        target: 'https://servers-frontend.fivem.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fivem-api/, ''),
      },
      // Backend (se /server) — kører lokalt på port 4000, se server/README.md
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
})
