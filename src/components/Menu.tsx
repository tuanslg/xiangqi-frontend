import { useState } from 'react'
import type { Color } from '@xiangqi/shared'
import { LEVELS } from '../api/engine'
import { TIME_CONTROLS } from '@xiangqi/shared'
import type { Color as GameColor, TimeControlId } from '@xiangqi/shared'
import { useAuth } from '../auth/store'
import { TC_LABEL } from '../online/labels'
import { useOnline } from '../online/store'
import { AuthBar } from './AuthBar'
import type { LevelId } from '../api/engine'
import { useGame } from '../store/game'

export function Menu() {
  const startGame = useGame((s) => s.startGame)
  const initialLevel = useGame((s) => s.level)
  const [color, setColor] = useState<Color>('red')
  const [level, setLevel] = useState<LevelId>(initialLevel)

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-4">
      <div className="absolute right-4 top-4">
        <AuthBar />
      </div>
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-wide text-[#f3dfb0] drop-shadow-lg">Cờ Tướng</h1>
        <p className="mt-2 opacity-80">Chọn chế độ chơi</p>
      </div>

      <div className="grid w-full gap-5 sm:grid-cols-2">
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

        <OnlineCard />
      </div>
    </main>
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
