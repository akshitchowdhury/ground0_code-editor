import { useEffect, useRef } from 'react'
import { Code2 } from 'lucide-react'

// Animated 3D network for the login screen's left pane. A constellation of
// nodes + edges rendered three times at different depths (translateZ) for an
// extruded 3D look — same technique as Watermark3D — with packets flowing
// along the front layer's edges. Packet/pulse motion uses SVG SMIL so it
// animates without requestAnimationFrame; the mouse-parallax tilt uses rAF.

const NODES = [
  { x: 280, y: 280, r: 13, hub: true }, // 0 — central hub
  { x: 120, y: 130, r: 8 }, // 1
  { x: 300, y: 90, r: 7 }, // 2
  { x: 450, y: 150, r: 9 }, // 3
  { x: 500, y: 330, r: 7 }, // 4
  { x: 400, y: 460, r: 9 }, // 5
  { x: 210, y: 480, r: 7 }, // 6
  { x: 80, y: 340, r: 8 }, // 7
  { x: 170, y: 250, r: 6 }, // 8
  { x: 380, y: 250, r: 6 }, // 9
]

const EDGES = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1],
  [8, 0], [9, 0], [8, 1], [9, 3], [8, 7], [9, 4],
]

const edgePath = (a, b) => `M${NODES[a].x},${NODES[a].y} L${NODES[b].x},${NODES[b].y}`

// Subset of edges that carry a travelling packet, with staggered timing.
const PACKETS = [
  [0, 3, 4.0, 0], [1, 2, 5.0, 0.6], [0, 5, 4.5, 1.2], [7, 0, 5.0, 0.4],
  [2, 3, 4.0, 2.0], [0, 4, 5.0, 1.6], [6, 5, 4.5, 0.9], [8, 1, 5.0, 2.4],
  [9, 4, 4.0, 1.1], [0, 6, 5.0, 2.8], [3, 4, 4.5, 0.2], [0, 1, 5.0, 1.9],
].map(([a, b, dur, begin]) => ({ path: edgePath(a, b), dur, begin }))

function Net({ animated }) {
  return (
    <svg viewBox="0 0 560 560" className="h-full w-full overflow-visible">
      <defs>
        <radialGradient id="net-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <filter id="net-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      {/* Edges */}
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
          stroke="#22d3ee" strokeWidth="1.1" opacity={a === 0 || b === 0 ? 0.3 : 0.16}
        />
      ))}

      {/* Travelling packets (front layer only) */}
      {animated &&
        PACKETS.map((p, i) => (
          <circle key={i} r="3.4" fill="#a5f3fc" filter="url(#net-glow)">
            <animateMotion dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" path={p.path} />
          </circle>
        ))}

      {/* Nodes */}
      {NODES.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r * 2.6} fill="url(#net-node)" opacity={animated ? 0.45 : 0.22}>
            {animated && (
              <animate attributeName="opacity" values="0.2;0.55;0.2" dur="3.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            )}
          </circle>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.hub ? '#67e8f9' : '#22d3ee'} />
          {n.hub && (
            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.55">
              {animated && <animate attributeName="r" values={`${n.r + 4};${n.r + 14};${n.r + 4}`} dur="4s" repeatCount="indefinite" />}
            </circle>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function NetworkScene() {
  const tiltRef = useRef(null)

  useEffect(() => {
    let raf = 0
    function onMove(e) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        if (tiltRef.current) {
          tiltRef.current.style.transform = `rotateY(${(x * 6).toFixed(2)}deg) rotateX(${(y * -6).toFixed(2)}deg)`
        }
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const layer = (z, scale, opacity, blur, animated) => (
    <div className="net-layer flex items-center justify-center" style={{ transform: `translateZ(${z}px) scale(${scale})`, opacity, filter: blur ? `blur(${blur}px)` : undefined }}>
      <div className="h-[108%] w-[108%]">
        <Net animated={animated} />
      </div>
    </div>
  )

  return (
    <div className="net-stage relative h-full w-full overflow-hidden">
      {/* Ambient depth blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-12 bottom-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl" />

      {/* 3D network */}
      <div ref={tiltRef} className="net-tilt absolute inset-0">
        <div className="net-float absolute inset-0">
          {layer(-70, 0.92, 0.18, 2, false)}
          {layer(-35, 0.97, 0.32, 1, false)}
          {layer(0, 1, 1, 0, true)}
        </div>
      </div>

      {/* Wordmark + symbol overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div aria-hidden className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950/55 blur-2xl" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-950/50">
          <Code2 size={28} className="text-white" />
        </span>
        <h1 className="relative font-display text-2xl font-extrabold tracking-[0.32em] text-white sm:text-3xl lg:text-4xl">
          GROUND&nbsp;ZER<span className="zero-neon">0</span>
        </h1>
        <p className="relative max-w-xs text-sm leading-relaxed text-zinc-400">
          Architect cloud systems, simulate the network flow, and learn how the internet really works.
        </p>
      </div>
    </div>
  )
}
