import { useEffect, useRef, useState } from 'react'
import { initGoogle, renderGoogleButton, resetGoogle } from '../auth/google'
import { useAuth } from '../auth/store'

function GoogleSignInButton({ clientId }: { clientId: string }) {
  const host = useRef<HTMLDivElement>(null)
  const signIn = useAuth((s) => s.signIn)
  const error = useAuth((s) => s.error)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const onCredential = async (credential: string) => {
      const ok = await signIn(credential)
      // A rejected login burns the nonce; start over so the next click works.
      if (!ok) {
        resetGoogle()
        setAttempt((n) => n + 1)
      }
    }
    initGoogle(clientId, (c) => void onCredential(c))
      .then(() => {
        if (!cancelled && host.current) renderGoogleButton(host.current)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [clientId, signIn, attempt])

  if (failed)
    return (
      <button className="rounded-full bg-[#fff6dc] px-4 py-2 text-sm text-neutral-900" onClick={() => { setFailed(false); setAttempt((n) => n + 1) }}>
        Không tải được đăng nhập Google. Thử lại
      </button>
    )
  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={host} />
      {error && <p role="alert" className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">{error}</p>}
    </div>
  )
}

export function AuthBar() {
  const { ready, user, googleClientId, signOut } = useAuth()
  if (!ready || !googleClientId) return null

  if (!user) return <GoogleSignInButton clientId={googleClientId} />

  return (
    <div className="flex items-center gap-3 rounded-full bg-[#fff6dc] py-1 pl-1 pr-4 text-neutral-900 shadow">
      {user.picture ? (
        <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700 font-semibold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-40 truncate font-medium">{user.name}</span>
      <button className="text-sm text-red-700 underline" onClick={() => void signOut()}>
        Đăng xuất
      </button>
    </div>
  )
}
