import { beforeEach, describe, expect, it, vi } from 'vitest'
import { START_FEN, applyMove, parseFen, toFen } from '@xiangqi/shared'
import type { Move, RoomSnapshot } from '@xiangqi/shared'

vi.mock('../audio/sound', () => ({
  playCapture: vi.fn(), playCheck: vi.fn(), playLose: vi.fn(), playMove: vi.fn(), playWin: vi.fn(), preloadSounds: vi.fn(),
}))

import { useGame } from './game'

const RED_OPEN: Move = { from: { row: 7, col: 1 }, to: { row: 7, col: 4 } }
const BLACK_OPEN: Move = { from: { row: 2, col: 1 }, to: { row: 2, col: 4 } }

function room(over: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    code: 'ABC234', tc: '3+2', status: 'playing', fen: START_FEN, turn: 'red', you: 'red',
    red: { name: 'An', online: true }, black: { name: 'Binh', online: true }, lastMove: null, moveCount: 0,
    clocks: { red: 1, black: 1, serverTime: 0 }, drawOffer: null, result: null, ...over,
  }
}

/** Snapshot after `moves` have been played from the start. */
function after(...moves: Move[]): RoomSnapshot {
  let board = parseFen(START_FEN).board
  let turn: 'red' | 'black' = 'red'
  for (const m of moves) {
    board = applyMove(board, m)
    turn = turn === 'red' ? 'black' : 'red'
  }
  return room({ fen: toFen({ board, turn }), turn, lastMove: moves.at(-1) ?? null, moveCount: moves.length })
}

beforeEach(() => {
  useGame.getState().leaveOnline()
  useGame.setState({ sendOnlineMove: null })
})

describe('syncOnline', () => {
  it('adopts a fresh room: colour, board and input state', () => {
    useGame.getState().syncOnline(room({ you: 'black' }))
    const s = useGame.getState()
    expect(s).toMatchObject({ mode: 'online', onlineCode: 'ABC234', playerColor: 'black', onlineLive: true, screen: 'game', winner: null })
    expect(toFen({ board: s.board, turn: s.turn })).toBe(START_FEN)
  })

  it('plays the opponent move as an animated move when exactly one ahead', () => {
    useGame.getState().syncOnline(room())
    const before = useGame.getState().moveId
    useGame.getState().syncOnline(after(RED_OPEN))
    const s = useGame.getState()
    expect(s.lastMove).toEqual(RED_OPEN)
    expect(s.moveId).toBe(before + 1) // play() bumps it, which triggers the slide animation
    expect(s.turn).toBe('black')
    expect(s.onlineMoves).toBe(1)
  })

  it('is a no-op for a snapshot that confirms our own optimistic move', () => {
    useGame.getState().syncOnline(room())
    const sent: Move[] = []
    useGame.setState({ sendOnlineMove: (m) => sent.push(m) })
    useGame.getState().select(RED_OPEN.from)
    useGame.getState().select(RED_OPEN.to)
    expect(sent).toEqual([RED_OPEN])
    const idAfterMove = useGame.getState().moveId
    useGame.getState().syncOnline(after(RED_OPEN))
    expect(useGame.getState().moveId).toBe(idAfterMove) // no replay
    expect(useGame.getState().onlineMoves).toBe(1)
  })

  it('hard-resets when the server rejected our move', () => {
    useGame.getState().syncOnline(room())
    useGame.setState({ sendOnlineMove: () => {} })
    useGame.getState().select(RED_OPEN.from)
    useGame.getState().select(RED_OPEN.to) // optimistic
    expect(useGame.getState().turn).toBe('black')
    useGame.getState().syncOnline(room()) // server says: still the start position
    const s = useGame.getState()
    expect(toFen({ board: s.board, turn: s.turn })).toBe(START_FEN)
    expect(s.lastMove).toBeNull()
  })

  it('catches up in one step after missing several moves (e.g. reconnect)', () => {
    useGame.getState().syncOnline(room())
    useGame.getState().syncOnline(after(RED_OPEN, BLACK_OPEN))
    const s = useGame.getState()
    expect(s.turn).toBe('red')
    expect(s.lastMove).toEqual(BLACK_OPEN)
    expect(s.onlineMoves).toBe(2)
  })

  it('switching to a different room resets the board', () => {
    useGame.getState().syncOnline(after(RED_OPEN))
    useGame.getState().syncOnline(room({ code: 'ZZZ999' }))
    const s = useGame.getState()
    expect(s.onlineCode).toBe('ZZZ999')
    expect(toFen({ board: s.board, turn: s.turn })).toBe(START_FEN)
  })
})

describe('online input', () => {
  it('ignores clicks when it is not our turn or the game is over', () => {
    useGame.getState().syncOnline(room({ you: 'black' })) // red to move
    useGame.getState().select({ row: 3, col: 0 })
    expect(useGame.getState().selected).toBeNull()

    useGame.getState().syncOnline(room({ status: 'finished' }))
    expect(useGame.getState().onlineLive).toBe(false)
    useGame.getState().select({ row: 6, col: 0 })
    expect(useGame.getState().selected).toBeNull()
  })

  it('never asks the AI to move in online mode', () => {
    vi.useFakeTimers()
    try {
      useGame.getState().syncOnline(room())
      useGame.setState({ sendOnlineMove: () => {} })
      useGame.getState().select(RED_OPEN.from)
      useGame.getState().select(RED_OPEN.to)
      expect(useGame.getState().thinking).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
