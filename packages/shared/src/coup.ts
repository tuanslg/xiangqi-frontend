import { parseFen } from './fen'
import { allLegalMoves, isCheckmate, isInCheck, legalMovesFrom } from './rules'
import { START_FEN } from './types'
import type { Board, Color, Move, Piece, PieceType, Pos } from './types'
import { COLS, ROWS } from './types'

/**
 * Cờ úp (hidden xiangqi): every piece except the generals starts face-down on a shuffled standard
 * setup. A face-down piece moves like the piece that normally starts on its square; the first time
 * it moves it is turned face-up and from then on moves as its real type.
 */
export interface CoupPiece extends Piece {
  hidden: boolean
}
export type CoupBoard = (CoupPiece | null)[][]

const START = parseFen(START_FEN).board

/** What a face-down piece standing on `pos` (always its starting square) moves like. */
const slotType = (pos: Pos): PieceType => START[pos.row][pos.col]!.type

/** Plain xiangqi board in which face-down pieces already behave as their slot type. */
function view(board: CoupBoard): Board {
  return board.map((row, r) =>
    row.map((p, c) => (p ? { color: p.color, type: p.hidden ? slotType({ row: r, col: c }) : p.type } : null)),
  )
}

export function newCoupBoard(rng: () => number = Math.random): CoupBoard {
  const board: CoupBoard = START.map((row) => row.map(() => null))
  for (const color of ['red', 'black'] as const) {
    const cells: Pos[] = []
    const types: PieceType[] = []
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const p = START[r][c]
        if (!p || p.color !== color) continue
        if (p.type === 'K') board[r][c] = { color, type: 'K', hidden: false }
        else {
          cells.push({ row: r, col: c })
          types.push(p.type)
        }
      }
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[types[i], types[j]] = [types[j], types[i]]
    }
    cells.forEach((pos, i) => (board[pos.row][pos.col] = { color, type: types[i], hidden: true }))
  }
  return board
}

export const coupLegalMovesFrom = (board: CoupBoard, from: Pos): Move[] => legalMovesFrom(view(board), from)
export const coupAllLegalMoves = (board: CoupBoard, color: Color): Move[] => allLegalMoves(view(board), color)
export const coupIsInCheck = (board: CoupBoard, color: Color): boolean => isInCheck(view(board), color)
export const coupIsCheckmate = (board: CoupBoard, color: Color): boolean => isCheckmate(view(board), color)

export interface CoupResult {
  board: CoupBoard
  /** The piece that was taken, as it was before (face-down pieces are revealed to the caller here). */
  captured: CoupPiece | null
  /** True when the moving piece was face-down and has just been turned over. */
  flipped: boolean
}

export function coupApplyMove(board: CoupBoard, move: Move): CoupResult {
  const mover = board[move.from.row][move.from.col]
  if (!mover) throw new Error('No piece on the source square')
  const captured = board[move.to.row][move.to.col]
  const next = board.map((r) => r.slice())
  next[move.to.row][move.to.col] = { ...mover, hidden: false }
  next[move.from.row][move.from.col] = null
  return { board: next, captured, flipped: mover.hidden }
}

// Rough values; a face-down piece is worth the average of what it could be.
const VALUE: Record<PieceType, number> = { K: 10000, R: 900, C: 450, N: 400, B: 200, A: 200, P: 100 }
const HIDDEN_VALUE = 350
const valueOf = (p: CoupPiece) => (p.hidden ? HIDDEN_VALUE : VALUE[p.type])

/**
 * A light heuristic opponent: it grabs material, avoids leaving pieces where they can be taken
 * and likes to turn pieces over. It only looks at what a human could see (face-down pieces count
 * as average pieces), so it does not cheat.
 */
export function coupBestMove(board: CoupBoard, color: Color, rng: () => number = Math.random): Move | null {
  const moves = coupAllLegalMoves(board, color)
  if (moves.length === 0) return null
  const enemy: Color = color === 'red' ? 'black' : 'red'
  let best: Move | null = null
  let bestScore = -Infinity
  for (const m of moves) {
    const mover = board[m.from.row][m.from.col]!
    const { board: next, captured, flipped } = coupApplyMove(board, m)
    let score = rng() * 10
    if (captured) score += valueOf(captured)
    if (flipped) score += 15
    if (coupIsCheckmate(next, enemy)) score += 100000
    else if (coupIsInCheck(next, enemy)) score += 30
    const replies = coupAllLegalMoves(next, enemy)
    // After moving, can the opponent take the piece on its new square?
    if (replies.some((r) => r.to.row === m.to.row && r.to.col === m.to.col)) score -= valueOf(mover) * 0.9
    // Bonus for rescuing a piece that is currently attacked.
    if (coupAllLegalMoves(board, enemy).some((r) => r.to.row === m.from.row && r.to.col === m.from.col))
      score += valueOf(mover) * 0.5
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}
