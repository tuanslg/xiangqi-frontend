import { COLS, ROWS } from '@xiangqi/shared'
import { H, THICK, W, x, y } from './boardGeometry'
import { GLYPH_FONT } from './pieceLabels'

/** The wooden board: slab, grid, palaces, river and corner ticks. Overlays (pieces, hints) go in `children`. */
export function BoardSvg({ children, className = '', svgKey }: { children?: React.ReactNode; className?: string; svgKey?: string }) {
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
      key={svgKey}
      viewBox={`0 0 ${W} ${H + THICK}`}
      className={`w-full max-w-[600px] drop-shadow-[0_14px_18px_rgba(0,0,0,0.55)] ${className}`}
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
        <radialGradient id="pieceBack" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#d9b377" />
          <stop offset="0.6" stopColor="#c39a58" />
          <stop offset="1" stopColor="#a8803f" />
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

      {children}
    </svg>
  )
}
