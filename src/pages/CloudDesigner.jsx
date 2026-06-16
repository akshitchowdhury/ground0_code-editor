import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Gauge, Cable, Trash2, Layers, X,
  Sparkles, ChevronDown, FolderOpen, Plus, Copy, Pencil, ShieldCheck, Zap, DollarSign, ArrowLeftRight,
  LayoutGrid, TriangleAlert,
} from 'lucide-react'
import ArchitectureCanvas from '../components/cloud/ArchitectureCanvas.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import {
  Palette, NodeInspector, EdgeInspector, ReviewPanel, CostPanel, LoadTestPanel, ProviderComparison,
} from '../components/cloud/StudioPanels.jsx'
import { getComponent, providerName, CLOUD_PROVIDERS } from '../data/cloud/components.js'
import { TEMPLATES, getTemplate } from '../data/cloud/templates.js'
import { analyzeArchitecture } from '../lib/cloud/analyze.js'
import { classifyEdge, PIPELINE_LANES } from '../lib/cloud/rules.js'
import { buildSimulation, simulationTargets } from '../lib/cloud/simulate.js'
import { runLoadTest, buildLoadFlow } from '../lib/cloud/loadtest.js'
import { estimateCost } from '../lib/cloud/cost.js'
import { load, save } from '../lib/storage.js'

const STEP_MS = 1500
const uid = () => 'n_' + Math.random().toString(36).slice(2, 9)
const clone = (v) => JSON.parse(JSON.stringify(v))

