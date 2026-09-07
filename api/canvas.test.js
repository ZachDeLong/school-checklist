import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { normalizeCanvasHost } from './canvas.js'

function requestFor(host, options = {}) {
  const method = options.method ?? 'GET'
  return new Request(
    'https://checklist.example/api/canvas/courses?enrollment_state=active',
    {
      method,
      body: options.body,
      headers: {
        'Authorization': 'Bearer test-token',
        'X-Canvas-Host': host,
        ...(options.contentType ? { 'Content-Type': options.contentType } : {}),
      },
    },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeCanvasHost', () => {
  it('accepts Canvas-owned subdomains and normalizes case', () => {
    expect(normalizeCanvasHost('  IVC-New.Instructure.com  ', [])).toBe('ivc-new.instructure.com')
  })

  it('accepts an exact custom domain only when configured', () => {
    expect(normalizeCanvasHost('canvas.school.edu', ['canvas.school.edu'])).toBe('canvas.school.edu')
    expect(normalizeCanvasHost('canvas.school.edu', [])).toBeNull()
  })

  it.each([
    'instructure.com.attacker.test',
    'canvas-attacker.test',
    'https://school.instructure.com',
    'school.instructure.com/path',
    'school.instructure.com:443',
    'school.instructure.com@127.0.0.1',
    'canvas',
  ])('rejects unsafe host input: %s', (host) => {
    expect(normalizeCanvasHost(host, [])).toBeNull()
  })
})

describe('Canvas proxy', () => {
  it('rejects a deceptive hostname without making an outbound request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler(requestFor('instructure.com.attacker.test'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid Canvas host' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards a valid host using its normalized hostname', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await handler(requestFor('IVC-New.Instructure.com'))

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ivc-new.instructure.com/api/v1/courses?enrollment_state=active',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('body')
  })

  it('forwards mutation bodies and their content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const payload = JSON.stringify({ comment: { text_comment: 'Done' } })
    const response = await handler(requestFor('school.instructure.com', {
      method: 'POST',
      body: payload,
      contentType: 'application/json',
    }))

    expect(response.status).toBe(200)
    const [, options] = fetchMock.mock.calls[0]
    expect(options).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      }),
    })
    expect(new TextDecoder().decode(options.body)).toBe(payload)
  })
})
