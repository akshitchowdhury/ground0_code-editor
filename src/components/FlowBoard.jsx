// Interactive flow-diagram player for Ground0: Cloud lessons.
// Takes a declarative spec ({ nodes, edges, steps }) and animates a packet
// travelling between nodes with play / pause / step / speed controls.
import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge } from 'lucide-react'

const NODE_W = 128
const NODE_H = 58
const STEP_MS = 2600

function center(node) {
  return { x: node.x + (node.w ?? NODE_W) / 2, y: node.y + (node.h ?? NODE_H) / 2 }
}

// Point where the line from a node's center toward `target` crosses the
// node's border — so packets visibly leave/enter the box instead of its center.
function borderPoint(node, target) {
  const c = center(node)
  const hw = (node.w ?? NODE_W) / 2
  const hh = (node.h ?? NODE_H) / 2
  const dx = target.x - c.x
  const dy = target.y - c.y
  if (dx === 0 && dy === 0) return c
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh)
  return { x: c.x + dx * scale, y: c.y + dy * scale }
}

export default function FlowBoard({ flow, accent }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  // Progress also lives in a ref so the animation effect can resume mid-step
  // (e.g. after a speed change) without impure state updaters.
  const progressRef = useRef(0)

  const { nodes, edges, steps } = flow
  const w = flow.w ?? 760
  const h = flow.h ?? 400
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const step = steps[stepIndex]

  function setP(value) {
    progressRef.current = value
    setProgress(value)
  }

  // Reset when the lesson (flow spec) changes.
  useEffect(() => {
    setStepIndex(0)
    progressRef.current = 0
    setProgress(0)
    setPlaying(false)
  }, [flow])

  // setInterval (not requestAnimationFrame) so playback continues when the
  // tab/preview is hidden — dt-based math keeps speed correct under throttling.
  useEffect(() => {
    if (!playing) return
    let lastTime = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const dt = Math.min(now - lastTime, 500)
      lastTime = now
      const next = progressRef.current + (dt * speed) / STEP_MS
      if (next >= 1) {
        if (stepIndex < steps.length - 1) {
          progressRef.current = 0
          setProgress(0)
          setStepIndex(stepIndex + 1) // effect restarts for the next step
          return
        }
        progressRef.current = 1
        setProgress(1)
        setPlaying(false)
        return
      }
      progressRef.current = next
      setProgress(next)
    }, 16)
    return () => clearInterval(timer)
  }, [playing, speed, stepIndex, steps])

  function goTo(i) {
    setStepIndex(Math.max(0, Math.min(i, steps.length - 1)))
    setP(0)
    setPlaying(false)
  }

  function reset() {
    setStepIndex(0)
    setP(0)
    setPlaying(false)
  }

  function togglePlay() {
    if (!playing && stepIndex === steps.length - 1 && progress >= 1) {
      reset()
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }

  // Packet position for the current step.
  const fromNode = nodeById[step.from]
  const toNode = nodeById[step.to]
  let packet = null
  if (fromNode && toNode && step.from !== step.to) {
    const a = borderPoint(fromNode, center(toNode))
    const b = borderPoint(toNode, center(fromNode))
    const t = step.reverse ? 1 - progress : progress
    packet = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  } else if (fromNode) {
    packet = center(fromNode)
  }

  const activeIds = new Set([step.from, step.to])
  const isActiveEdge = (e) =>
    (e.from === step.from && e.to === step.to) || (e.from === step.to && e.to === step.from)

  return (
    <div className="panel flex h-full flex-col">
      <div className="panel-header justify-between">
        <span>{flow.title || 'Flow board'}</span>
        <span className="normal-case tracking-normal text-zinc-500">
          Step {stepIndex + 1} / {steps.length}
        </span>
      </div>

      {/* Diagram */}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="fb-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L8,4.5 L0,9 Z" fill="rgb(82 82 91)" />
            </marker>
            <marker id="fb-arrow-hot" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L8,4.5 L0,9 Z" fill="rgb(34 211 238)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodeById[e.from]
            const b = nodeById[e.to]
            if (!a || !b) return null
            const p1 = borderPoint(a, center(b))
            const p2 = borderPoint(b, center(a))
            const hot = isActiveEdge(e)
            const mx = (p1.x + p2.x) / 2
            const my = (p1.y + p2.y) / 2
            return (
              <g key={i}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={hot ? 'rgb(34 211 238)' : 'rgb(63 63 70)'}
                  strokeWidth={hot ? 2 : 1.4}
                  strokeDasharray={e.dashed ? '5 4' : undefined}
                  markerEnd={`url(#${hot ? 'fb-arrow-hot' : 'fb-arrow'})`}
                  opacity={hot ? 1 : 0.8}
                />
                {e.label && (
                  <text
                    x={mx}
                    y={my - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill={hot ? 'rgb(103 232 249)' : 'rgb(113 113 122)'}
                  >
                    {e.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const nw = n.w ?? NODE_W
            const nh = n.h ?? NODE_H
            const active = activeIds.has(n.id)
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={nw}
                  height={nh}
                  rx="10"
                  fill={active ? 'rgb(8 51 68 / 0.85)' : 'rgb(24 24 27 / 0.9)'}
                  stroke={active ? 'rgb(34 211 238)' : n.danger ? 'rgb(244 63 94 / 0.5)' : 'rgb(63 63 70)'}
                  strokeWidth={active ? 1.8 : 1}
                />
                <text x={n.x + nw / 2} y={n.y + 23} textAnchor="middle" fontSize="14">
                  {n.icon}
                </text>
                <text
                  x={n.x + nw / 2}
                  y={n.y + (n.sub ? 38 : 41)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={active ? 'white' : 'rgb(212 212 216)'}
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text x={n.x + nw / 2} y={n.y + 50} textAnchor="middle" fontSize="9" fill="rgb(113 113 122)">
                    {n.sub}
                  </text>
                )}
              </g>
            )
          })}

          {/* Packet */}
          {packet && (
            <g>
              <circle cx={packet.x} cy={packet.y} r="13" fill="rgb(34 211 238 / 0.18)">
                <animate attributeName="r" values="11;15;11" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx={packet.x} cy={packet.y} r="6.5" fill={step.danger ? 'rgb(244 63 94)' : 'rgb(34 211 238)'} />
              {step.packet && (
                <g>
                  <rect
                    x={packet.x - step.packet.length * 3.1 - 8}
                    y={packet.y - 36}
                    width={step.packet.length * 6.2 + 16}
                    height="19"
                    rx="6"
                    fill="rgb(9 9 11 / 0.92)"
                    stroke={step.danger ? 'rgb(244 63 94 / 0.6)' : 'rgb(34 211 238 / 0.5)'}
                  />
                  <text
                    x={packet.x}
                    y={packet.y - 23}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontFamily="JetBrains Mono, monospace"
                    fill={step.danger ? 'rgb(253 164 175)' : 'rgb(165 243 252)'}
                  >
                    {step.packet}
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Step description */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <p className="text-sm leading-relaxed text-zinc-300">
          <span className={`mr-2 font-mono text-xs font-bold ${accent?.text || 'text-cyan-400'}`}>
            {stepIndex + 1}.
          </span>
          {step.text}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0} className="btn-ghost px-2 text-xs">
            <SkipBack size={14} />
          </button>
          <button onClick={togglePlay} className="btn-primary px-4" title={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <span className="text-xs">{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => goTo(stepIndex + 1)}
            disabled={stepIndex === steps.length - 1}
            className="btn-ghost px-2 text-xs"
          >
            <SkipForward size={14} />
          </button>
          <button onClick={reset} className="btn-ghost px-2 text-xs" title="Restart">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="hidden items-center gap-1 sm:flex">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-5 bg-cyan-400' : i < stepIndex ? 'w-1.5 bg-cyan-700' : 'w-1.5 bg-zinc-700'
              }`}
              title={`Step ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
          className="btn-ghost px-2 text-xs"
          title="Playback speed"
        >
          <Gauge size={13} /> {speed}x
        </button>
      </div>
    </div>
  )
}
