import { COLS, ROWS } from '@xiangqi/shared'
import { selectInCheck, useGame } from '../store/game'
import { CELL, x, y } from './boardGeometry'
import { BoardSvg } from './BoardSvg'
import { Piece3D } from './PieceDisc'

export function Board() {
  const { board, selected, targets, lastMove, select, playerColor, capture, moveId, shake, shakeKind } = useGame()
  // Trail of the last move: green for our own move, gray for the opponent's, so it never reads as a hint.
  const mover = lastMove ? board[lastMove.to.row][lastMove.to.col]?.color : undefined
  const trailColor = mover && mover !== playerColor ? '#7d8288' : '#2f9e3a'
  const shakeKey = shake ? `shake${shake}` : 'calm'
  const inCheck = useGame(selectInCheck)
  const flip = playerColor === 'black'
  // Flip the view so the human always plays from the bottom.
  const vr = (r: number) => (flip ? ROWS - 1 - r : r)
  const vc = (c: number) => (flip ? COLS - 1 - c : c)

  return (
    <BoardSvg
      svgKey={shakeKey}
      className={shake ? (shakeKind === 'check' ? 'board-shake' : 'board-shake-soft') : ''}
    >
      {/* click targets for every intersection */}
      {board.map((row, r) =>
        row.map((_, c) => (
          <rect
            key={`hit${r}-${c}`}
            x={x(vc(c)) - CELL / 2}
            y={y(vr(r)) - CELL / 2}
            width={CELL}
            height={CELL}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => select({ row: r, col: c })}
          />
        )),
      )}

      {lastMove && (
        <g
          transform={`translate(${x(vc(lastMove.from.col))} ${y(vr(lastMove.from.row))})`}
          pointerEvents="none"
        >
          <circle r={11} fill="none" stroke={trailColor} strokeWidth={2} opacity={0.8} />
          <circle r={5.5} fill={trailColor} opacity={0.9} />
        </g>
      )}

      {targets.map((t) => (
        <g key={`t${t.row}-${t.col}`} transform={`translate(${x(vc(t.col))} ${y(vr(t.row))})`} pointerEvents="none">
          {board[t.row][t.col] ? (
            <circle r={31} fill="none" stroke="#2f9e3a" strokeWidth={4} opacity={0.9} />
          ) : (
            <>
              <circle r={11} fill="none" stroke="#2f9e3a" strokeWidth={2} opacity={0.8} />
              <circle r={5.5} fill="#2f9e3a" opacity={0.9} />
            </>
          )}
        </g>
      ))}

      {board.map((row, r) =>
        row.map((p, c) => {
          if (!p) return null
          const isSel = selected?.row === r && selected?.col === c
          const kingInCheck = inCheck && p.type === 'K' && useGame.getState().turn === p.color
          const isMoved = lastMove && lastMove.to.row === r && lastMove.to.col === c
          const slide = isMoved
            ? {
                '--dx': `${x(vc(lastMove.from.col)) - x(vc(c))}px`,
                '--dy': `${y(vr(lastMove.from.row)) - y(vr(r))}px`,
              }
            : undefined
          return (
            <g
              key={`pc${r}-${c}${isMoved ? `-m${moveId}` : ''}`}
              transform={`translate(${x(vc(c))} ${y(vr(r))})`}
              pointerEvents="none"
            >
              <g className={isMoved ? 'piece-slide' : undefined} style={slide as React.CSSProperties}>
                <Piece3D piece={p} selected={isSel} inCheck={kingInCheck} />
              </g>
            </g>
          )
        }),
      )}

      {capture && (
        <g
          key={`cap${capture.id}`}
          transform={`translate(${x(vc(capture.pos.col))} ${y(vr(capture.pos.row))})`}
          pointerEvents="none"
        >
          <g className="captured-ghost">
            <Piece3D piece={capture.piece} />
          </g>
          <circle r={34} fill="url(#burst)" className="capture-burst" />
          <circle r={28} fill="none" stroke="#ffcf6b" strokeWidth={4} className="capture-ring" />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.3
            const d = 46 + (i % 3) * 12
            return (
              <circle
                key={i}
                r={3 + (i % 3)}
                fill={i % 2 ? '#ffb347' : '#fff1a8'}
                className="capture-spark"
                style={{ '--sx': `${Math.cos(a) * d}px`, '--sy': `${Math.sin(a) * d}px` } as React.CSSProperties}
              />
            )
          })}
        </g>
      )}
    </BoardSvg>
  )
}
