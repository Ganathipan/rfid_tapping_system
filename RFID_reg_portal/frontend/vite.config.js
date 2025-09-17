import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devHost = env.VITE_DEV_HOST || '0.0.0.0'
  const devPort = Number(env.VITE_DEV_PORT) || 5173
  const apiTarget = env.VITE_PROXY_TARGET || env.VITE_API_BASE || 'http://192.168.8.2:4000'

  return {
    plugins: [react()],
    server: {
      host: devHost,
      port: devPort,
      proxy: {
        '/api': apiTarget,
      },
    },
  }
})
