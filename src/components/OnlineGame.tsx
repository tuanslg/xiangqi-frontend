import type { Color, GameReason } from '@xiangqi/shared'
import { useEffect, useState } from 'react'
import { isMuted, setMuted } from '../audio/sound'
import { TC_LABEL } from '../online/labels'
import { useOnline } from '../online/store'
import { selectInCheck, useGame } from '../store/game'
import { Board } from './Board'
import { PlayerBar, Tray } from './GameParts'

const REASON: Record<GameReason, string> = {
  checkmate: 'Chiếu bí',
  timeout: 'Hết giờ',
  resign: 'Đầu hàng',
  agreement: 'Hai bên đồng ý hòa',
  repetition: 'Hòa do lặp lại nước đi',
  perpetual_check: 'Chiếu dai: bên chiếu liên tục bị xử thua',
  no_capture: 'Hòa do 60 nước không ăn quân',
  abandoned: 'Đối thủ đã rời ván',
}

const other = (c: Color): Color => (c === 'red' ? 'black' : 'red')

function format(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function Clock({ color }: { color: Color }) {
  const room = useOnline((s) => s.room)!
  const roomAt = useOnline((s) => s.roomAt)
  const [now, setNow] = useState(() => performance.now())
  const running = room.status === 'playing' && room.turn === color
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(performance.now()), 250)
    return () => clearInterval(id)
  }, [running])
  // Counts down from the remaining time the server reported, measured on our own clock.
  const ms = Math.max(0, room.clocks[color] - (running ? Math.max(0, now - roomAt) : 0))
  return (
    <span
      className={`rounded px-2 py-1 font-mono text-lg ${running ? 'bg-green-700 text-white' : 'bg-black/30 text-[#f3dfb0]'} ${ms < 20_000 && running ? 'animate-pulse bg-red-700' : ''}`}
      aria-label={`Đồng hồ ${color === 'red' ? 'đỏ' : 'đen'}`}
    >
      {format(ms)}
    </span>
  )
}

function WaitingCard() {
  const room = useOnline((s) => s.room)!
  const leave = useOnline((s) => s.leave)
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}/?room=${room.code}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the code is still on screen
    }
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#fff6dc] px-8 py-6 text-neutral-900 shadow-2xl">
        <div className="text-sm text-neutral-600">Gửi mã này cho bạn bè ({TC_LABEL[room.tc]})</div>
        <div className="font-mono text-4xl font-bold tracking-[0.3em]" aria-label="Mã phòng">{room.code}</div>
        <div className="flex gap-2">
          <button className="rounded bg-red-700 px-4 py-2 text-white" onClick={() => void copy()}>
            {copied ? 'Đã chép!' : 'Chép liên kết'}
          </button>
          <button className="rounded bg-neutral-800 px-4 py-2 text-white" onClick={leave}>Hủy phòng</button>
        </div>
        <div className="text-sm text-neutral-600">Đang chờ đối thủ…</div>
      </div>
    </div>
  )
}

function ResultCard() {
  const room = useOnline((s) => s.room)!
  const leave = useOnline((s) => s.leave)
  const result = room.result!
  const won = result.winner === room.you
  const draw = result.winner === null
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45">
      <div className="result-pop flex flex-col items-center gap-3 rounded-2xl bg-[#fff6dc] px-10 py-8 text-neutral-900 shadow-2xl">
        <div className="text-5xl">{draw ? '🤝' : won ? '🏆' : '💀'}</div>
        <div className={`text-3xl font-bold ${draw ? 'text-neutral-700' : won ? 'text-green-700' : 'text-red-700'}`}>
          {draw ? 'Hòa!' : won ? 'Bạn thắng!' : 'Bạn thua!'}
        </div>
        <div className="text-neutral-600">{REASON[result.reason]}</div>
        <button className="mt-2 rounded bg-neutral-800 px-4 py-2 text-white" onClick={leave}>Về menu</button>
      </div>
    </div>
  )
}

