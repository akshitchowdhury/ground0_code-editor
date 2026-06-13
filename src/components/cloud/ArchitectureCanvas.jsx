// Drag-and-drop architecture canvas for Ground0: Cloud — Architecture Studio.
// HTML nodes (easy to style + drag) over an SVG layer that draws the
// connections and animates the simulated packet. Controlled by CloudDesigner.
import { useRef } from 'react'
import { Globe } from 'lucide-react'

export const BOARD_W = 1600
export const BOARD_H = 900
const NODE_W = 150
const NODE_H = 76

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
const center = (n) => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 })

// Where the center→target line crosses a node's border (so lines/packets
// touch the box edge, not its center). Mirrors FlowBoard's borderPoint.
function borderPoint(n, target) {
  const c = center(n)
  const dx = target.x - c.x
  const dy = target.y - c.y
  if (dx === 0 && dy === 0) return c
  const scale = 1 / Math.max(Math.abs(dx) / (NODE_W / 2), Math.abs(dy) / (NODE_H / 2))
  return { x: c.x + dx * scale, y: c.y + dy * scale }
}

const VERDICT_COLOR = {
  ok: 'rgb(34 211 238)', // cyan
  insecure: 'rgb(245 158 11)', // amber
  blocked: 'rgb(244 63 94)', // rose
}

