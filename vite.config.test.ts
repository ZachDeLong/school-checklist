import { PassThrough } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canvasProxyMiddleware } from './canvas-proxy'

function requestFor(options: { host: string; method?: string; body?: string }) {
  const request = new PassThrough() as PassThrough & IncomingMessage
  request.url = '/api/canvas/courses/7/assignments?per_page=100'
  request.method = options.method ?? 'GET'
  request.headers = {
    authorization: 'Bearer test-token',
    'content-type': 'application/json',
    'x-canvas-host': options.host,
  }
  return request
}

function responseRecorder() {
  const headers = new Map<string, string | number | readonly string[]>()
  const end = vi.fn()
  const response = {
    statusCode: 0,
    setHeader: (name: string, value: string | number | readonly string[]) => headers.set(name, value),
    end,
  } as unknown as ServerResponse
  return { response, headers, end }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Vite Canvas proxy', () => {
  it('forwards mutation methods, bodies, content type, and pagination headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {
      status: 201,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Link: '<https://school.instructure.com/api/v1/next>; rel="next"',
      },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const request = requestFor({ host: 'School.Instructure.com', method: 'POST' })
    const { response, headers } = responseRecorder()

    const handled = canvasProxyMiddleware(request, response, vi.fn())
    request.end('{"comment":"done"}')
    await handled

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://school.instructure.com/api/v1/courses/7/assignments?per_page=100')
    expect(options).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      }),
    })
    expect(new TextDecoder().decode(options.body)).toBe('{"comment":"done"}')
    expect(response.statusCode).toBe(201)
    expect(headers.get('Content-Type')).toBe('application/json; charset=utf-8')
    expect(headers.get('Link')).toContain('rel="next"')
  })

  it('rejects an unsafe outbound host before fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const request = requestFor({ host: 'instructure.com.attacker.test' })
    const { response, end } = responseRecorder()

    await canvasProxyMiddleware(request, response, vi.fn())

    expect(response.statusCode).toBe(400)
    expect(end).toHaveBeenCalledWith(JSON.stringify({ error: 'Invalid Canvas host' }))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
