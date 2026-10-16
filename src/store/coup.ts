import { create } from 'zustand'
import { playCapture, playCheck, playLose, playMove, playWin, preloadSounds } from '../audio/sound'
import {
  coupApplyMove,
  coupBestMove,
  coupIsCheckmate,
  coupIsInCheck,
  coupLegalMovesFrom,
  newCoupBoard,
} from '@xiangqi/shared'
import type { Color, CoupBoard, CoupPiece, Move, Pos } from '@xiangqi/shared'

export type CoupMode = 'ai' | 'pvp'

interface CoupState {
  active: boolean
  /** 'ai': you against the computer. 'pvp': two people share the screen. */
  mode: CoupMode
  board: CoupBoard
  turn: Color
  playerColor: Color
  selected: Pos | null
  targets: Pos[]
  lastMove: Move | null
  /** Square of the piece that was just turned over (for the flip animation). */
  flipped: Pos | null
  /** Captured pieces, grouped by the colour that lost them. */
  lost: Record<Color, CoupPiece[]>
  winner: Color | null
  thinking: boolean
  moveId: number
  select: (pos: Pos) => void
  start: (mode: CoupMode, playerColor?: Color) => void
  exit: () => void
}

const other = (c: Color): Color => (c === 'red' ? 'black' : 'red')
const fresh = () => ({
  board: newCoupBoard(),
  turn: 'red' as Color,
  selected: null,
  targets: [],
  lastMove: null,
  flipped: null,
  lost: { red: [], black: [] },
  winner: null,
  thinking: false,
})

export const useCoup = create<CoupState>((set, get) => {
  const play = (move: Move) => {
    const { board, turn, mode, playerColor, moveId } = get()
    const res = coupApplyMove(board, move)
    const next = other(turn)
    const won = coupIsCheckmate(res.board, next)
    if (won) {
      if (res.captured) playCapture()
      if (mode === 'ai') setTimeout(turn === playerColor ? playWin : playLose, 350)
      else setTimeout(playWin, 350)
    } else if (coupIsInCheck(res.board, next)) {
      if (res.captured) playCapture()
      playCheck()
    } else if (res.captured) playCapture()
    else playMove()
    set({
      board: res.board,
      turn: next,
      lastMove: move,
      flipped: res.flipped ? move.to : null,
      lost: res.captured
        ? { ...get().lost, [res.captured.color]: [...get().lost[res.captured.color], res.captured] }
        : get().lost,
      selected: null,
      targets: [],
      winner: won ? turn : null,
      moveId: moveId + 1,
    })
  }

  const aiTurn = () => {
    const token = get().moveId
    set({ thinking: true })
    // Short pause so the computer feels like it is thinking and the player's move can paint first.
    setTimeout(() => {
      if (get().moveId !== token || !get().active) return
      const { board, turn } = get()
      const move = coupBestMove(board, turn)
      set({ thinking: false })
      if (move) play(move)
    }, 700 + Math.random() * 900)
  }

  return {
    ...fresh(),
    active: false,
    mode: 'ai',
    playerColor: 'red',
    moveId: 0,

    select: (pos) => {
      const { board, turn, playerColor, selected, targets, winner, thinking, mode } = get()
      if (winner || thinking || (mode === 'ai' && turn !== playerColor)) return
      if (selected && targets.some((t) => t.row === pos.row && t.col === pos.col)) {
        play({ from: selected, to: pos })
        if (mode === 'ai' && !get().winner) aiTurn()
        return
      }
      const piece = board[pos.row][pos.col]
      if (piece?.color === turn) set({ selected: pos, targets: coupLegalMovesFrom(board, pos).map((m) => m.to) })
      else set({ selected: null, targets: [] })
    },

    start: (mode, playerColor = get().playerColor) => {
      preloadSounds()
      set({ ...fresh(), active: true, mode, playerColor: mode === 'pvp' ? 'red' : playerColor, moveId: get().moveId + 1 })
      if (mode === 'ai' && playerColor === 'black') aiTurn()
    },

    exit: () => set({ active: false, thinking: false, moveId: get().moveId + 1 }),
  }
})

export const selectCoupInCheck = (s: CoupState) => !s.winner && coupIsInCheck(s.board, s.turn)
