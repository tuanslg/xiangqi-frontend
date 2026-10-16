/**
 * Content of the `_headers` file for static hosts (Cloudflare Pages, Netlify). The CSP has to name the
 * API origin in connect-src, so it is generated at build time from VITE_API_URL.
 */
export function buildHeaders(apiUrl = '') {
  const api = apiUrl.trim().replace(/\/+$/, '')
  const apiOrigins = []
  if (api) {
    const u = new URL(api) // throws on a malformed URL, failing the build early
    apiOrigins.push(u.origin, `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`)
  }
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client",
    'frame-src https://accounts.google.com/gsi/',
    `connect-src ${["'self'", ...apiOrigins, 'https://accounts.google.com/gsi/'].join(' ')}`,
    "img-src 'self' data: https://*.googleusercontent.com",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "media-src 'self' blob:",
    "font-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  # Google sign-in opens a popup; same-origin would sever it.
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  # Report-Only first: check the browser console on a real session, then rename to Content-Security-Policy.
  Content-Security-Policy-Report-Only: ${csp}

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`
}
