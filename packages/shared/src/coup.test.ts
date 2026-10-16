import { describe, expect, it } from 'vitest'
import {
  coupAllLegalMoves,
  coupApplyMove,
  coupBestMove,
  coupIsCheckmate,
  coupLegalMovesFrom,
  newCoupBoard,
} from './coup'
import type { CoupBoard } from './coup'

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const count = (board: CoupBoard, color: string, hidden?: boolean) =>
  board.flat().filter((p) => p && p.color === color && (hidden === undefined || p.hidden === hidden)).length

describe('newCoupBoard', () => {
  it('keeps generals face-up and hides the other 15 pieces per side', () => {
    const b = newCoupBoard(seeded(1))
    for (const color of ['red', 'black']) {
      expect(count(b, color)).toBe(16)
      expect(count(b, color, true)).toBe(15)
    }
    expect(b[9][4]).toEqual({ color: 'red', type: 'K', hidden: false })
    expect(b[0][4]).toEqual({ color: 'black', type: 'K', hidden: false })
  })

  it('shuffles the real identities but keeps the standard multiset', () => {
    const b = newCoupBoard(seeded(7))
    const types = b.flat().filter((p) => p && p.color === 'red' && p.hidden).map((p) => p!.type).sort().join('')
    expect(types).toBe('AABBCCNNPPPPPRR')
    const layout = (x: CoupBoard) => x.flat().map((p) => p?.type ?? '.').join('')
    expect(layout(newCoupBoard(seeded(1)))).not.toBe(layout(newCoupBoard(seeded(2))))
  })
})

describe('moves', () => {
  it('a face-down piece moves like its starting square, whatever it really is', () => {
    const b = newCoupBoard(seeded(3))
    // the piece on the red left-corner square moves like a chariot: forward only (blocked by the soldier)
    b[6][0] = null // soldier gone, so the chariot-slot piece can run up the file
    const moves = coupLegalMovesFrom(b, { row: 9, col: 0 })
    expect(moves.map((m) => m.to.row)).toContain(5)
    expect(moves.every((m) => m.to.col === 0 || m.to.row === 9)).toBe(true)
  })

  it('flips on its first move and then moves as its real type', () => {
    const b = newCoupBoard(seeded(3))
    b[6][0] = null
    const real = b[9][0]!.type
    const res = coupApplyMove(b, { from: { row: 9, col: 0 }, to: { row: 5, col: 0 } })
    expect(res.flipped).toBe(true)
    expect(res.board[5][0]).toEqual({ color: 'red', type: real, hidden: false })
    expect(res.board[9][0]).toBeNull()
    expect(coupApplyMove(res.board, { from: { row: 5, col: 0 }, to: { row: 4, col: 0 } }).flipped).toBe(false)
  })

  it('reveals a captured face-down piece to the caller', () => {
    const b = newCoupBoard(seeded(5))
    b[6][1] = b[9][0] // park a red piece in front of a black one for a clean capture
    b[3][1] = null
    const target = b[2][1]!
    const res = coupApplyMove(b, { from: { row: 7, col: 1 }, to: { row: 2, col: 1 } })
    expect(res.captured).toEqual(target)
  })

  it('every side has opening moves and none is checkmated at the start', () => {
    const b = newCoupBoard(seeded(9))
    expect(coupAllLegalMoves(b, 'red').length).toBeGreaterThan(0)
    expect(coupIsCheckmate(b, 'red')).toBe(false)
    expect(coupIsCheckmate(b, 'black')).toBe(false)
  })
})

describe('coupBestMove', () => {
  it('always returns a legal move and can play a whole game without throwing', () => {
    const rng = seeded(11)
    let b = newCoupBoard(rng)
    let turn: 'red' | 'black' = 'red'
    for (let i = 0; i < 150; i++) {
      const m = coupBestMove(b, turn, rng)
      if (!m) break
      expect(coupAllLegalMoves(b, turn).some((l) => l.from.row === m.from.row && l.from.col === m.from.col && l.to.row === m.to.row && l.to.col === m.to.col)).toBe(true)
      b = coupApplyMove(b, m).board
      turn = turn === 'red' ? 'black' : 'red'
    }
  })
})
