import type { IncomingMessage, ServerResponse } from 'node:http'
import { normalizeCanvasHost } from './api/canvas.js'

async function readRequestBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk))
  }

  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function canvasProxyMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  if (!req.url?.startsWith('/api/canvas/')) {
    next()
    return
  }

  const rawCanvasHost = req.headers['x-canvas-host']
  const canvasHost = typeof rawCanvasHost === 'string' ? normalizeCanvasHost(rawCanvasHost) : null
  if (!rawCanvasHost) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'Missing X-Canvas-Host header' }))
    return
  }
  if (!canvasHost) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'Invalid Canvas host' }))
    return
  }

  const canvasPath = req.url.replace('/api/canvas/', '')
  const canvasUrl = `https://${canvasHost}/api/v1/${canvasPath}`

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization
    }
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type']
    }

    const method = req.method ?? 'GET'
    const fetchOptions: RequestInit = { method, headers }
    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = await readRequestBody(req)
    }

    const canvasRes = await fetch(canvasUrl, fetchOptions)
    const data = await canvasRes.text()

    res.statusCode = canvasRes.status
    res.setHeader('Content-Type', canvasRes.headers.get('content-type') || 'application/json')
    const linkHeader = canvasRes.headers.get('link')
    if (linkHeader) res.setHeader('Link', linkHeader)
    res.end(data)
  } catch {
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Failed to reach Canvas API' }))
  }
}
