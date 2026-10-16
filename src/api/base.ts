/**
 * Where the API lives. Empty (default) = same origin as the page, which is what the Vite dev proxy and
 * the all-in-one Docker image use. Set VITE_API_URL=https://api.example.com when the frontend is hosted
 * separately (e.g. Cloudflare Pages); both hosts must share a registrable domain so cookies still flow.
 */
const apiBase = (): string => (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export const apiUrl = (path: string): string => apiBase() + path

/** fetch against the API; always sends cookies, which carry the session and guest identity. */
export const apiFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(apiUrl(path), { ...init, credentials: 'include' })

export function wsUrl(): string {
  const base = apiBase()
  if (base) return base.replace(/^http/, 'ws') + '/ws' // https -> wss, http -> ws
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
}
