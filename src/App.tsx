import { useEffect, useState } from 'react'
import { isMuted, setMuted } from './audio/sound'
import { useAuth } from './auth/store'
import { Board } from './components/Board'
import { CoupGame } from './components/CoupGame'
import { useCoup } from './store/coup'
import { Menu } from './components/Menu'
import { OnlineGame } from './components/OnlineGame'
import { shouldResume, useOnline } from './online/store'
import { PlayerBar, Tray } from './components/GameParts'
import type { Color } from '@xiangqi/shared'
import { selectInCheck, useGame } from './store/game'

export default function App() {
  const screen = useGame((s) => s.screen)
  const inRoom = useOnline((s) => s.room !== null)
  const coupActive = useCoup((s) => s.active)
  useEffect(() => {
    void useAuth.getState().init()
    // Invite link (?room=CODE): join straight away. Otherwise resume a game that was in progress.
    const code = new URLSearchParams(location.search).get('room')?.trim().toUpperCase()
    if (code && /^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      history.replaceState(null, '', location.pathname)
      useOnline.getState().join(code)
    } else if (shouldResume()) useOnline.getState().connect()
  }, [])
  if (inRoom) return <OnlineGame />
  if (coupActive) return <CoupGame />
  return screen === 'menu' ? <Menu /> : <GameScreen />
}

function GameScreen() {
  const { board, turn, playerColor, winner, thinking, reset, goMenu } = useGame()
  const inCheck = useGame(selectInCheck)
  const [muted, setMutedState] = useState(isMuted)
  const opponent: Color = playerColor === 'red' ? 'black' : 'red'

  const status = winner
    ? winner === playerColor
      ? 'Bạn thắng! 🎉'
      : 'Máy thắng.'
    : thinking
      ? 'Máy đang suy nghĩ…'
      : `${turn === playerColor ? 'Lượt của bạn' : 'Lượt của máy'}${inCheck ? ' — Chiếu tướng!' : ''}`

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-3 p-4">
      <div className="flex w-full max-w-[600px] items-center justify-between">
        <PlayerBar name="Máy" color={opponent} active={!winner && turn === opponent} />
        <div className="text-base font-medium" aria-live="polite">
          {status}
        </div>
      </div>
      {/* pieces the opponent has lost, i.e. captured by you */}
      <div className="w-full max-w-[600px]">
        <Tray board={board} color={opponent} />
      </div>

      <div className="relative w-full max-w-[600px]">
        <Board />
        {winner && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45">
            <div className="result-pop flex flex-col items-center gap-4 rounded-2xl bg-[#fff6dc] px-10 py-8 text-neutral-900 shadow-2xl">
              <div className="text-5xl">{winner === playerColor ? '🏆' : '💀'}</div>
              <div className={`text-3xl font-bold ${winner === playerColor ? 'text-green-700' : 'text-red-700'}`}>
                {winner === playerColor ? 'Bạn thắng!' : 'Bạn thua!'}
              </div>
              <div className="flex gap-3">
                <button className="rounded bg-red-700 px-4 py-2 text-white" onClick={() => reset()}>
                  Chơi lại
                </button>
                <button className="rounded bg-neutral-800 px-4 py-2 text-white" onClick={goMenu}>
                  Về menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-[600px]">
        <Tray board={board} color={playerColor} />
      </div>

      <div className="flex w-full max-w-[600px] items-center justify-between">
        <div className="flex gap-3">
          <button className="round-btn" aria-label="Về menu" onClick={goMenu}>
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
          <button className="round-btn" aria-label="Ván mới" onClick={() => reset()}>
            ↻
          </button>
        </div>
        <PlayerBar name="Bạn" color={playerColor} active={!winner && turn === playerColor} />
      </div>
    </main>
  )
}
