import type { Piece } from '@xiangqi/shared'
import { GLYPH_FONT, LABEL } from './pieceLabels'

export function Piece3D({ piece, selected, inCheck, hidden }: { piece: Piece; selected?: boolean; inCheck?: boolean; hidden?: boolean }) {
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
        <circle cx={0} cy={0} r={29} fill={hidden ? "url(#pieceBack)" : "url(#pieceTop)"} stroke="#b58a4a" strokeWidth={1.2} />
        {inCheck && <circle cx={0} cy={0} r={29} fill="url(#pieceTopCheck)" />}
        <circle cx={0} cy={0} r={24.5} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={1.2} />
        {hidden ? (
          <g>
            <circle cx={0} cy={0} r={20} fill="none" stroke={color} strokeOpacity={0.7} strokeWidth={2.5} />
            <circle cx={0} cy={0} r={13} fill={color} fillOpacity={0.14} stroke={color} strokeOpacity={0.5} strokeWidth={1} />
            <path d="M0 -9 L9 0 L0 9 L-9 0 Z" fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={1.6} />
            <circle cx={0} cy={0} r={2.6} fill={color} fillOpacity={0.7} />
          </g>
        ) : (
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
        )}
        <ellipse cx={-9} cy={-17} rx={13} ry={5} fill="#fff" fillOpacity={0.08} transform="rotate(-25 -9 -17)" />
        {selected && <circle cx={0} cy={0} r={30} fill="none" stroke="#2f9e3a" strokeWidth={3.5} />}
      </g>
    </g>
  )
}
