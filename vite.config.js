import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiTarget = env.VITE_DEV_API_TARGET
    || (env.VITE_API_URL ? env.VITE_API_URL.replace(/\/api\/?$/, '') : '')
    || 'http://localhost:5000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      sourcemap: false,
    }
  };
});
