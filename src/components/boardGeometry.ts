import { COLS, ROWS } from '@xiangqi/shared'

export const CELL = 64
export const PAD = 52
export const W = PAD * 2 + CELL * (COLS - 1)
export const THICK = 16
export const H = PAD * 2 + CELL * (ROWS - 1)

export const x = (col: number) => PAD + col * CELL
export const y = (row: number) => PAD + row * CELL
