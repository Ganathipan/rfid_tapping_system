import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const host = env.VITE_BACKEND_HOST || '10.40.19.130'
  const port = env.VITE_BACKEND_PORT || '4000'
  return {
    plugins: [react()],
    server: {
      host: '10.40.19.130',
      port: 5173,
      proxy: {
        '/api': `http://${host}:${port}`,
      },
    },
  }
})
