import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://localhost:3000'

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
      port: 5173,
      // Proxy REST + WebSocket tới Backend Nuxt.js khi chạy dev
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/realtime': { target: backend.replace(/^http/, 'ws'), ws: true }
      }
    }
  }
})
