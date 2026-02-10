import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function canvasProxyPlugin(): Plugin {
  return {
    name: 'canvas-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/canvas/')) {
          return next()
        }

        const canvasHost = req.headers['x-canvas-host'] as string
        if (!canvasHost) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing X-Canvas-Host header' }))
          return
        }

        const canvasPath = req.url.replace('/api/canvas/', '')
        const canvasUrl = `https://${canvasHost}/api/v1/${canvasPath}`

        try {
          const headers: Record<string, string> = {}
          if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization as string
          }

          const canvasRes = await fetch(canvasUrl, { headers })
          const data = await canvasRes.text()

          res.statusCode = canvasRes.status
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to reach Canvas API' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), canvasProxyPlugin()],
})
