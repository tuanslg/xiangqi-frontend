import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  picture: string | null
}

interface AuthState {
  /** False until the first /api/auth/* round-trip finishes, so the UI doesn't flash a login button. */
  ready: boolean
  user: AuthUser | null
  /** Null when the server has accounts disabled or is unreachable: the login UI is hidden. */
  googleClientId: string | null
  error: string | null
  init: () => Promise<void>
  signIn: (credential: string) => Promise<boolean>
  signOut: () => Promise<void>
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return (await res.json()) as T
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  user: null,
  googleClientId: null,
  error: null,

  init: async () => {
    if (get().ready) return
    try {
      const [config, me] = await Promise.all([
        getJson<{ googleClientId: string | null }>('/api/auth/config'),
        getJson<{ user: AuthUser | null }>('/api/auth/me'),
      ])
      set({ googleClientId: config.googleClientId, user: me.user, ready: true })
    } catch {
      // Server down: the game still works against the local engine, just without accounts.
      set({ googleClientId: null, user: null, ready: true })
    }
  },

  signIn: async (credential) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credential }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const { user } = (await res.json()) as { user: AuthUser }
      set({ user, error: null })
      return true
    } catch {
      set({ error: 'Đăng nhập thất bại, vui lòng thử lại.' })
      return false
    }
  },

  signOut: async () => {
    set({ user: null }) // optimistic: the cookie is cleared even if the request fails below
    window.google?.accounts.id.disableAutoSelect()
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  },
}))
