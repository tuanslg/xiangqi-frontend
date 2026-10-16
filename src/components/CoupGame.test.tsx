import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../audio/sound', () => ({
  isMuted: () => false, setMuted: vi.fn(),
  playCapture: vi.fn(), playCheck: vi.fn(), playLose: vi.fn(), playMove: vi.fn(), playWin: vi.fn(), preloadSounds: vi.fn(),
}))

import { useCoup } from '../store/coup'
import { CoupGame } from './CoupGame'

beforeEach(() => useCoup.getState().exit())

describe('CoupGame', () => {
  it('renders the face-down board without revealing any real piece except the generals', () => {
    // renderToString reads the store's initial snapshot: a fresh, fully face-down board
    const html = renderToString(<CoupGame />)
    // only the two generals show a face
    expect((html.match(/帥|將/g) ?? []).length).toBe(2)
    for (const g of ['仕', '士', '相', '象', '傌', '馬', '俥', '車', '炮', '砲', '兵', '卒']) expect(html).not.toContain(g)
  })
})
