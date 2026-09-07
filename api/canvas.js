export const config = {
  runtime: 'edge',
}

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function configuredCanvasHosts() {
  const value = globalThis.process?.env?.CANVAS_ALLOWED_HOSTS ?? ''
  return value.split(',').map((host) => host.trim()).filter(Boolean)
}

/**
 * Accept Canvas-owned hosts by default and exact, deployment-configured custom
 * domains. The header must contain only a DNS hostname, never a URL or port.
 */
export function normalizeCanvasHost(rawHost, additionalHosts = configuredCanvasHosts()) {
  const hostname = rawHost?.trim().toLowerCase()
  if (!hostname || !HOSTNAME_PATTERN.test(hostname)) return null

  const isInstructureHost = hostname === 'instructure.com' || hostname.endsWith('.instructure.com')
  const isConfiguredHost = additionalHosts.some((host) => host.trim().toLowerCase() === hostname)

  return isInstructureHost || isConfiguredHost ? hostname : null
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
  const rawCanvasHost = req.headers.get('x-canvas-host')
  if (!rawCanvasHost) {
    return new Response(JSON.stringify({ error: 'Missing X-Canvas-Host header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate and normalize before using user-controlled input in an outbound URL.
  const canvasHost = normalizeCanvasHost(rawCanvasHost)
  if (!canvasHost) {
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
    const headers = {
      'Accept': 'application/json',
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const contentType = req.headers.get('content-type')
    if (contentType) {
      headers['Content-Type'] = contentType
    }

    const fetchOptions = {
      method: req.method,
      headers,
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = await req.arrayBuffer()
    }

    const canvasRes = await fetch(canvasUrl, fetchOptions)

    const data = await canvasRes.text()

    const responseHeaders = {
      'Content-Type': canvasRes.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    }

    // Forward Link header for pagination
    const linkHeader = canvasRes.headers.get('link')
    if (linkHeader) {
      responseHeaders['Link'] = linkHeader
    }

    return new Response(data, {
      status: canvasRes.status,
      headers: responseHeaders,
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach Canvas API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
