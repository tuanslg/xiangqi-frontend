import { COLS, ROWS, START_FEN, parseFen } from '@xiangqi/shared'
import { x, y } from './boardGeometry'
import { BoardSvg } from './BoardSvg'
import { Piece3D } from './PieceDisc'

const START = parseFen(START_FEN).board

/** The tilted showcase board in the middle of the lobby. */
export function LobbyHero() {
  return (
    <section className="lobby-hero" aria-hidden="true">
      <div className="lobby-hero-title gold-text">Cờ Tướng</div>
      <div className="lobby-hero-board">
        <BoardSvg>
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const p = START[r][c]
              return p ? (
                <g key={`${r}-${c}`} transform={`translate(${x(c)} ${y(r)})`}>
                  <Piece3D piece={p} />
                </g>
              ) : null
            }),
          )}
        </BoardSvg>
      </div>
      <div className="lobby-hero-caption">Chọn trò chơi để bắt đầu</div>
    </section>
  )
}
