import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendHost = env.VITE_BACKEND_HOST || '192.168.8.2';
  const backendPort = env.VITE_BACKEND_PORT || '4000';
  
  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST || '192.168.8.2',
      port: parseInt(env.VITE_DEV_PORT, 10) || 5173,
      proxy: {
        '/api': `http://${backendHost}:${backendPort}`,
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