export default function ArchitectureCanvas({
  nodes,
  edges,
  selected, // { type: 'node'|'edge', id } | null
  highlightIds, // Set<nodeId> from a focused finding
  connectMode,
  pendingSourceId,
  sim, // { steps, index, progress, status } | null
  onAddComponent, // (componentId, x, y)
  onMoveNode, // (id, x, y)
  onNodeClick, // (id)
  onEdgeClick, // (edgeId)
  onBackgroundClick,
  renderNodeMeta, // optional (node) => JSX for the node's second line
  emptyHint = 'Drag components from the palette to start designing →',
}) {
  const boardRef = useRef(null)
  const pressRef = useRef(null)

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))

  function boardPoint(clientX, clientY) {
    const rect = boardRef.current.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  // ── Drag / click on a node ──────────────────────────────────────
  function onNodePointerDown(e, node) {
    e.stopPropagation()
    pressRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      moved: false,
    }
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
  }

  function onWindowPointerMove(e) {
    const press = pressRef.current
    if (!press) return
    const dx = e.clientX - press.startX
    const dy = e.clientY - press.startY
    if (!press.moved && Math.hypot(dx, dy) < 4) return
    if (connectMode) return // in connect mode a press is a click, never a drag
    press.moved = true
    onMoveNode(press.id, clamp(press.origX + dx, 0, BOARD_W - NODE_W), clamp(press.origY + dy, 0, BOARD_H - NODE_H))
  }

  function onWindowPointerUp() {
    const press = pressRef.current
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    if (press && !press.moved) onNodeClick(press.id)
    pressRef.current = null
  }

  function onDrop(e) {
    e.preventDefault()
    const componentId = e.dataTransfer.getData('application/x-ground0-component')
    if (!componentId) return
    const p = boardPoint(e.clientX, e.clientY)
    onAddComponent(componentId, clamp(p.x - NODE_W / 2, 0, BOARD_W - NODE_W), clamp(p.y - NODE_H / 2, 0, BOARD_H - NODE_H))
  }

  // Verdict + stage colour reached on each edge so far in the running simulation.
  const edgeVerdict = {}
  const edgeColor = {}
  if (sim?.steps) {
    sim.steps.slice(0, sim.index + 1).forEach((s) => {
      edgeVerdict[s.edge.id] = s.verdict
      if (s.color) edgeColor[s.edge.id] = s.color
    })
  }

  // Live packet position for the current step.
  let packet = null
  const curStep = sim?.steps?.[sim.index]
  if (curStep) {
    const from = byId[curStep.from]
    const to = byId[curStep.to]
    if (from && to) {
      const a = borderPoint(from, center(to))
      const b = borderPoint(to, center(from))
      const t = curStep.verdict === 'blocked' ? Math.min(sim.progress, 0.82) : sim.progress
      packet = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, verdict: curStep.verdict, label: curStep.packet, color: curStep.color }
    }
  }
  // Stage colour wins for normal flow; amber/red verdicts override it.
  // (Fallback to cyan so an unexpected verdict can never yield undefined.)
  const packetColor = !packet
    ? null
    : packet.verdict === 'ok'
      ? packet.color || VERDICT_COLOR.ok
      : VERDICT_COLOR[packet.verdict] || VERDICT_COLOR.ok
  const activeNodeIds = curStep ? new Set([curStep.from, curStep.to]) : new Set()
  const blockedHere =
    curStep && curStep.verdict === 'blocked' && sim.progress >= 0.8 ? byId[curStep.to] : null

  return (
    <div
      ref={boardRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseDown={(e) => {
        if (e.target === boardRef.current || e.target.tagName === 'svg') onBackgroundClick()
      }}
      className="relative"
      style={{
        width: BOARD_W,
        height: BOARD_H,
        backgroundImage:
          'radial-gradient(rgb(63 63 70 / 0.45) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }}
    >
      {/* Connection + packet layer */}
      <svg width={BOARD_W} height={BOARD_H} className="absolute inset-0">
        <defs>
          <marker id="ac-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L8,4.5 L0,9 Z" fill="rgb(82 82 91)" />
          </marker>
          <marker id="ac-arrow-cyan" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L8,4.5 L0,9 Z" fill="rgb(34 211 238)" />
          </marker>
          {/* arrowhead inherits the line's stroke colour (stage colour) */}
          <marker id="ac-arrow-stage" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M0,0 L8,4.5 L0,9 Z" fill="context-stroke" />
          </marker>
        </defs>

        {edges.map((e) => {
          const a = byId[e.from]
          const b = byId[e.to]
          if (!a || !b) return null
          const p1 = borderPoint(a, center(b))
          const p2 = borderPoint(b, center(a))
          const mx = (p1.x + p2.x) / 2
          const my = (p1.y + p2.y) / 2
          const verdict = edgeVerdict[e.id]
          const isSel = selected?.type === 'edge' && selected.id === e.id
          const color =
            verdict === 'blocked'
              ? VERDICT_COLOR.blocked
              : verdict === 'insecure'
                ? VERDICT_COLOR.insecure
                : verdict === 'ok'
                  ? edgeColor[e.id] || VERDICT_COLOR.ok
                  : isSel
                    ? 'rgb(34 211 238)'
                    : 'rgb(82 82 91)'
          return (
            <g key={e.id}>
              {/* fat invisible hit area for easy selecting */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth="16"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={(ev) => {
                  ev.stopPropagation()
                  onEdgeClick(e.id)
                }}
              />
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={verdict || isSel ? 2.4 : 1.6}
                strokeDasharray={verdict === 'blocked' ? '7 5' : undefined}
                markerEnd={`url(#${verdict === 'ok' ? 'ac-arrow-stage' : 'ac-arrow'})`}
                style={{ pointerEvents: 'none' }}
              />
              {(() => {
                const badge = e.port != null ? `:${e.port}` : e.label
                if (!badge) return null
                const bw = badge.length * 6.1 + 12
                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect x={mx - bw / 2} y={my - 9} width={bw} height="17" rx="5" fill="rgb(9 9 11 / 0.9)" stroke={color} strokeOpacity="0.5" />
                    <text x={mx} y={my + 3} textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill={color}>
                      {badge}
                    </text>
                  </g>
                )
              })()}
            </g>
          )
        })}

        {/* Packet */}
        {packet && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={packet.x} cy={packet.y} r="13" fill={packetColor} opacity="0.18">
              <animate attributeName="r" values="11;16;11" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={packet.x} cy={packet.y} r="6.5" fill={packetColor} />
            <rect x={packet.x - 22} y={packet.y - 32} width="44" height="18" rx="6" fill="rgb(9 9 11 / 0.92)" stroke={packetColor} strokeOpacity="0.6" />
            <text x={packet.x} y={packet.y - 19} textAnchor="middle" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fill={packetColor}>
              {packet.label}
            </text>
          </g>
        )}

        {/* Blocked X at the rejecting node */}
        {blockedHere && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={blockedHere.x + NODE_W / 2} cy={blockedHere.y + NODE_H / 2} r="22" fill="rgb(244 63 94 / 0.16)" stroke="rgb(244 63 94)" strokeWidth="2" />
            <path
              d={`M${blockedHere.x + NODE_W / 2 - 9},${blockedHere.y + NODE_H / 2 - 9} l18,18 M${blockedHere.x + NODE_W / 2 + 9},${blockedHere.y + NODE_H / 2 - 9} l-18,18`}
              stroke="rgb(244 63 94)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/* Nodes */}
      {nodes.map((n) => {
        const isSel = selected?.type === 'node' && selected.id === n.id
        const isPending = pendingSourceId === n.id
        const isActive = activeNodeIds.has(n.id)
        const isHi = highlightIds?.has(n.id)
        // Load-test overlay: colour the tier by how loaded it is.
        const load = sim?.nodeStatus?.[n.id]
        let ring = 'border-zinc-700'
        if (isActive) ring = 'border-cyan-400 shadow-lg shadow-cyan-500/20'
        else if (load) ring =
          load.level === 'over' ? 'border-rose-500 shadow-lg shadow-rose-500/30'
            : load.level === 'warn' ? 'border-amber-400 shadow-md shadow-amber-500/20'
              : 'border-emerald-500/70'
        else if (isPending) ring = 'border-cyan-400 border-dashed'
        else if (isSel) ring = 'border-indigo-400'
        else if (isHi) ring = 'border-rose-400 shadow-lg shadow-rose-500/20'
        return (
          <div
            key={n.id}
            onPointerDown={(e) => onNodePointerDown(e, n)}
            className={`absolute flex select-none flex-col justify-center rounded-xl border-2 bg-zinc-900/95 px-2.5 py-1.5 backdrop-blur transition-shadow ${ring} ${
              connectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
            }`}
            style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
          >
            {load && n.kind !== 'internet' && (
              <span
                className={`absolute -right-1.5 -top-1.5 rounded-full px-1 text-[8px] font-bold ${
                  load.level === 'over' ? 'bg-rose-500 text-white' : load.level === 'warn' ? 'bg-amber-400 text-zinc-900' : 'bg-emerald-500 text-zinc-900'
                }`}
              >
                {load.scalable ? '∞' : `${load.util}%`}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{n.icon}</span>
              <span className="truncate text-[12px] font-semibold text-white">{n.label || n.name}</span>
              {n.openToInternet && n.kind !== 'internet' && (
                <Globe size={11} className="ml-auto shrink-0 text-rose-400" title="Open to 0.0.0.0/0" />
              )}
            </div>
            {renderNodeMeta ? (
              renderNodeMeta(n)
            ) : (
              <div className="mt-1 flex items-center gap-1 text-[9.5px] text-zinc-500">
                <span className="uppercase tracking-wide">{n.tier}</span>
                {n.ports?.length > 0 && (
                  <span className="ml-auto truncate font-mono text-zinc-400">:{n.ports.join(' :')}</span>
                )}
              </div>
            )}
          </div>
        )
      })}

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-zinc-600">{emptyHint}</p>
        </div>
      )}
    </div>
  )
}
