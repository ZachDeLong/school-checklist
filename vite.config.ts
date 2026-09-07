import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { canvasProxyMiddleware } from './canvas-proxy'

function canvasProxyPlugin(): Plugin {
  return {
    name: 'canvas-proxy',
    configureServer(server) {
      server.middlewares.use(canvasProxyMiddleware)
    }
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), canvasProxyPlugin()],
})
