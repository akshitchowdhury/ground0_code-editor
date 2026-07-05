// Ashura — the proving ground's guardian. Hand-built SVG line-art in the
// Japanese asura style: THREE heads (two profiles flanking a wrathful front
// face, like the Kōfuku-ji Ashura), six arms — each gripping one of the six
// programming-language emblems of the sandbox (JS, React, Python, Java,
// Shell, Go) — wreathed in a spiked flame halo. Cyberpunk crimson neon;
// SMIL-driven flicker/embers so it stays alive in hidden preview tabs.
const C = {
  glow: '#f43f5e',
  bright: '#fb7185',
  ember: '#f97316',
  hot: '#fbbf24',
  dim: 'rgb(244 63 94 / 0.35)',
  fill: 'rgb(40 10 16 / 0.9)',
}

export default function AshuraFigure({ className = '', animated = true }) {
  const cx = 220
  return (
    <svg viewBox="0 0 440 520" className={className} aria-hidden="true">
      <defs>
        <filter id="ashura-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="ashura-heat" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor={C.ember} stopOpacity="0.24" />
          <stop offset="55%" stopColor={C.glow} stopOpacity="0.1" />
          <stop offset="100%" stopColor={C.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Heat bloom */}
      <ellipse cx={cx} cy={230} rx="195" ry="215" fill="url(#ashura-heat)" />

      {/* Flame halo — spiked tongues of fire, flickering out of phase */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={`M${cx},46
              L${cx + 26},92 L${cx + 54},64 L${cx + 58},122 L${cx + 98},100 L${cx + 88},158
              L${cx + 134},152 L${cx + 108},204 L${cx + 148},224 L${cx + 112},262 L${cx + 140},304
              L${cx + 96},316 L${cx + 106},364 L${cx + 58},354 L${cx + 44},396 L${cx},376
              L${cx - 44},396 L${cx - 58},354 L${cx - 106},364 L${cx - 96},316 L${cx - 140},304
              L${cx - 112},262 L${cx - 148},224 L${cx - 108},204 L${cx - 134},152 L${cx - 88},158
              L${cx - 98},100 L${cx - 58},122 L${cx - 54},64 L${cx - 26},92 Z`}
          stroke={C.glow} strokeWidth="1.6" opacity="0.5"
        >
          {animated && <animate attributeName="opacity" values="0.32;0.62;0.42;0.58;0.32" dur="3.8s" repeatCount="indefinite" />}
        </path>
        <path
          d={`M${cx},92
              L${cx + 18},126 L${cx + 42},112 L${cx + 44},156 L${cx + 76},152 L${cx + 62},196
              L${cx + 96},214 L${cx + 68},248 L${cx + 88},290 L${cx + 52},296 L${cx + 56},336
              L${cx + 20},322 L${cx},344 L${cx - 20},322 L${cx - 56},336 L${cx - 52},296
              L${cx - 88},290 L${cx - 68},248 L${cx - 96},214 L${cx - 62},196 L${cx - 76},152
              L${cx - 44},156 L${cx - 42},112 L${cx - 18},126 Z`}
          stroke={C.ember} strokeWidth="1.3" opacity="0.5"
        >
          {animated && <animate attributeName="opacity" values="0.6;0.3;0.55;0.35;0.6" dur="2.9s" repeatCount="indefinite" />}
        </path>
      </g>

      {/* ---- Six arms (behind the torso), hands out to the emblems ---- */}
      <g stroke={C.bright} strokeWidth="2.4" fill="none" strokeLinecap="round">
        {/* Upper pair — raised high */}
        <path d={`M${cx - 48},216 C${cx - 96},184 ${cx - 122},142 ${cx - 138},100`} />
        <path d={`M${cx + 48},216 C${cx + 96},184 ${cx + 122},142 ${cx + 138},100`} />
        {/* Middle pair — outstretched */}
        <path d={`M${cx - 50},236 C${cx - 104},234 ${cx - 138},242 ${cx - 166},250`} />
        <path d={`M${cx + 50},236 C${cx + 104},234 ${cx + 138},242 ${cx + 166},250`} />
        {/* Lower pair — angled down */}
        <path d={`M${cx - 46},256 C${cx - 82},290 ${cx - 102},318 ${cx - 116},344`} />
        <path d={`M${cx + 46},256 C${cx + 82},290 ${cx + 102},318 ${cx + 116},344`} />
      </g>

      {/* ---- The six language emblems, one per hand ---- */}
      <g filter="url(#ashura-glow)">
        {/* JS — upper left: badge */}
        <g transform={`translate(${cx - 152}, 66)`}>
          <rect x="-16" y="-16" width="32" height="32" rx="6" fill={C.fill} stroke={C.hot} strokeWidth="2" />
          <text x="0" y="7" textAnchor="middle" fill={C.hot} fontSize="15" fontWeight="bold" fontFamily="monospace">JS</text>
        </g>

        {/* React — upper right: atom, slowly spinning */}
        <g transform={`translate(${cx + 152}, 66)`}>
          <circle r="3.5" fill={C.bright} />
          <g stroke={C.bright} strokeWidth="1.6" fill="none">
            {animated && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="14s" repeatCount="indefinite" />}
            <ellipse rx="17" ry="7" />
            <ellipse rx="17" ry="7" transform="rotate(60)" />
            <ellipse rx="17" ry="7" transform="rotate(120)" />
          </g>
        </g>

        {/* Python — middle left: coiled serpent */}
        <g transform={`translate(${cx - 184}, 250)`} stroke={C.ember} strokeWidth="2.2" fill="none" strokeLinecap="round">
          <path d="M-12,10 C-16,-2 -4,-14 6,-10 C16,-6 14,6 4,8 C-2,9 -6,4 -2,0 C1,-3 6,-1 5,3" />
          <circle cx="-12" cy="10" r="2" fill={C.ember} stroke="none" />
        </g>

        {/* Java — middle right: coffee cup with rising steam */}
        <g transform={`translate(${cx + 184}, 250)`}>
          <path d="M-11,-2 L-9,14 Q0,20 9,14 L11,-2 Z" fill={C.fill} stroke={C.ember} strokeWidth="2" strokeLinejoin="round" />
          <path d="M11,1 q9,1 7,8 q-2,6 -9,4" fill="none" stroke={C.ember} strokeWidth="2" strokeLinecap="round" />
          <g stroke={C.bright} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8">
            <path d="M-4,-7 q3,-4 0,-8">
              {animated && <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" />}
            </path>
            <path d="M4,-7 q-3,-4 0,-8">
              {animated && <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.8s" repeatCount="indefinite" />}
            </path>
          </g>
        </g>

        {/* Shell — lower left: terminal */}
        <g transform={`translate(${cx - 134}, 356)`}>
          <rect x="-17" y="-13" width="34" height="26" rx="4" fill={C.fill} stroke={C.bright} strokeWidth="2" />
          <text x="-9" y="6" fill={C.bright} fontSize="13" fontWeight="bold" fontFamily="monospace">&gt;_</text>
        </g>

        {/* Go — lower right: hexagon badge */}
        <g transform={`translate(${cx + 134}, 356)`}>
          <path d="M0,-17 L15,-8 L15,8 L0,17 L-15,8 L-15,-8 Z" fill={C.fill} stroke={C.ember} strokeWidth="2" strokeLinejoin="round" />
          <text x="0" y="5" textAnchor="middle" fill={C.ember} fontSize="12" fontWeight="bold" fontFamily="monospace">GO</text>
        </g>
      </g>

      {/* ---- Torso ---- */}
      <g stroke={C.bright} strokeWidth="2" fill={C.fill} strokeLinecap="round" strokeLinejoin="round">
        {/* Broad armored torso with spiked pauldrons */}
        <path
          d={`M${cx - 58},220 L${cx - 70},204 L${cx - 50},202 L${cx - 14},192 Q${cx},188 ${cx + 14},192 L${cx + 50},202
              L${cx + 70},204 L${cx + 58},220 L${cx + 36},326 Q${cx},342 ${cx - 36},326 Z`}
        />
        {/* Armor chevrons */}
        <path d={`M${cx - 28},244 L${cx},260 L${cx + 28},244`} fill="none" strokeWidth="1.6" opacity="0.85" />
        <path d={`M${cx - 24},276 L${cx},292 L${cx + 24},276`} fill="none" strokeWidth="1.6" opacity="0.85" />
        {/* Wide battle stance */}
        <path d={`M${cx - 28},330 L${cx - 50},390 L${cx - 64},454 L${cx - 38},454 L${cx - 22},400 Z`} />
        <path d={`M${cx + 28},330 L${cx + 50},390 L${cx + 64},454 L${cx + 38},454 L${cx + 22},400 Z`} />
      </g>

      {/* ---- THREE HEADS: two profiles flanking the wrathful front face ---- */}
      {/* Side heads first (drawn behind) */}
      <g stroke={C.bright} strokeWidth="2" fill={C.fill} strokeLinecap="round" strokeLinejoin="round">
        {/* Left profile head — nose pointing outward */}
        <path d={`M${cx - 22},134 Q${cx - 44},126 ${cx - 54},142 L${cx - 62},156 L${cx - 55},160 L${cx - 58},170 Q${cx - 52},184 ${cx - 36},184 L${cx - 22},180 Z`} />
        {/* Right profile head */}
        <path d={`M${cx + 22},134 Q${cx + 44},126 ${cx + 54},142 L${cx + 62},156 L${cx + 55},160 L${cx + 58},170 Q${cx + 52},184 ${cx + 36},184 L${cx + 22},180 Z`} />
      </g>
      {/* Profile eyes + brows (one each, glowing, slanted in anger) */}
      <g>
        <path d={`M${cx - 50},146 l9,4 M${cx + 50},146 l-9,4`} stroke={C.bright} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx={cx - 44} cy={153} r="2" fill={C.ember} filter="url(#ashura-glow)">
          {animated && <animate attributeName="opacity" values="1;0.4;1" dur="2.1s" begin="0.3s" repeatCount="indefinite" />}
        </circle>
        <circle cx={cx + 44} cy={153} r="2" fill={C.ember} filter="url(#ashura-glow)">
          {animated && <animate attributeName="opacity" values="1;0.4;1" dur="2.1s" begin="0.9s" repeatCount="indefinite" />}
        </circle>
        {/* Grim profile mouths */}
        <path d={`M${cx - 57},166 l7,1 M${cx + 57},166 l-7,1`} stroke={C.bright} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Central front face */}
      <g stroke={C.bright} strokeWidth="2.2" fill={C.fill} strokeLinecap="round" strokeLinejoin="round">
        {/* Sharper jawline */}
        <path d={`M${cx - 24},138 Q${cx - 27},162 ${cx - 16},178 L${cx},188 L${cx + 16},178 Q${cx + 27},162 ${cx + 24},138 Q${cx + 12},128 ${cx},128 Q${cx - 12},128 ${cx - 24},138 Z`} />
      </g>
      {/* Spiked crown ridge across all three heads */}
      <path
        d={`M${cx - 56},140 L${cx - 48},108 L${cx - 38},130 L${cx - 28},100 L${cx - 16},126 L${cx - 6},94 L${cx + 4},126
            L${cx + 14},96 L${cx + 26},128 L${cx + 36},102 L${cx + 46},130 L${cx + 56},140`}
        fill={C.fill} stroke={C.bright} strokeWidth="2" strokeLinejoin="round"
      />
      {/* Wrathful front face — third-eye slit, slanted burning eyes, fanged snarl */}
      <g strokeLinecap="round">
        {/* Third eye — vertical slit on the forehead */}
        <path d={`M${cx},134 l2.5,7 -2.5,7 -2.5,-7 Z`} fill={C.hot} filter="url(#ashura-glow)">
          {animated && <animate attributeName="opacity" values="0.5;1;0.5" dur="3.4s" repeatCount="indefinite" />}
        </path>
        {/* V-brows, hard slant */}
        <path d={`M${cx - 19},152 l14,7 M${cx + 19},152 l-14,7`} stroke={C.bright} strokeWidth="2.4" fill="none" />
        {/* Narrow burning eyes */}
        <path d={`M${cx - 15},161 l9,2 M${cx + 15},161 l-9,2`} stroke={C.ember} strokeWidth="3" filter="url(#ashura-glow)">
          {animated && <animate attributeName="opacity" values="1;0.5;1" dur="2.4s" repeatCount="indefinite" />}
        </path>
        {/* Snarl with fangs */}
        <path d={`M${cx - 10},176 q10,5 20,0`} stroke={C.bright} strokeWidth="1.8" fill="none" />
        <path d={`M${cx - 8},177 l2.5,5 2.5,-4 M${cx + 3},178 l2.5,4 2.5,-5`} stroke={C.bright} strokeWidth="1.4" fill="none" />
      </g>

      {/* Cracked proving ground */}
      <g stroke={C.dim} strokeWidth="1.4" fill="none" strokeLinecap="round">
        <path d={`M56,458 L384,458`} opacity="0.7" />
        <path d={`M${cx - 94},458 l-16,16 M${cx - 62},458 l-8,22 M${cx + 46},458 l14,18 M${cx + 98},458 l6,14`} />
        <path d={`M${cx - 12},458 l-6,12 l-10,6`} />
      </g>

      {/* Rising embers */}
      {[
        { x: 118, y: 432, d: 0 },
        { x: 302, y: 442, d: 1.1 },
        { x: 178, y: 422, d: 2.3 },
        { x: 342, y: 402, d: 0.6 },
        { x: 88, y: 382, d: 1.8 },
      ].map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r="2.2" fill={C.ember} filter="url(#ashura-glow)" opacity="0">
          {animated && (
            <>
              <animate attributeName="opacity" values="0;0.9;0" dur="4.2s" begin={`${e.d}s`} repeatCount="indefinite" />
              <animate attributeName="cy" values={`${e.y};${e.y - 90}`} dur="4.2s" begin={`${e.d}s`} repeatCount="indefinite" />
            </>
          )}
        </circle>
      ))}
    </svg>
  )
}
