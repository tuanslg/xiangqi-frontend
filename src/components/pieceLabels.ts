import type { Piece } from '@xiangqi/shared'

export const GLYPH_FONT = "'LXGW WenKai TC','KaiTi','Kaiti SC','STKaiti','Noto Serif TC','Songti SC','PMingLiU',serif"

export const LABEL: Record<Piece['color'], Record<Piece['type'], string>> = {
  red: { K: '帥', A: '仕', B: '相', N: '傌', R: '俥', C: '炮', P: '兵' },
  black: { K: '將', A: '士', B: '象', N: '馬', R: '車', C: '砲', P: '卒' },
}
