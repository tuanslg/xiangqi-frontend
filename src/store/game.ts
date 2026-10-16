import { create } from 'zustand'
import { playCapture, playCheck, playLose, playMove, playWin, preloadSounds } from '../audio/sound'
import {
  applyMove,
  isCheckmate,
  isInCheck,
  legalMovesFrom,
  minimaxBestMove,
  parseFen,
  START_FEN,
  toFen,
} from '@xiangqi/shared'
import type { Board, Color, Move, Piece, Pos, RoomSnapshot } from '@xiangqi/shared'
import { fetchBestMove } from '../api/engine'
import type { LevelId } from '../api/engine'

export interface CaptureEvent {
  id: number
  piece: Piece
  pos: Pos
}

export type Screen = 'menu' | 'game'

interface GameState {
  screen: Screen
  /** 'ai': local game against the engine. 'online': a mirror of a server-side room (see syncOnline). */
  mode: 'ai' | 'online'
  /** Online only: the mirrored room's code and how many moves it had at the last sync. */
  onlineCode: string | null
  onlineMoves: number
  /** Online only: the room is in play, so the board accepts input. */
  onlineLive: boolean
  /** Installed by the online store so this module doesn't depend on the socket code. */
  sendOnlineMove: ((move: Move) => void) | null
  moveId: number
  /** Id of the move that should shake the board (capture or check); 0 when none. */
  shake: number
  /** 'check' shakes harder than a plain capture. */
  shakeKind: 'capture' | 'check'
  capture: CaptureEvent | null
  board: Board
  turn: Color
  playerColor: Color
  level: LevelId
  selected: Pos | null
  targets: Pos[]
  lastMove: Move | null
  winner: Color | null
  thinking: boolean
  select: (pos: Pos) => void
  reset: (playerColor?: Color) => void
  startGame: (playerColor: Color, level: LevelId) => void
  goMenu: () => void
  /** Mirrors a server snapshot onto the board, animating the opponent's move when it is exactly one ahead. */
  syncOnline: (room: RoomSnapshot) => void
  /** Leaves online mode and returns to the menu. */
  leaveOnline: () => void
}

/** Search depth of the built-in minimax used when the server engine is unreachable. */
const FALLBACK_DEPTH: Record<LevelId, number> = { 1: 2, 2: 3, 3: 4, 4: 4 }

const initial = () => parseFen(START_FEN)
const other = (c: Color): Color => (c === 'red' ? 'black' : 'red')

