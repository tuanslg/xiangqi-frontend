import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../audio/sound', () => ({
  playCapture: vi.fn(), playCheck: vi.fn(), playLose: vi.fn(), playMove: vi.fn(), playWin: vi.fn(), preloadSounds: vi.fn(),
}))

import { useCoup } from './coup'

beforeEach(() => {
  vi.useFakeTimers()
  useCoup.getState().exit()
})

describe('useCoup', () => {
  it('starts a hot-seat game with red to move and a hidden board', () => {
    useCoup.getState().start('pvp')
    const s = useCoup.getState()
    expect(s.active && s.mode === 'pvp' && s.turn === 'red').toBe(true)
    expect(s.board.flat().filter((p) => p?.hidden).length).toBe(30)
  })

  it('selects a piece, shows targets, moves it face-up and passes the turn', () => {
    useCoup.getState().start('pvp')
    const { select } = useCoup.getState()
    select({ row: 6, col: 0 }) // red soldier slot
    expect(useCoup.getState().targets).toEqual([{ row: 5, col: 0 }])
    select({ row: 5, col: 0 })
    const s = useCoup.getState()
    expect(s.turn).toBe('black')
    expect(s.board[5][0]?.hidden).toBe(false)
    expect(s.flipped).toEqual({ row: 5, col: 0 })
  })

  it('ignores the opponent pieces on your turn and blocks input while the computer thinks', () => {
    useCoup.getState().start('pvp')
    useCoup.getState().select({ row: 3, col: 0 })
    expect(useCoup.getState().selected).toBeNull()
  })

  it('lets the computer answer after the player moves', () => {
    useCoup.getState().start('ai', 'red')
    useCoup.getState().select({ row: 6, col: 0 })
    useCoup.getState().select({ row: 5, col: 0 })
    expect(useCoup.getState().thinking).toBe(true)
    vi.advanceTimersByTime(2000)
    const s = useCoup.getState()
    expect(s.thinking).toBe(false)
    expect(s.turn).toBe('red')
    expect(s.lastMove).not.toBeNull()
  })

  it('has the computer open when you play black', () => {
    useCoup.getState().start('ai', 'black')
    vi.advanceTimersByTime(2000)
    expect(useCoup.getState().turn).toBe('black')
  })
})