export default function CloudDesigner() {
  // Named designs: a map of saved designs + the active one's working copy.
  const [designs, setDesigns] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [designsOpen, setDesignsOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [provider, setProvider] = useState('aws') // aws | azure | gcp
  const [compareOpen, setCompareOpen] = useState(false)

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selected, setSelected] = useState(null) // { type, id }
  const [connectMode, setConnectMode] = useState(false)
  const [pendingSource, setPendingSource] = useState(null)
  const [connectError, setConnectError] = useState(null) // blocked illegal wiring
  const [showGuide, setShowGuide] = useState(false) // pipeline lane watermark
  const [highlightFinding, setHighlightFinding] = useState(null)
  const [rightTab, setRightTab] = useState('review') // review | load | cost

  // Packet-flow simulation (dt-based interval — mirrors FlowBoard, no rAF).
  const [simTarget, setSimTarget] = useState('')
  const [simSteps, setSimSteps] = useState([])
  const [simMeta, setSimMeta] = useState(null)
  const [simIndex, setSimIndex] = useState(0)
  const [simProgress, setSimProgress] = useState(0)
  const [simStatus, setSimStatus] = useState('idle')
  const [simKind, setSimKind] = useState('flow') // 'flow' | 'load'
  const [simNodeStatus, setSimNodeStatus] = useState(null) // load-test tier overlay
  const [speed, setSpeed] = useState(1)
  const progressRef = useRef(0)
  const addOffset = useRef(0)

  // Load test + cost.
  const [loadRps, setLoadRps] = useState(1000)
  const [loadResult, setLoadResult] = useState(null)
  const [loadRunning, setLoadRunning] = useState(false)
  const [costMode, setCostMode] = useState('provisioned')

  // ── load / migrate designs on mount ──
  useEffect(() => {
    const savedDesigns = load('cloudDesigns', null)
    let map, active
    if (savedDesigns && Object.keys(savedDesigns).length) {
      map = savedDesigns
      active = load('cloudActiveDesign', null)
      if (!active || !map[active]) active = Object.keys(map)[0]
    } else {
      const legacy = load('cloudDesign', null)
      const id = uid()
      if (legacy?.nodes?.length) {
        map = { [id]: { id, name: 'My design', nodes: legacy.nodes, edges: legacy.edges || [], updatedAt: Date.now() } }
      } else {
        const t = TEMPLATES[0].build()
        map = { [id]: { id, name: TEMPLATES[0].name, nodes: t.nodes, edges: t.edges, updatedAt: Date.now() } }
      }
      active = id
    }
    setDesigns(map)
    setActiveId(active)
    setNodes(map[active].nodes)
    setEdges(map[active].edges)
    setProvider(map[active].provider || 'aws')
  }, [])

  // ── autosave the active design ──
  useEffect(() => {
    if (!activeId) return
    setDesigns((prev) => {
      if (!prev[activeId]) return prev
      const next = { ...prev, [activeId]: { ...prev[activeId], nodes, edges, provider, updatedAt: Date.now() } }
      save('cloudDesigns', next)
      return next
    })
    save('cloudActiveDesign', activeId)
  }, [nodes, edges, activeId, provider])

  // Auto-dismiss the "blocked connection" toast after a few seconds.
  useEffect(() => {
    if (!connectError) return
    const t = setTimeout(() => setConnectError(null), 5000)
    return () => clearTimeout(t)
  }, [connectError])

  const analysis = useMemo(() => analyzeArchitecture({ nodes, edges }), [nodes, edges])
  const targets = useMemo(() => simulationTargets(nodes), [nodes])
  const costProvisioned = useMemo(() => estimateCost({ nodes }, { rps: 0 }), [nodes])
  const costAtLoad = useMemo(
    () => (loadResult?.ok ? estimateCost({ nodes }, { rps: loadResult.rps, instanceCounts: loadResult.instanceCounts }) : null),
    [nodes, loadResult],
  )

  const highlightIds = useMemo(() => {
    if (!highlightFinding) return new Set()
    const f = analysis.findings.find((x) => x.id === highlightFinding)
    return new Set(f?.nodeIds || [])
  }, [highlightFinding, analysis])

  function resetSim() {
    setSimStatus('idle'); setSimSteps([]); setSimIndex(0); setSimProgress(0); progressRef.current = 0; setSimMeta(null); setSimNodeStatus(null)
  }
  function resetLoad() {
    setLoadResult(null); setCostMode('provisioned')
  }

  // Re-label every node for a provider (keeps kind/config/ports/user labels).
  const reskin = (ns, p) => ns.map((n) => ({ ...n, provider: p, name: providerName(n.type, p) || n.name }))

  function switchProvider(p) {
    if (p === provider) return
    resetSim(); resetLoad(); setSelected(null)
    setProvider(p)
    setNodes((ns) => reskin(ns, p))
  }

  // ── topology mutations ──
  function addComponent(componentId, x, y) {
    const c = getComponent(componentId, provider)
    if (!c) return
    if (x === undefined) {
      const k = addOffset.current++ % 8
      x = 320 + k * 26; y = 200 + k * 26
    }
    const node = {
      id: uid(), type: c.id, kind: c.kind, name: c.name, icon: c.icon, x, y, provider,
      tier: c.defaultTier, ports: [...(c.defaultPorts || [])], openToInternet: !!c.defaultOpenToInternet,
      config: { ...(c.config || {}) },
    }
    resetSim(); resetLoad()
    setNodes((ns) => [...ns, node])
    setSelected({ type: 'node', id: node.id })
  }
  function moveNode(id, x, y) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, x, y } : n)))
  }
  function updateNode(id, patch) {
    resetSim(); resetLoad()
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }
  function deleteNode(id) {
    resetSim(); resetLoad()
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    setSelected(null)
  }
  function updateEdge(id, patch) {
    resetSim(); resetLoad()
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  function deleteEdge(id) {
    resetSim(); resetLoad()
    setEdges((es) => es.filter((e) => e.id !== id))
    setSelected(null)
  }

  // ── canvas interactions ──
  function onNodeClick(id) {
    if (connectMode) {
      if (!pendingSource) { setPendingSource(id); setConnectError(null) }
      else if (pendingSource === id) setPendingSource(null)
      else {
        const source = nodes.find((n) => n.id === pendingSource)
        const target = nodes.find((n) => n.id === id)
        // Refuse illogical wiring outright — same rule the review + flow use.
        const legal = classifyEdge(source, target)
        if (legal.level === 'illegal') {
          setConnectError(legal.reason); setPendingSource(null)
          return
        }
        const exists = edges.some((e) => e.from === pendingSource && e.to === id)
        if (!exists) {
          const port = target?.ports?.[0] ?? 443
          resetSim(); resetLoad()
          setEdges((es) => [...es, { id: uid(), from: pendingSource, to: id, port }])
        }
        setConnectError(null); setPendingSource(null)
      }
      return
    }
    setSelected({ type: 'node', id }); setHighlightFinding(null)
  }
  function onEdgeClick(id) { if (!connectMode) setSelected({ type: 'edge', id }) }
  function onBackgroundClick() { setSelected(null); setPendingSource(null); setHighlightFinding(null); setConnectError(null) }
  function toggleConnect() { setConnectMode((m) => !m); setPendingSource(null); setSelected(null); setConnectError(null) }
  function clearCanvas() { resetSim(); resetLoad(); setNodes([]); setEdges([]); setSelected(null) }
  function loadTemplate(id) {
    const t = getTemplate(id); if (!t) return
    const { nodes: n, edges: e } = t.build()
    resetSim(); resetLoad(); setNodes(reskin(n, provider)); setEdges(e); setSelected(null); setSimTarget(''); setTplOpen(false)
  }

  // ── named designs ──
  function switchDesign(id) {
    if (!designs[id] || id === activeId) { setDesignsOpen(false); return }
    resetSim(); resetLoad(); setSelected(null); setPendingSource(null); setConnectMode(false)
    setActiveId(id); setNodes(designs[id].nodes); setEdges(designs[id].edges); setProvider(designs[id].provider || 'aws'); setDesignsOpen(false)
  }
  function newDesign() {
    const id = uid()
    const name = `Untitled ${Object.keys(designs).length + 1}`
    resetSim(); resetLoad(); setSelected(null); setConnectMode(false); setPendingSource(null)
    setDesigns((prev) => { const next = { ...prev, [id]: { id, name, nodes: [], edges: [], updatedAt: Date.now() } }; save('cloudDesigns', next); return next })
    setActiveId(id); setNodes([]); setEdges([]); setDesignsOpen(false)
  }
  function duplicateDesign() {
    const cur = designs[activeId]; if (!cur) return
    const id = uid()
    const n = clone(nodes), e = clone(edges)
    resetSim(); resetLoad(); setSelected(null)
    setDesigns((prev) => { const next = { ...prev, [id]: { id, name: `${cur.name} copy`, nodes: n, edges: e, updatedAt: Date.now() } }; save('cloudDesigns', next); return next })
    setActiveId(id); setNodes(n); setEdges(e); setDesignsOpen(false)
  }
  function renameDesign() {
    const name = window.prompt('Design name', designs[activeId]?.name)
    if (!name) return
    setDesigns((prev) => { const next = { ...prev, [activeId]: { ...prev[activeId], name } }; save('cloudDesigns', next); return next })
  }
  function deleteDesign(id) {
    if (Object.keys(designs).length <= 1) return
    setDesigns((prev) => {
      const { [id]: _drop, ...rest } = prev
      save('cloudDesigns', rest)
      if (id === activeId) {
        const nextId = Object.keys(rest)[0]
        setActiveId(nextId); setNodes(rest[nextId].nodes); setEdges(rest[nextId].edges)
        resetSim(); resetLoad(); setSelected(null)
      }
      return rest
    })
  }

  // ── packet-flow simulation ──
  function play() {
    const result = buildSimulation({ nodes, edges }, { targetId: simTarget || undefined })
    if (!result.steps.length) { setSimSteps([]); setSimMeta({ ok: false, reason: result.reason }); setSimStatus('error'); setSimKind('flow'); setSimNodeStatus(null); return }
    setSimKind('flow'); setSimNodeStatus(null)
    setSimSteps(result.steps); setSimMeta({ ok: result.ok, targetName: result.targetName, reason: null })
    setSimIndex(0); progressRef.current = 0; setSimProgress(0); setSimStatus('running'); setSelected(null)
  }
  // Play the load test as animated traffic on the design board.
  function playLoadOnBoard() {
    const flow = buildLoadFlow({ nodes, edges }, { rps: loadRps })
    if (!flow.steps.length) { setSimSteps([]); setSimMeta({ ok: false, reason: flow.reason }); setSimStatus('error'); setSimKind('load'); setSimNodeStatus(null); return }
    setSimKind('load'); setSimNodeStatus(flow.nodeStatus)
    setSimSteps(flow.steps); setSimMeta({ ok: flow.ok, loadDone: flow.steps[flow.steps.length - 1]?.note, reason: null })
    setSimIndex(0); progressRef.current = 0; setSimProgress(0); setSimStatus('running'); setSelected(null)
  }
  function togglePlay() {
    if (simStatus === 'running') return setSimStatus('paused')
    if (simStatus === 'paused') return setSimStatus('running')
    play()
  }
  useEffect(() => {
    if (simStatus !== 'running') return
    let last = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const dt = Math.min(now - last, 500); last = now
      const next = progressRef.current + (dt * speed) / STEP_MS
      if (next >= 1) {
        const cur = simSteps[simIndex]
        if (cur?.verdict === 'blocked') { progressRef.current = 1; setSimProgress(1); setSimStatus('blocked'); return }
        if (simIndex < simSteps.length - 1) { progressRef.current = 0; setSimProgress(0); setSimIndex((i) => i + 1); return }
        progressRef.current = 1; setSimProgress(1); setSimStatus('done'); return
      }
      progressRef.current = next; setSimProgress(next)
    }, 16)
    return () => clearInterval(timer)
  }, [simStatus, speed, simIndex, simSteps])

  // ── load test ──
  function runLoad() {
    setLoadRunning(true)
    const result = runLoadTest({ nodes, edges }, { rps: loadRps })
    setTimeout(() => {
      setLoadResult(result); setLoadRunning(false)
      if (result.ok) setCostMode('load')
    }, 650)
  }
  function applyFix(rec) {
    if (!rec.patch || !rec.nodeId) return
    const newNodes = nodes.map((n) => (n.id === rec.nodeId ? { ...n, ...rec.patch } : n))
    resetSim()
    setNodes(newNodes)
    const result = runLoadTest({ nodes: newNodes, edges }, { rps: loadRps })
    setLoadResult(result)
    if (result.ok) setCostMode('load')
  }

  const simActive = simStatus !== 'idle' && simSteps.length > 0
  const selectedNode = selected?.type === 'node' ? nodes.find((n) => n.id === selected.id) : null
  const selectedEdge = selected?.type === 'edge' ? edges.find((e) => e.id === selected.id) : null

  let simLine = null
  if (simStatus === 'error') simLine = { tone: 'warn', text: simMeta?.reason }
  else if (simActive) {
    const cur = simSteps[simIndex]
    if (simStatus === 'done') simLine = simKind === 'load'
      ? { tone: 'good', text: simMeta?.loadDone || 'Load test complete — all tiers held up.' }
      : { tone: 'good', text: `Request reached ${simMeta?.targetName} — every hop was accepted.` }
    else if (simStatus === 'blocked') simLine = { tone: 'bad', text: cur?.note }
    else simLine = { tone: cur?.verdict === 'ok' ? 'info' : cur?.verdict === 'insecure' ? 'warn' : 'bad', text: cur?.note }
  }
  const toneClass = { good: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-rose-300', info: 'text-cyan-300' }
  const activeName = designs[activeId]?.name || 'Design'

  const TABS = [
    { id: 'review', label: 'Review', icon: ShieldCheck },
    { id: 'load', label: 'Load test', icon: Zap },
    { id: 'cost', label: 'Cost', icon: DollarSign },
  ]

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <Link to="/cloud" className="btn-ghost text-xs"><ArrowLeft size={14} /> Cloud</Link>
          <h1 className="flex items-center gap-2 text-sm font-bold text-white">
            <Layers size={15} className="text-cyan-400" /> Architecture Studio
          </h1>
          {/* Designs */}
          <div className="relative">
            <button onClick={() => { setDesignsOpen((o) => !o); setTplOpen(false) }} className="btn-outline text-xs">
              <FolderOpen size={13} /> <span className="max-w-32 truncate">{activeName}</span> <ChevronDown size={12} />
            </button>
            {designsOpen && (
              <div className="absolute left-0 z-40 mt-1 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl">
                <div className="max-h-56 overflow-y-auto">
                  {Object.values(designs).sort((a, b) => b.updatedAt - a.updatedAt).map((d) => (
                    <div key={d.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${d.id === activeId ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'}`}>
                      <button onClick={() => switchDesign(d.id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-medium text-zinc-100">{d.name}</p>
                        <p className="text-[10px] text-zinc-500">{(d.nodes || []).length} components</p>
                      </button>
                      {Object.keys(designs).length > 1 && (
                        <button onClick={() => deleteDesign(d.id)} title="Delete" className="shrink-0 text-zinc-600 opacity-0 hover:text-rose-400 group-hover:opacity-100"><Trash2 size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex gap-1 border-t border-zinc-800 pt-1.5">
                  <button onClick={newDesign} className="btn-ghost flex-1 justify-center text-[11px]"><Plus size={12} /> New</button>
                  <button onClick={duplicateDesign} className="btn-ghost flex-1 justify-center text-[11px]"><Copy size={12} /> Duplicate</button>
                  <button onClick={renameDesign} className="btn-ghost flex-1 justify-center text-[11px]"><Pencil size={12} /> Rename</button>
                </div>
              </div>
            )}
          </div>
          {/* Cloud provider tabs */}
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {CLOUD_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => switchProvider(p.id)}
                title={`Switch the whole design to ${p.tag}`}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${provider === p.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <span className={`h-2 w-2 rounded-full ${p.dot}`} /> {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCompareOpen(true)} className="btn-outline text-xs" title="Compare AWS, Azure & GCP services"><ArrowLeftRight size={13} /> Compare</button>
          <button
            onClick={() => setShowGuide((g) => !g)}
            className={`btn text-xs ${showGuide ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40' : 'btn-outline'}`}
            title="Show the recommended pipeline order: Web → Security → Load Balancer → Compute → Data"
          >
            <LayoutGrid size={13} /> Guide
          </button>
          <button onClick={toggleConnect} className={`btn text-xs ${connectMode ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40' : 'btn-outline'}`} title="Connect two components">
            <Cable size={14} /> {connectMode ? (pendingSource ? 'Pick target…' : 'Pick source…') : 'Connect'}
          </button>
          <div className="relative">
            <button onClick={() => { setTplOpen((o) => !o); setDesignsOpen(false) }} className="btn-outline text-xs"><Sparkles size={13} /> Templates</button>
            {tplOpen && (
              <div className="absolute right-0 z-40 mt-1 w-72 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl">
                {TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => loadTemplate(t.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-800">
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{t.desc}</p>
                  </button>
                ))}
                <p className="px-3 py-1.5 text-[10px] text-zinc-600">Loads into the current design (replaces the canvas).</p>
              </div>
            )}
          </div>
          <button onClick={clearCanvas} className="btn-ghost text-xs text-zinc-400"><Trash2 size={13} /> Clear</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        {/* Palette */}
        <aside className="panel flex w-52 shrink-0 flex-col">
          <div className="panel-header">Components</div>
          <Palette onAdd={(id) => addComponent(id)} provider={provider} />
          <p className="border-t border-zinc-800 px-3 py-2 text-[10px] leading-relaxed text-zinc-600">
            Drag onto the canvas, or click to drop. Use <span className="text-zinc-400">Connect</span> to wire components, then <span className="text-zinc-400">Play</span> or run a <span className="text-zinc-400">Load test</span>.
          </p>
        </aside>

        {/* Canvas + floating inspector */}
        <div className="panel relative min-w-0 flex-1 overflow-hidden">
          <div className="h-full w-full overflow-auto">
            <ErrorBoundary label="ArchitectureCanvas">
              <ArchitectureCanvas
                nodes={nodes} edges={edges} selected={selected} highlightIds={highlightIds}
                connectMode={connectMode} pendingSourceId={pendingSource}
                guideLanes={showGuide ? PIPELINE_LANES : null}
                sim={simActive ? { steps: simSteps, index: simIndex, progress: simProgress, status: simStatus, nodeStatus: simNodeStatus } : null}
                onAddComponent={addComponent} onMoveNode={moveNode}
                onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onBackgroundClick={onBackgroundClick}
              />
            </ErrorBoundary>
          </div>
          {connectError ? (
            <div className="absolute left-1/2 top-2 z-30 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-950/90 px-3 py-2 text-[11px] leading-snug text-rose-200 shadow-lg backdrop-blur">
              <TriangleAlert size={14} className="shrink-0" />
              <span><span className="font-semibold">Connection blocked.</span> {connectError}</span>
            </div>
          ) : connectMode && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-cyan-500/40 bg-zinc-950/90 px-3 py-1 text-[11px] text-cyan-300 backdrop-blur">
              {pendingSource ? 'Click the destination component' : 'Click the source component'}
            </div>
          )}
          {(selectedNode || selectedEdge) && (
            <div className="absolute right-2 top-2 z-20 flex max-h-[calc(100%-1rem)] w-[300px] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/95 shadow-2xl backdrop-blur">
              <div className="panel-header justify-between">
                <span>{selectedNode ? 'Component' : 'Connection'}</span>
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-300"><X size={13} /></button>
              </div>
              <div className="min-h-0 overflow-y-auto">
                {selectedNode
                  ? <NodeInspector node={selectedNode} onUpdate={(p) => updateNode(selectedNode.id, p)} onDelete={() => deleteNode(selectedNode.id)} />
                  : <EdgeInspector edge={selectedEdge} nodes={nodes} onUpdate={(p) => updateEdge(selectedEdge.id, p)} onDelete={() => deleteEdge(selectedEdge.id)} />}
              </div>
            </div>
          )}
        </div>

        {/* Right column: flow play bar + tabs */}
        <aside className="flex w-[340px] shrink-0 flex-col gap-2">
          {/* Packet-flow player */}
          <div className="panel shrink-0">
            <div className="panel-header justify-between">
              <span>Network flow</span>
              {simActive && <span className="normal-case tracking-normal text-zinc-500">Hop {Math.min(simIndex + 1, simSteps.length)} / {simSteps.length}</span>}
            </div>
            <div className="space-y-2 p-3">
              <select value={simTarget} onChange={(e) => { setSimTarget(e.target.value); resetSim() }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500">
                <option value="">Auto — request endpoint (data tier)</option>
                {targets.map((n) => <option key={n.id} value={n.id}>Target: {n.label || n.name}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <button onClick={togglePlay} className="btn-primary flex-1 justify-center">
                  {simStatus === 'running' ? <Pause size={15} /> : <Play size={15} />}
                  <span className="text-xs">{simStatus === 'running' ? 'Pause' : simActive && simStatus !== 'paused' ? 'Replay' : 'Play flow'}</span>
                </button>
                <button onClick={resetSim} disabled={!simActive} className="btn-ghost px-2 text-xs" title="Reset"><RotateCcw size={14} /></button>
                <button onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))} className="btn-ghost px-2 text-xs" title="Speed"><Gauge size={13} /> {speed}x</button>
              </div>
              {simLine && (
                <p className={`rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-2 text-[11px] leading-relaxed ${toneClass[simLine.tone]}`}>{simLine.text}</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="panel flex min-h-0 flex-1 flex-col">
            <div className="flex gap-1 border-b border-zinc-800 p-1.5">
              {TABS.map((t) => {
                const on = rightTab === t.id
                const badge = t.id === 'review' && analysis.findings.length ? analysis.findings.length : null
                return (
                  <button key={t.id} onClick={() => setRightTab(t.id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${on ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                    <t.icon size={13} /> {t.label}
                    {badge != null && <span className="rounded-full bg-zinc-700 px-1.5 text-[9px] text-zinc-200">{badge}</span>}
                  </button>
                )
              })}
            </div>

            {rightTab === 'review' && (
              <>
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Well-architected review</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${analysis.verdict.tone === 'good' ? 'bg-emerald-500/15 text-emerald-300' : analysis.verdict.tone === 'bad' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{analysis.verdict.label}</span>
                </div>
                <ReviewPanel analysis={analysis} highlightFinding={highlightFinding} onHighlight={setHighlightFinding} />
              </>
            )}
            {rightTab === 'load' && (
              <LoadTestPanel rps={loadRps} onRps={setLoadRps} onRun={runLoad} running={loadRunning} result={loadResult} onApplyFix={applyFix} costAtLoad={costAtLoad?.total} onPlayOnBoard={playLoadOnBoard} />
            )}
            {rightTab === 'cost' && (
              <CostPanel provisioned={costProvisioned} atLoad={costAtLoad} mode={costMode} onMode={setCostMode} loadRps={loadResult?.rps || loadRps} />
            )}
          </div>
        </aside>
      </div>

      {compareOpen && <ProviderComparison onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
