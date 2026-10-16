import { useState } from 'react'
import { COLS, ROWS } from '@xiangqi/shared'
import type { Color, CoupPiece } from '@xiangqi/shared'
import { isMuted, setMuted } from '../audio/sound'
import { selectCoupInCheck, useCoup } from '../store/coup'
import { CELL, x, y } from './boardGeometry'
import { BoardSvg } from './BoardSvg'
import { PlayerBar } from './GameParts'
import { Piece3D } from './PieceDisc'
import { GLYPH_FONT, LABEL } from './pieceLabels'

function CoupBoard() {
  const { board, selected, targets, lastMove, flipped, select, mode, playerColor, moveId, turn } = useCoup()
  const inCheck = useCoup(selectCoupInCheck)
  const flip = mode === 'ai' && playerColor === 'black'
  const vr = (r: number) => (flip ? ROWS - 1 - r : r)
  const vc = (c: number) => (flip ? COLS - 1 - c : c)

  return (
    <BoardSvg>
      {board.map((row, r) =>
        row.map((_, c) => (
          <rect
            key={`hit${r}-${c}`}
            x={x(vc(c)) - CELL / 2}
            y={y(vr(r)) - CELL / 2}
            width={CELL}
            height={CELL}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => select({ row: r, col: c })}
          />
        )),
      )}

      {lastMove && (
        <g transform={`translate(${x(vc(lastMove.from.col))} ${y(vr(lastMove.from.row))})`} pointerEvents="none">
          <circle r={11} fill="none" stroke="#2f9e3a" strokeWidth={2} opacity={0.8} />
          <circle r={5.5} fill="#2f9e3a" opacity={0.9} />
        </g>
      )}

      {targets.map((t) => (
        <g key={`t${t.row}-${t.col}`} transform={`translate(${x(vc(t.col))} ${y(vr(t.row))})`} pointerEvents="none">
          {board[t.row][t.col] ? (
            <circle r={31} fill="none" stroke="#2f9e3a" strokeWidth={4} opacity={0.9} />
          ) : (
            <>
              <circle r={11} fill="none" stroke="#2f9e3a" strokeWidth={2} opacity={0.8} />
              <circle r={5.5} fill="#2f9e3a" opacity={0.9} />
            </>
          )}
        </g>
      ))}

      {board.map((row, r) =>
        row.map((p, c) => {
          if (!p) return null
          const isMoved = lastMove && lastMove.to.row === r && lastMove.to.col === c
          const justFlipped = flipped?.row === r && flipped?.col === c
          const slide = isMoved
            ? { '--dx': `${x(vc(lastMove.from.col)) - x(vc(c))}px`, '--dy': `${y(vr(lastMove.from.row)) - y(vr(r))}px` }
            : undefined
          return (
            <g
              key={`pc${r}-${c}${isMoved ? `-m${moveId}` : ''}`}
              transform={`translate(${x(vc(c))} ${y(vr(r))})`}
              pointerEvents="none"
            >
              <g className={isMoved ? 'piece-slide' : undefined} style={slide as React.CSSProperties}>
                <g className={justFlipped ? 'piece-flip' : undefined}>
                  <Piece3D
                    piece={p}
                    hidden={p.hidden}
                    selected={selected?.row === r && selected?.col === c}
                    inCheck={inCheck && p.type === 'K' && turn === p.color}
                  />
                </g>
              </g>
            </g>
          )
        }),
      )}
    </BoardSvg>
  )
}

function LostTray({ pieces, color }: { pieces: CoupPiece[]; color: Color }) {
  return (
    <div className="flex h-9 flex-wrap items-center gap-1.5" aria-label="Quân bị ăn">
      {pieces.map((p, i) => (
        <span key={i} className="mini-piece" style={{ color: color === 'red' ? '#b3150f' : '#141414', fontFamily: GLYPH_FONT }}>
          {LABEL[color][p.type]}
        </span>
      ))}
    </div>
  )
}

export function CoupGame() {
  const { mode, turn, playerColor, winner, thinking, lost, start, exit } = useCoup()
  const inCheck = useCoup(selectCoupInCheck)
  const [muted, setMutedState] = useState(isMuted)
  const ai = mode === 'ai'
  const top: Color = ai ? (playerColor === 'red' ? 'black' : 'red') : 'black'
  const bottom: Color = ai ? playerColor : 'red'
  const name = (c: Color) => (ai ? (c === playerColor ? 'Bạn' : 'Máy') : c === 'red' ? 'Đỏ' : 'Đen')
  const colorName = turn === 'red' ? 'Đỏ' : 'Đen'

  const status = winner
    ? ai
      ? winner === playerColor
        ? 'Bạn thắng! 🎉'
        : 'Máy thắng.'
      : `${winner === 'red' ? 'Đỏ' : 'Đen'} thắng! 🎉`
    : thinking
      ? 'Máy đang suy nghĩ…'
      : `${ai ? (turn === playerColor ? 'Lượt của bạn' : 'Lượt của máy') : `Lượt của ${colorName}`}${inCheck ? ' — Chiếu tướng!' : ''}`

  return (
    <main className="game-screen">
      <aside className="game-left">
        <PlayerBar name={name(top)} color={top} active={!winner && turn === top} />
        <div className="flex gap-3">
          <button className="round-btn" aria-label="Về sảnh" onClick={exit}>
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
          <button className="round-btn" aria-label="Ván mới" onClick={() => start(mode, playerColor)}>
            ↻
          </button>
        </div>
      </aside>

      <div className="game-center">
        <LostTray pieces={lost[top]} color={top} />
        <div className="game-board">
          <CoupBoard />
          {winner && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45">
              <div className="result-pop flex flex-col items-center gap-4 rounded-2xl bg-[#fff6dc] px-10 py-8 text-neutral-900 shadow-2xl">
                <div className="text-5xl">{!ai || winner === playerColor ? '🏆' : '💀'}</div>
                <div className={`text-3xl font-bold ${!ai || winner === playerColor ? 'text-green-700' : 'text-red-700'}`}>
                  {ai ? (winner === playerColor ? 'Bạn thắng!' : 'Bạn thua!') : `${winner === 'red' ? 'Đỏ' : 'Đen'} thắng!`}
                </div>
                <div className="flex gap-3">
                  <button className="rounded bg-red-700 px-4 py-2 text-white" onClick={() => start(mode, playerColor)}>
                    Chơi lại
                  </button>
                  <button className="rounded bg-neutral-800 px-4 py-2 text-white" onClick={exit}>
                    Về sảnh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <LostTray pieces={lost[bottom]} color={bottom} />
      </div>

      <aside className="game-right">
        <div className="text-base font-medium" aria-live="polite">
          {status}
        </div>
        <PlayerBar name={name(bottom)} color={bottom} active={!winner && turn === bottom} />
      </aside>
    </main>
  )
}
