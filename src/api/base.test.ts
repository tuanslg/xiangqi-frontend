import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, apiUrl, wsUrl } from './base'

vi.stubGlobal('location', { protocol: 'https:', host: 'xq.example' })
afterEach(() => vi.unstubAllEnvs())

describe('API base', () => {
  it('defaults to the page origin', () => {
    vi.stubEnv('VITE_API_URL', '')
    expect(apiUrl('/api/health')).toBe('/api/health')
    expect(wsUrl()).toBe('wss://xq.example/ws')
  })

  it('uses VITE_API_URL for http and websocket, tolerating a trailing slash', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/')
    expect(apiUrl('/api/health')).toBe('https://api.example.com/api/health')
    expect(wsUrl()).toBe('wss://api.example.com/ws')
    vi.stubEnv('VITE_API_URL', 'http://localhost:3001')
    expect(wsUrl()).toBe('ws://localhost:3001/ws')
  })

  it('always sends credentials', async () => {
    const spy = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', spy)
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    await apiFetch('/api/auth/me', { method: 'POST' })
    expect(spy).toHaveBeenCalledWith('https://api.example.com/api/auth/me', { method: 'POST', credentials: 'include' })
  })
})
