import { useEffect, useState } from 'react'
import type { Color } from '@xiangqi/shared'
import { LEVELS } from '../api/engine'
import { TIME_CONTROLS } from '@xiangqi/shared'
import type { Color as GameColor, TimeControlId } from '@xiangqi/shared'
import { useAuth } from '../auth/store'
import { TC_LABEL } from '../online/labels'
import { useOnline } from '../online/store'
import type { LevelId } from '../api/engine'
import { useCoup } from '../store/coup'
import type { CoupMode } from '../store/coup'
import { useGame } from '../store/game'
import { isMuted, setMuted } from '../audio/sound'
import { AuthBar } from './AuthBar'
import { LobbyHero } from './LobbyHero'

function VsMachineCard() {
  const startGame = useGame((s) => s.startGame)
  const initialLevel = useGame((s) => s.level)
  const [color, setColor] = useState<Color>('red')
  const [level, setLevel] = useState<LevelId>(initialLevel)

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-[#fff6dc] p-5 text-neutral-900 shadow-lg">
      <h2 className="text-xl font-semibold">🤖 Chơi với máy</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-neutral-600">Bạn cầm quân</legend>
        <div className="flex gap-2">
          {(['red', 'black'] as const).map((c) => (
            <button
              key={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`flex-1 rounded border-2 px-3 py-2 font-medium ${
                color === c ? 'border-green-700 bg-green-50' : 'border-transparent bg-neutral-100'
              }`}
            >
              {c === 'red' ? '🔴 Đỏ (đi trước)' : '⚫ Đen'}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-600">
        Độ khó
        <select
          className="rounded border bg-white px-2 py-2 text-base text-neutral-900"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as LevelId)}
        >
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <button
        className="mt-auto rounded-lg bg-red-700 px-4 py-3 text-lg font-semibold text-white shadow hover:bg-red-800"
        onClick={() => startGame(color, level)}
      >
        Bắt đầu
      </button>
    </section>
  )
}

function OnlineCard() {
  const { status, queued, notice, quick, create, join, cancelQuick, dismissNotice } = useOnline()
  const signedIn = useAuth((s) => s.user !== null)
  const canLogin = useAuth((s) => s.googleClientId !== null)
  const [tc, setTc] = useState<TimeControlId>('5+3')
  const [choice, setChoice] = useState<GameColor | 'random'>('random')
  const [code, setCode] = useState('')
  const busy = status === 'connecting' || status === 'reconnecting'
  const codeOk = /^[A-HJ-NP-Z2-9]{6}$/.test(code)

  if (queued)
    return (
      <section className="flex flex-col items-center justify-center gap-4 rounded-xl bg-[#fff6dc] p-5 text-neutral-900 shadow-lg">
        <h2 className="text-xl font-semibold">🌐 Chơi online</h2>
        <p className="animate-pulse text-lg">Đang tìm đối thủ… ({TC_LABEL[queued]})</p>
        <button className="rounded-lg bg-neutral-800 px-4 py-2 text-white" onClick={cancelQuick}>Hủy</button>
      </section>
    )

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-[#fff6dc] p-5 text-neutral-900 shadow-lg">
      <h2 className="text-xl font-semibold">🌐 Chơi online</h2>
      {notice && (
        <div role="alert" className="flex items-center justify-between rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">
          <span>{notice}</span>
          <button className="underline" onClick={dismissNotice}>Đóng</button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-neutral-600">
        Thời gian
        <select className="rounded border bg-white px-2 py-2 text-base text-neutral-900" value={tc} onChange={(e) => setTc(e.target.value as TimeControlId)}>
          {(Object.keys(TIME_CONTROLS) as TimeControlId[]).map((id) => (
            <option key={id} value={id}>{TC_LABEL[id]}</option>
          ))}
        </select>
      </label>

      <button
        className="rounded-lg bg-red-700 px-4 py-3 text-lg font-semibold text-white shadow hover:bg-red-800 disabled:opacity-60"
        disabled={busy}
        onClick={() => quick(tc)}
      >
        {busy ? 'Đang kết nối…' : 'Ghép trận nhanh'}
      </button>

      <div className="flex flex-col gap-2 border-t border-neutral-300 pt-3">
        <div className="text-sm font-medium text-neutral-600">Hoặc mời bạn bè</div>
        <div className="flex gap-2">
          {([['red', '🔴 Đỏ'], ['black', '⚫ Đen'], ['random', '🎲 Ngẫu nhiên']] as const).map(([c, label]) => (
            <button
              key={c}
              aria-pressed={choice === c}
              onClick={() => setChoice(c)}
              className={`flex-1 rounded border-2 px-2 py-1.5 text-sm font-medium ${choice === c ? 'border-green-700 bg-green-50' : 'border-transparent bg-neutral-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => create(choice, tc)}>
          Tạo phòng
        </button>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded border bg-white px-3 py-2 font-mono uppercase tracking-widest"
            placeholder="MÃ PHÒNG"
            aria-label="Mã phòng"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && codeOk && join(code)}
          />
          <button className="rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || !codeOk} onClick={() => join(code)}>
            Vào
          </button>
        </div>
      </div>

      {!signedIn && canLogin && <p className="text-xs text-neutral-500">Không cần đăng nhập. Đăng nhập Google để lưu lịch sử ván đấu.</p>}
    </section>
  )
}

function CoupCard() {
  const start = useCoup((s) => s.start)
  const [mode, setMode] = useState<CoupMode>('ai')
  const [color, setColor] = useState<Color>('red')

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-[#fff6dc] p-5 text-neutral-900 shadow-lg">
      <h2 className="text-xl font-semibold">🎴 Cờ úp</h2>
      <p className="text-sm text-neutral-600">
        Mọi quân (trừ tướng) được úp xuống và xếp ngẫu nhiên. Quân úp đi theo nước của ô nó đang đứng; sau nước đi đầu tiên nó lật
        ngửa và đi đúng như quân thật.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-neutral-600">Chế độ</legend>
        <div className="flex gap-2">
          {([['ai', '🤖 Với máy'], ['pvp', '👥 2 người']] as const).map(([m, label]) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded border-2 px-3 py-2 font-medium ${mode === m ? 'border-green-700 bg-green-50' : 'border-transparent bg-neutral-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {mode === 'ai' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-neutral-600">Bạn cầm quân</legend>
          <div className="flex gap-2">
            {(['red', 'black'] as const).map((c) => (
              <button
                key={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`flex-1 rounded border-2 px-3 py-2 font-medium ${color === c ? 'border-green-700 bg-green-50' : 'border-transparent bg-neutral-100'}`}
              >
                {c === 'red' ? '🔴 Đỏ (đi trước)' : '⚫ Đen'}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button
        className="mt-auto rounded-lg bg-red-700 px-4 py-3 text-lg font-semibold text-white shadow hover:bg-red-800"
        onClick={() => start(mode, color)}
      >
        Bắt đầu
      </button>
    </section>
  )
}

type Panel = 'xiangqi' | 'coup' | null

function Medal({ title, subtitle, variant, onClick, disabled }: { title: string; subtitle?: string; variant: 'xiangqi' | 'coup' | 'more'; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="medal-wrap" onClick={onClick} disabled={disabled} aria-label={title}>
      <span className={`medal medal-${variant}`}>
        <span className="medal-inner">
          {variant === 'xiangqi' && (
            <>
              <span className="medal-disc medal-disc-back">將</span>
              <span className="medal-disc medal-disc-front">帥</span>
            </>
          )}
          {variant === 'coup' && (
            <>
              <span className="medal-disc medal-disc-back" style={{ color: '#141414' }}>卒</span>
              <span className="medal-disc medal-disc-front medal-disc-hidden" />
            </>
          )}
          {variant === 'more' && <span className="medal-more">10+</span>}
        </span>
      </span>
      <span className="gold-text medal-title">{title}</span>
      {subtitle && <span className="medal-sub">{subtitle}</span>}
    </button>
  )
}

export function Menu() {
  const [panel, setPanel] = useState<Panel>(null)
  const [muted, setMutedState] = useState(isMuted)
  const user = useAuth((s) => s.user)

  useEffect(() => {
    if (!panel) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  return (
    <main className="lobby">
      <div className="lobby-frame">
        <header className="lobby-top">
          <div className="lobby-player">
            <div className="lobby-avatar">
              {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span>帥</span>}
            </div>
            <div className="lobby-name">{user?.name ?? 'Khách'}</div>
          </div>
          <div className="lobby-actions">
            <div className="hidden sm:block"><AuthBar /></div>
            <button className="lobby-icon" aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'} onClick={() => { setMuted(!muted); setMutedState(!muted) }}>
              {muted ? '🔇' : '🔊'}
            </button>
            <button className="lobby-icon" aria-label="Toàn màn hình" onClick={toggleFullscreen}>⛶</button>
          </div>
        </header>

        <LobbyHero />

        <nav className="lobby-medals">
          <Medal title="Cờ Tướng" variant="xiangqi" onClick={() => setPanel('xiangqi')} />
          <Medal title="Cờ Úp" variant="coup" onClick={() => setPanel('coup')} />
          <Medal title="Kho Games" subtitle="Sắp ra mắt" variant="more" disabled />
        </nav>
      </div>

      {panel && (
        <div className="lobby-modal" role="dialog" aria-modal="true" aria-label={panel === 'xiangqi' ? 'Cờ Tướng' : 'Cờ Úp'} onClick={() => setPanel(null)}>
          <div className="lobby-modal-body" onClick={(e) => e.stopPropagation()}>
            <button className="lobby-modal-close" aria-label="Đóng" onClick={() => setPanel(null)}>✕</button>
            {panel === 'xiangqi' ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <VsMachineCard />
                <OnlineCard />
              </div>
            ) : (
              <div className="mx-auto max-w-md">
                <CoupCard />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
