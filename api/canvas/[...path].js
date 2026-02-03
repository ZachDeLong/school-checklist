export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Canvas-Host')
    return res.status(200).end()
  }

  // Get the Canvas domain from header
  const canvasHost = req.headers['x-canvas-host']
  if (!canvasHost) {
    return res.status(400).json({ error: 'Missing X-Canvas-Host header' })
  }

  // Validate the host looks like a Canvas instance
  if (!canvasHost.includes('instructure.com') && !canvasHost.includes('canvas')) {
    return res.status(400).json({ error: 'Invalid Canvas host' })
  }

  // Get the path from the catch-all route
  const { path, ...queryParams } = req.query
  const canvasPath = Array.isArray(path) ? path.join('/') : path

  // Build query string from remaining params
  const queryString = Object.entries(queryParams)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  // Build the Canvas API URL
  const canvasUrl = `https://${canvasHost}/api/v1/${canvasPath}${queryString ? `?${queryString}` : ''}`

  // Forward the request to Canvas
  const headers = {
    'Content-Type': 'application/json',
  }

  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization
  }

  try {
    const canvasRes = await fetch(canvasUrl, {
      method: req.method,
      headers,
    })

    const data = await canvasRes.text()

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Canvas-Host')

    return res.status(canvasRes.status).send(data)
  } catch (error) {
    console.error('Canvas proxy error:', error)
    return res.status(500).json({ error: 'Failed to reach Canvas API' })
  }
}
