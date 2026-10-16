import { apiFetch } from '../api/base'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

let scriptLoad: Promise<void> | null = null
let initialized: Promise<void> | null = null

function loadScript(): Promise<void> {
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = GSI_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      scriptLoad = null // allow a later retry
      reject(new Error('Không tải được Google Sign-In'))
    }
    document.head.append(el)
  })
  return scriptLoad
}

/**
 * Loads GIS and initialises it with a fresh server-issued nonce (the server only accepts a Google token
 * whose nonce matches the cookie it set). Memoised so concurrent callers share one nonce.
 */
export function initGoogle(clientId: string, onCredential: (credential: string) => void): Promise<void> {
  initialized ??= (async () => {
    await loadScript()
    const res = await apiFetch('/api/auth/nonce')
    if (!res.ok) throw new Error('Không lấy được nonce đăng nhập')
    const { nonce } = (await res.json()) as { nonce: string }
    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (r) => onCredential(r.credential),
      nonce,
      auto_select: false,
      ux_mode: 'popup',
    })
  })().catch((err) => {
    initialized = null
    throw err
  })
  return initialized
}

/** Forces a fresh nonce on the next init (nonces are single-use and expire after 10 minutes). */
export function resetGoogle(): void {
  initialized = null
}

export function renderGoogleButton(el: HTMLElement): void {
  window.google!.accounts.id.renderButton(el, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'vi' })
}
