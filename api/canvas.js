export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  const url = new URL(req.url)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Canvas-Host',
      },
    })
  }

  // Get the Canvas domain from header
  const canvasHost = req.headers.get('x-canvas-host')
  if (!canvasHost) {
    return new Response(JSON.stringify({ error: 'Missing X-Canvas-Host header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate the host
  if (!canvasHost.includes('instructure.com') && !canvasHost.includes('canvas')) {
    return new Response(JSON.stringify({ error: 'Invalid Canvas host' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get the path after /api/canvas/
  const canvasPath = url.pathname.replace('/api/canvas/', '')
  const queryString = url.search

  // Build the Canvas API URL
  const canvasUrl = `https://${canvasHost}/api/v1/${canvasPath}${queryString}`

  try {
    const headers = {}
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const canvasRes = await fetch(canvasUrl, {
      method: req.method,
      headers,
    })

    const data = await canvasRes.text()

    return new Response(data, {
      status: canvasRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to reach Canvas API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