export const useGame = create<GameState>((set, get) => {
  const play = (move: Move) => {
    const { board, turn } = get()
    const next = applyMove(board, move)
    const nextTurn = other(turn)
    const captured = board[move.to.row][move.to.col]
    const won = isCheckmate(next, nextTurn)
    const id = get().moveId + 1
    const gaveCheck = won || isInCheck(next, nextTurn)
    if (won) {
      if (captured) playCapture()
      setTimeout(get().playerColor === turn ? playWin : playLose, 350)
    } else if (isInCheck(next, nextTurn)) {
      if (captured) playCapture()
      playCheck()
    } else if (captured) playCapture()
    else playMove()
    set({
      moveId: id,
      shake: captured || gaveCheck ? id : 0,
      shakeKind: gaveCheck ? 'check' : 'capture',
      capture: captured ? { id, piece: captured, pos: move.to } : null,
      board: next,
      turn: nextTurn,
      lastMove: move,
      selected: null,
      targets: [],
      winner: won ? turn : null,
    })
  }

  const aiTurn = () => {
    const { board, turn, level, winner } = get()
    if (winner) return
    const token = get().moveId
    set({ thinking: true })
    // Random 1-2.5s pause so the AI feels like it's thinking; it also lets the UI paint the player's move.
    const minDelay = 1000 + Math.random() * 1500
    const started = Date.now()
    void (async () => {
      let move: Move | null
      try {
        move = await fetchBestMove(toFen({ board, turn }), level)
      } catch (err) {
        console.warn('Engine server unavailable, using local fallback:', err)
        move = minimaxBestMove(board, turn, FALLBACK_DEPTH[level])
      }
      await new Promise((r) => setTimeout(r, Math.max(0, minDelay - (Date.now() - started))))
      // The game may have been reset or abandoned while we were waiting.
      if (get().moveId !== token || get().screen !== 'game') return
      set({ thinking: false })
      if (move) play(move)
    })()
  }

  return {
    ...initial(),
    screen: 'menu',
    mode: 'ai',
    onlineCode: null,
    onlineMoves: 0,
    onlineLive: false,
    sendOnlineMove: null,
    moveId: 0,
    shake: 0,
    shakeKind: 'capture',
    capture: null,
    playerColor: 'red',
    level: 2,
    selected: null,
    targets: [],
    lastMove: null,
    winner: null,
    thinking: false,

    select: (pos) => {
      const { board, turn, playerColor, selected, targets, winner, thinking, mode, onlineLive, sendOnlineMove } = get()
      if (mode === 'online' ? !onlineLive || turn !== playerColor : winner || thinking || turn !== playerColor) return
      if (selected && targets.some((t) => t.row === pos.row && t.col === pos.col)) {
        const move = { from: selected, to: pos }
        play(move) // online: optimistic; the server's snapshot confirms or corrects it
        if (mode === 'online') sendOnlineMove?.(move)
        else aiTurn()
        return
      }
      const piece = board[pos.row][pos.col]
      if (piece?.color === playerColor)
        set({ selected: pos, targets: legalMovesFrom(board, pos).map((m) => m.to) })
      else set({ selected: null, targets: [] })
    },

    reset: (playerColor = get().playerColor) => {
      set({
        ...initial(),
        playerColor,
        moveId: get().moveId + 1,
        shake: 0,
        capture: null,
        selected: null,
        targets: [],
        lastMove: null,
        winner: null,
        thinking: false,
      })
      if (playerColor === 'black') aiTurn()
    },

    startGame: (playerColor, level) => {
      preloadSounds()
      set({ level, screen: 'game', mode: 'ai', onlineCode: null, onlineLive: false })
      get().reset(playerColor)
    },

    goMenu: () => set({ screen: 'menu', thinking: false }),

    syncOnline: (room) => {
      const s = get()
      const fresh = s.mode !== 'online' || s.onlineCode !== room.code
      const pos = parseFen(room.fen)
      const fenOf = (b: Board, t: Color) => toFen({ board: b, turn: t })
      const base = { mode: 'online' as const, onlineCode: room.code, onlineMoves: room.moveCount, onlineLive: room.status === 'playing', playerColor: room.you, screen: 'game' as const }

      if (!fresh && fenOf(s.board, s.turn) === room.fen) return set(base)

      // Exactly one move ahead of us (the opponent's): play it so it animates and makes its sound.
      const oneAhead =
        !fresh && room.lastMove !== null && room.moveCount === s.onlineMoves + 1 &&
        fenOf(applyMove(s.board, room.lastMove), other(s.turn)) === room.fen
      if (oneAhead) {
        set(base)
        return play(room.lastMove!)
      }

      // First sight of the room, or we diverged (rejected move, reconnect): trust the server outright.
      set({
        ...base, board: pos.board, turn: pos.turn, lastMove: room.lastMove, selected: null, targets: [],
        winner: null, thinking: false, capture: null, shake: 0, moveId: s.moveId + 1,
      })
    },

    leaveOnline: () =>
      set({ ...initial(), mode: 'ai', onlineCode: null, onlineMoves: 0, onlineLive: false, screen: 'menu', selected: null, targets: [], lastMove: null, winner: null, thinking: false, capture: null, shake: 0, moveId: get().moveId + 1 }),
  }
})

export const selectInCheck = (s: GameState) => !s.winner && isInCheck(s.board, s.turn)
