import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Binds to all network interfaces, not just localhost, so a Cloudflare
    // Tunnel (or any other local-network device) can reach this dev server.
    host: true,
    // Cloudflare's free quick tunnels assign a random *.trycloudflare.com
    // hostname on every restart, so it can't be allow-listed by name.
    // Safe to open up here since the app itself is behind APP_PASSWORD —
    // this only affects Vite's own DNS-rebinding check, not app access.
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