export function OnlineGame() {
  const { room, status, draw, resign, leave, notice, dismissNotice } = useOnline()
  const board = useGame((s) => s.board)
  const inCheck = useGame(selectInCheck)
  const [muted, setMutedState] = useState(isMuted)
  // Two-step resign. The confirmation is tied to the game position, so it lapses on the next move.
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  if (!room) return null
  const confirmResign = confirmKey === `${room.moveCount}:${room.status}`
  const me = room.you
  const opp = other(me)
  const oppSeat = room[opp]
  const mySeat = room[me]
  const playing = room.status === 'playing'
  const myTurn = playing && room.turn === me
  const offerFromOpponent = room.drawOffer === opp
  const offeredByMe = room.drawOffer === me

  const statusText =
    room.status === 'waiting'
      ? 'Đang chờ đối thủ…'
      : room.status === 'finished'
        ? 'Ván đấu kết thúc'
        : `${myTurn ? 'Lượt của bạn' : `Lượt của ${oppSeat?.name ?? 'đối thủ'}`}${inCheck ? ' — Chiếu tướng!' : ''}`

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-3 p-4">
      {(notice || status === 'reconnecting') && (
        <div role="alert" className="flex w-full max-w-[600px] items-center justify-between rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">
          <span>{status === 'reconnecting' ? 'Mất kết nối, đang thử kết nối lại…' : notice}</span>
          {notice && <button className="underline" onClick={dismissNotice}>Đóng</button>}
        </div>
      )}

      <div className="flex w-full max-w-[600px] items-center justify-between gap-2">
        <PlayerBar
          name={oppSeat?.name ?? '…'}
          color={opp}
          active={playing && room.turn === opp}
          extra={oppSeat && !oppSeat.online && playing ? <span className="text-xs text-amber-300">mất kết nối</span> : null}
        />
        <Clock color={opp} />
      </div>
      <div className="w-full max-w-[600px]">
        <Tray board={board} color={opp} />
      </div>

      <div className="relative w-full max-w-[600px]">
        <Board />
        {room.status === 'waiting' && <WaitingCard />}
        {room.status === 'finished' && room.result && <ResultCard />}
      </div>

      <div className="w-full max-w-[600px]">
        <Tray board={board} color={me} />
      </div>

      <div className="w-full max-w-[600px] text-center text-base font-medium" aria-live="polite">{statusText}</div>

      {offerFromOpponent && playing && (
        <div className="flex w-full max-w-[600px] items-center justify-between rounded bg-[#fff6dc] px-3 py-2 text-neutral-900">
          <span>Đối thủ xin hòa</span>
          <span className="flex gap-2">
            <button className="rounded bg-green-700 px-3 py-1 text-white" onClick={() => draw('accept')}>Đồng ý</button>
            <button className="rounded bg-neutral-700 px-3 py-1 text-white" onClick={() => draw('decline')}>Từ chối</button>
          </span>
        </div>
      )}

      <div className="flex w-full max-w-[600px] items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            className="round-btn"
            aria-label={playing ? 'Hãy đầu hàng trước khi rời ván' : 'Về menu'}
            disabled={playing}
            onClick={leave}
          >
            ☰
          </button>
          <button
            className="round-btn"
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            onClick={() => {
              setMuted(!muted)
              setMutedState(!muted)
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {playing && (
            <>
              <button
                className="rounded bg-[#fff6dc] px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
                disabled={room.moveCount < 2 || offeredByMe}
                onClick={() => draw('offer')}
              >
                {offeredByMe ? 'Đã xin hòa…' : 'Xin hòa'}
              </button>
              <button
                className="rounded bg-red-800 px-3 py-2 text-sm font-medium text-white"
                onClick={() => (confirmResign ? resign() : setConfirmKey(`${room.moveCount}:${room.status}`))}
              >
                {confirmResign ? 'Chắc chắn đầu hàng?' : 'Đầu hàng'}
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Clock color={me} />
          <PlayerBar name={mySeat?.name ?? 'Bạn'} color={me} active={myTurn} />
        </div>
      </div>
    </main>
  )
}
