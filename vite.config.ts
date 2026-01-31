import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/canvas-api': {
          target: 'https://ivc.instructure.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/canvas-api/, '/api/v1'),
          headers: {
            'Authorization': `Bearer ${env.VITE_CANVAS_TOKEN}`
          }
        }
      }
    }
  }
})
