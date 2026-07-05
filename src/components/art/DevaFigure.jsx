// Deva — the knowledge realm's guardian. Hand-built SVG line-art in the
// Japanese Buddhist-deva style (meditating figure, mandala halo, lotus seat,
// third eye) rendered as cyberpunk purple neon. Same SMIL-not-rAF animation
// technique as NetworkScene so it keeps moving in hidden preview tabs.
const P = {
  glow: '#a855f7',
  bright: '#e879f9',
  soft: '#c084fc',
  dim: 'rgb(168 85 247 / 0.35)',
  fill: 'rgb(24 12 38 / 0.85)',
}

export default function DevaFigure({ className = '', animated = true }) {
  const cx = 220
  const cy = 185 // mandala centre (behind the head)
  return (
    <svg viewBox="0 0 440 520" className={className} aria-hidden="true">
      <defs>
        <filter id="deva-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="deva-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={P.bright} stopOpacity="0.35" />
          <stop offset="60%" stopColor={P.glow} stopOpacity="0.12" />
          <stop offset="100%" stopColor={P.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Faint code-rain — knowledge falling */}
      {[70, 110, 350, 385].map((x, i) => (
        <line
          key={x}
          x1={x} y1={30} x2={x} y2={470}
          stroke={P.dim} strokeWidth="1" strokeDasharray="2 14" opacity="0.5"
        >
          {animated && (
            <animate attributeName="stroke-dashoffset" values="0;-64" dur={`${7 + i * 2}s`} repeatCount="indefinite" />
          )}
        </line>
      ))}

      {/* Mandala — rotating rings of the dharma-circuit */}
      <g opacity="0.9">
        <circle cx={cx} cy={cy} r="150" fill="none" stroke={P.dim} strokeWidth="1" strokeDasharray="3 9" />
        <circle cx={cx} cy={cy} r="118" fill="none" stroke={P.soft} strokeWidth="1" strokeDasharray="18 10" opacity="0.5">
          {animated && (
            <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="80s" repeatCount="indefinite" />
          )}
        </circle>
        <g opacity="0.55">
          {animated && (
            <animateTransform attributeName="transform" type="rotate" from={`360 ${cx} ${cy}`} to={`0 ${cx} ${cy}`} dur="120s" repeatCount="indefinite" />
          )}
          {/* 12 lotus petals of the outer mandala */}
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={`M${cx},${cy - 128} q10,-24 0,-42 q-10,18 0,42`}
              fill="none" stroke={P.soft} strokeWidth="1.2"
              transform={`rotate(${i * 30} ${cx} ${cy})`}
            />
          ))}
        </g>
        {/* Circuit nodes on the ring */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4
          return (
            <circle
              key={i}
              cx={cx + Math.cos(a) * 150} cy={cy + Math.sin(a) * 150}
              r="3" fill={P.glow} filter="url(#deva-glow)" opacity="0.8"
            >
              {animated && (
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur="4s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              )}
            </circle>
          )
        })}
      </g>

      {/* Halo disc behind the head */}
      <circle cx={cx} cy={148} r="64" fill="url(#deva-halo)" />
      <circle cx={cx} cy={148} r="46" fill="none" stroke={P.bright} strokeWidth="1.4" opacity="0.7" filter="url(#deva-glow)" />

      {/* ---- The figure (line-art silhouette) ---- */}
      <g stroke={P.soft} strokeWidth="2" fill={P.fill} strokeLinecap="round" strokeLinejoin="round">
        {/* Ushnisha topknot */}
        <circle cx={cx} cy={112} r="9" />
        {/* Head */}
        <circle cx={cx} cy={148} r="27" />
        {/* Long ears (deva iconography) */}
        <path d={`M${cx - 27},146 q-7,4 -5,18 q6,2 8,-4`} fill={P.fill} />
        <path d={`M${cx + 27},146 q7,4 5,18 q-6,2 -8,-4`} fill={P.fill} />
        {/* Shoulders + robed torso */}
        <path
          d={`M${cx - 52},204
              Q${cx - 56},196 ${cx - 38},190
              L${cx - 14},182 Q${cx},178 ${cx + 14},182 L${cx + 38},190
              Q${cx + 56},196 ${cx + 52},204
              L${cx + 40},300 Q${cx},316 ${cx - 40},300 Z`}
        />
        {/* Arms folded to the lap — dhyana mudra */}
        <path d={`M${cx - 50},208 C${cx - 66},252 ${cx - 48},296 ${cx - 14},314`} fill="none" />
        <path d={`M${cx + 50},208 C${cx + 66},252 ${cx + 48},296 ${cx + 14},314`} fill="none" />
        {/* Cupped hands */}
        <ellipse cx={cx} cy={316} rx="20" ry="9" />
        {/* Crossed legs — lotus seat mass */}
        <path
          d={`M${cx - 96},352 Q${cx},312 ${cx + 96},352 Q${cx + 60},392 ${cx},392 Q${cx - 60},392 ${cx - 96},352 Z`}
        />
      </g>

      {/* Serene closed eyes + third eye */}
      <g stroke={P.bright} strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d={`M${cx - 15},150 q6,5 12,0`} />
        <path d={`M${cx + 3},150 q6,5 12,0`} />
      </g>
      <path
        d={`M${cx},128 l3.5,6 -3.5,6 -3.5,-6 Z`}
        fill={P.bright} filter="url(#deva-glow)"
      >
        {animated && <animate attributeName="opacity" values="0.6;1;0.6" dur="3.2s" repeatCount="indefinite" />}
      </path>

      {/* Lotus petals beneath the seat */}
      <g stroke={P.glow} strokeWidth="1.5" fill="none" opacity="0.85">
        {[-64, -32, 0, 32, 64].map((dx) => (
          <path key={dx} d={`M${cx + dx},416 q10,-22 0,-34 q-10,12 0,34`} />
        ))}
        <path d={`M${cx - 96},414 Q${cx},436 ${cx + 96},414`} />
      </g>

      {/* Floating knowledge glyphs */}
      {[
        { x: 118, y: 250, t: 'δ', d: 0 },
        { x: 322, y: 236, t: 'φ', d: 1.4 },
        { x: 140, y: 120, t: '0', d: 2.2 },
        { x: 316, y: 340, t: 'Σ', d: 0.8 },
      ].map((g) => (
        <text
          key={g.t + g.x}
          x={g.x} y={g.y}
          fill={P.bright} fontSize="15" fontFamily="monospace" opacity="0.65"
          filter="url(#deva-glow)"
        >
          {g.t}
          {animated && (
            <>
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="5s" begin={`${g.d}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${g.y};${g.y - 10};${g.y}`} dur="6s" begin={`${g.d}s`} repeatCount="indefinite" />
            </>
          )}
        </text>
      ))}
    </svg>
  )
}
