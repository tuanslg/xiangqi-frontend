import { COLS, ROWS } from '@xiangqi/shared'
import type { Piece } from '@xiangqi/shared'
import { selectInCheck, useGame } from '../store/game'
import { GLYPH_FONT, LABEL } from './pieceLabels'

const CELL = 64
const PAD = 52
const W = PAD * 2 + CELL * (COLS - 1)
const THICK = 16
const H = PAD * 2 + CELL * (ROWS - 1)

const x = (col: number) => PAD + col * CELL
const y = (row: number) => PAD + row * CELL

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

  const lines: React.ReactNode[] = []
  for (let r = 0; r < ROWS; r++)
    lines.push(<line key={`h${r}`} x1={x(0)} x2={x(8)} y1={y(r)} y2={y(r)} />)
  for (let c = 0; c < COLS; c++) {
    if (c === 0 || c === 8) lines.push(<line key={`v${c}`} x1={x(c)} x2={x(c)} y1={y(0)} y2={y(9)} />)
    else {
      lines.push(<line key={`vt${c}`} x1={x(c)} x2={x(c)} y1={y(0)} y2={y(4)} />)
      lines.push(<line key={`vb${c}`} x1={x(c)} x2={x(c)} y1={y(5)} y2={y(9)} />)
    }
  }
  const palace = (r0: number) => (
    <g key={`p${r0}`}>
      <line x1={x(3)} y1={y(r0)} x2={x(5)} y2={y(r0 + 2)} />
      <line x1={x(5)} y1={y(r0)} x2={x(3)} y2={y(r0 + 2)} />
    </g>
  )

  // Little corner ticks at cannon and soldier starting points.
  const marks: React.ReactNode[] = []
  const tick = (r: number, c: number) => {
    const cx = x(c)
    const cy = y(r)
    const g = 5
    const l = 12
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        if ((c === 0 && sx === -1) || (c === 8 && sx === 1)) continue
        marks.push(
          <polyline
            key={`m${r}-${c}-${sx}-${sy}`}
            fill="none"
            strokeWidth={1.4}
            points={`${cx + sx * g},${cy + sy * (g + l)} ${cx + sx * g},${cy + sy * g} ${cx + sx * (g + l)},${cy + sy * g}`}
          />,
        )
      }
  }
  for (const c of [1, 7]) {
    tick(2, c)
    tick(7, c)
  }
  for (const c of [0, 2, 4, 6, 8]) {
    tick(3, c)
    tick(6, c)
  }

  return (
    <svg
      key={shakeKey}
      viewBox={`0 0 ${W} ${H + THICK}`}
      className={`w-full max-w-[600px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.55)] ${shake ? (shakeKind === 'check' ? 'board-shake' : 'board-shake-soft') : ''}`}
    >
      <defs>
        <linearGradient id="boardWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dcaa" />
          <stop offset="0.5" stopColor="#efcd94" />
          <stop offset="1" stopColor="#e3b878" />
        </linearGradient>
        <linearGradient id="boardEdge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99556" />
          <stop offset="1" stopColor="#8d5f2d" />
        </linearGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.22" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.3  0 0 0 0 0.12  1.4 0 0 0 -0.55" />
        </filter>
        <radialGradient id="pieceTop" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#f6e6bf" />
          <stop offset="0.6" stopColor="#ecd4a2" />
          <stop offset="1" stopColor="#d9b97f" />
        </radialGradient>
        <radialGradient id="pieceTopCheck" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#fff0ec" />
          <stop offset="0.6" stopColor="#ffb8ac" />
          <stop offset="1" stopColor="#e07a6a" />
        </radialGradient>
        <linearGradient id="pieceSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9b06c" />
          <stop offset="1" stopColor="#9a6a30" />
        </linearGradient>
        <radialGradient id="pieceShadow">
          <stop offset="0" stopColor="#3a2208" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#3a2208" stopOpacity="0.25" />
          <stop offset="1" stopColor="#3a2208" stopOpacity="0" />
        </radialGradient>
        <filter id="shadowSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="shadowTight" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <radialGradient id="burst">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.4" stopColor="#ffb347" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* slab thickness, then the top surface */}
      <rect y={THICK} width={W} height={H} rx={8} fill="url(#boardEdge)" />
      <rect width={W} height={H} rx={8} fill="url(#boardWood)" />
      <rect width={W} height={H} rx={8} filter="url(#grain)" opacity={0.5} />
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={8} fill="none" stroke="#b9873f" strokeOpacity={0.7} strokeWidth={2} />
      {/* double frame: heavy outer line, hairline inner line */}
      <rect x={14} y={14} width={W - 28} height={H - 28} rx={2} fill="none" stroke="#6b4a2a" strokeWidth={3} />
      <rect x={20} y={20} width={W - 40} height={H - 40} fill="none" stroke="#6b4a2a" strokeOpacity={0.7} strokeWidth={1} />
      <g stroke="#6b4a2a" strokeWidth={1.6} strokeLinecap="square">
        {lines}
        {palace(0)}
        {palace(7)}
        <rect x={x(0)} y={y(0)} width={x(8) - x(0)} height={y(9) - y(0)} fill="none" strokeWidth={3} />
        {marks}
      </g>
      <text
        x={W / 2}
        y={y(4.5) + 10}
        textAnchor="middle"
        fontSize={30}
        fill="#6b4a2a"
        fillOpacity={0.45}
        letterSpacing={34}
        fontFamily={GLYPH_FONT}
      >
        楚河漢界
      </text>

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
    </svg>
  )
}

function Piece3D({ piece, selected, inCheck }: { piece: Piece; selected?: boolean; inCheck?: boolean }) {
  const color = piece.color === 'red' ? '#b3150f' : '#141414'
  const label = LABEL[piece.color][piece.type]
  const lift = selected ? -6 : 0
  return (
    <g>
      {/* light from the top-left: a soft cast shadow falls down-right, plus a tight contact shadow */}
      <circle cx={selected ? 15 : 9} cy={selected ? 16 : 10} r={selected ? 31 : 30} fill="#2a1604" opacity={selected ? 0.28 : 0.35} filter="url(#shadowSoft)" />
      <circle cx={5} cy={8} r={29} fill="#2a1604" opacity={selected ? 0 : 0.6} filter="url(#shadowTight)" />
      <g transform={`translate(0 ${lift})`}>
        {/* rim: the visible thickness of the disc */}
        <circle cx={1.2} cy={3} r={29} fill="url(#pieceSide)" />
        <circle cx={0} cy={0} r={29} fill="url(#pieceTop)" stroke="#b58a4a" strokeWidth={1.2} />
        {inCheck && <circle cx={0} cy={0} r={29} fill="url(#pieceTopCheck)" />}
        <circle cx={0} cy={0} r={24.5} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={1.2} />
        <text
          x={0}
          y={12}
          textAnchor="middle"
          fontSize={35}
          fontWeight={700}
          fontFamily={GLYPH_FONT}
          fill={color}
          stroke={color}
          strokeWidth={0.4}
          strokeLinejoin="round"
          fillOpacity={0.92}
        >
          {label}
        </text>
        <ellipse cx={-9} cy={-17} rx={13} ry={5} fill="#fff" fillOpacity={0.08} transform="rotate(-25 -9 -17)" />
        {selected && <circle cx={0} cy={0} r={30} fill="none" stroke="#2f9e3a" strokeWidth={3.5} />}
      </g>
    </g>
  )
}
