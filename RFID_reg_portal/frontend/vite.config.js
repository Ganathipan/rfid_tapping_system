import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',     // 👈 expose to LAN so phone can connect
    port: 5173,          // optional, default 5173
    proxy: {
      '/api': 'http://192.168.8.3:4000', // backend address
    },
  },
})
