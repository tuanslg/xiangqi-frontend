import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module without types
import { buildHeaders } from './headers.mjs'

const csp = (out: string) => out.split('\n').find((l) => l.includes('Content-Security-Policy-Report-Only'))!

describe('buildHeaders', () => {
  it('allows only same-origin connections when there is no separate API', () => {
    expect(csp(buildHeaders(''))).toContain("connect-src 'self' https://accounts.google.com/gsi/;")
  })

  it('adds the API origin and its websocket origin, ignoring path and trailing slash', () => {
    const line = csp(buildHeaders('https://api.example.com/'))
    expect(line).toContain("connect-src 'self' https://api.example.com wss://api.example.com https://accounts.google.com/gsi/")
  })

  it('fails the build on a malformed API url', () => {
    expect(() => buildHeaders('not a url')).toThrow()
  })

  it('caches fingerprinted assets forever and locks down framing', () => {
    const out = buildHeaders('https://api.example.com')
    expect(out).toMatch(/\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/)
    expect(out).toContain('X-Frame-Options: DENY')
    expect(out).toContain('Cross-Origin-Opener-Policy: same-origin-allow-popups')
  })
})
