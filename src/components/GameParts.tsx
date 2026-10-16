import type { Board as BoardT, Color, PieceType } from '@xiangqi/shared'
import { GLYPH_FONT, LABEL } from './pieceLabels'

const START_COUNT: Record<PieceType, number> = { K: 1, A: 2, B: 2, N: 2, R: 2, C: 2, P: 5 }
const ORDER: PieceType[] = ['R', 'N', 'C', 'B', 'A', 'P', 'K']

/** Pieces of `color` that are no longer on the board. */
function lostPieces(board: BoardT, color: Color): PieceType[] {
  const left: Record<string, number> = {}
  for (const row of board)
    for (const p of row) if (p && p.color === color) left[p.type] = (left[p.type] ?? 0) + 1
  return ORDER.flatMap((t) => Array<PieceType>(START_COUNT[t] - (left[t] ?? 0)).fill(t))
}

export function Tray({ board, color }: { board: BoardT; color: Color }) {
  const lost = lostPieces(board, color)
  return (
    <div className="flex h-9 flex-wrap items-center gap-1.5" aria-label="Quân bị ăn">
      {lost.map((t, i) => (
        <span key={i} className="mini-piece" style={{ color: color === 'red' ? '#b3150f' : '#141414', fontFamily: GLYPH_FONT }}>
          {LABEL[color][t]}
        </span>
      ))}
    </div>
  )
}

export function PlayerBar({ name, color, active, extra }: { name: string; color: Color; active: boolean; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`plaque px-4 py-1.5 text-lg font-semibold ${active ? 'ring-2 ring-green-400' : ''}`}>{name}</div>
      <span className="text-sm opacity-80">{color === 'red' ? '🔴 Đỏ' : '⚫ Đen'}</span>
      {extra}
    </div>
  )
}
