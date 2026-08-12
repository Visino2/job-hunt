import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Binds to all network interfaces (not just localhost) so the dev
    // server is reachable from other devices on the same Tailscale
    // network — e.g. your phone hitting your Mac's Tailscale address.
    host: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
