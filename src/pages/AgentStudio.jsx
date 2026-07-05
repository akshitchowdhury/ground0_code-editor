import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Gauge, Cable, Trash2, X, Bot, Sparkles, ShieldCheck, Wand2, TriangleAlert,
} from 'lucide-react'
import ArchitectureCanvas from '../components/cloud/ArchitectureCanvas.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import {
  Palette, NodeInspector, EdgeInspector, ReviewPanel, ProfilePanel, BlueprintPicker, agentNodeMeta,
} from '../components/cloud/AgentPanels.jsx'
import { getAgentComponent, getBlueprint } from '../data/cloud/agentComponents.js'
import { AGENT_TEMPLATES } from '../data/cloud/agentTemplates.js'
import { classifyAgentEdge } from '../lib/agent/rules.js'
import { FLOW_MODES, STAGE_LEGEND } from '../lib/agent/simulate.js'
import { analyzeAgent, simulateAgent, profileAgent } from '../lib/studioApi.js'
import { load, save } from '../lib/storage.js'

const STORAGE_KEY = 'agentDesign'
const STEP_MS = 1500
const uid = () => 'a_' + Math.random().toString(36).slice(2, 9)

// Analysis/simulate/profile now run server-side (Go backend) — this is the
// shape while a request is in flight or before the first one resolves.
const EMPTY_ANALYSIS = {
  findings: [], correctnessScore: 0, safetyScore: 0, designScore: 0, overall: 0,
  verdict: { label: 'Analyzing…', tone: 'warn' }, empty: true,
}
const EMPTY_PROFILE = { empty: true, archetype: '', summary: '' }

export default function AgentStudio() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [blueprintId, setBlueprintId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [connectMode, setConnectMode] = useState(false)
  const [pendingSource, setPendingSource] = useState(null)
  const [connectError, setConnectError] = useState(null) // blocked illegal wiring
  const [highlightFinding, setHighlightFinding] = useState(null)
  const [rightTab, setRightTab] = useState('review')
  const [showPicker, setShowPicker] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // simulation
  const [simSteps, setSimSteps] = useState([])
  const [simMeta, setSimMeta] = useState(null)
  const [simIndex, setSimIndex] = useState(0)
  const [simProgress, setSimProgress] = useState(0)
  const [simStatus, setSimStatus] = useState('idle')
  const [simMode, setSimMode] = useState('lifecycle')
  const [speed, setSpeed] = useState(1)
  const progressRef = useRef(0)
  const addOffset = useRef(0)

  useEffect(() => {
    const saved = load(STORAGE_KEY, null)
    if (saved?.nodes?.length) {
      setNodes(saved.nodes)
      setEdges(saved.edges || [])
      setBlueprintId(saved.blueprintId || null)
    } else {
      setShowPicker(true)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) save(STORAGE_KEY, { nodes, edges, blueprintId })
  }, [nodes, edges, blueprintId, loaded])

  // Auto-dismiss the "blocked connection" toast after a few seconds.
  useEffect(() => {
    if (!connectError) return
    const t = setTimeout(() => setConnectError(null), 5000)
    return () => clearTimeout(t)
  }, [connectError])

  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS)
  const [analysisError, setAnalysisError] = useState(null)
  const [profile, setProfile] = useState(EMPTY_PROFILE)

  // Debounced server-side review — recomputed on every graph edit.
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      analyzeAgent(nodes, edges, blueprintId)
        .then((result) => { if (!cancelled) { setAnalysis(result); setAnalysisError(null) } })
        .catch((err) => { if (!cancelled) setAnalysisError(err.message) })
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [nodes, edges, blueprintId])

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      profileAgent(nodes)
        .then((result) => { if (!cancelled) setProfile(result) })
        .catch(() => {})
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [nodes])

  const highlightIds = useMemo(() => {
    if (!highlightFinding) return new Set()
    const f = analysis.findings.find((x) => x.id === highlightFinding)
    return new Set(f?.nodeIds || [])
  }, [highlightFinding, analysis])

  function resetSim() {
    setSimStatus('idle'); setSimSteps([]); setSimIndex(0); setSimProgress(0); progressRef.current = 0; setSimMeta(null)
  }

  // topology
  function addComponent(componentId, x, y) {
    const c = getAgentComponent(componentId)
    if (!c) return
    if (x === undefined) {
      const k = addOffset.current++ % 8
      x = 300 + k * 26; y = 190 + k * 26
    }
    const node = { id: uid(), type: c.id, kind: c.kind, name: c.name, icon: c.icon, x, y, config: JSON.parse(JSON.stringify(c.config || {})) }
    resetSim()
    setNodes((ns) => [...ns, node])
    setSelected({ type: 'node', id: node.id })
  }
  const moveNode = (id, x, y) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, x, y } : n)))
  function updateNode(id, patch) { resetSim(); setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n))) }
  function deleteNode(id) {
    resetSim()
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    setSelected(null)
  }
  function updateEdge(id, patch) { resetSim(); setEdges((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e))) }
  function deleteEdge(id) { resetSim(); setEdges((es) => es.filter((e) => e.id !== id)); setSelected(null) }

  function onNodeClick(id) {
    if (connectMode) {
      if (!pendingSource) { setPendingSource(id); setConnectError(null) }
      else if (pendingSource === id) setPendingSource(null)
      else {
        const source = nodes.find((n) => n.id === pendingSource)
        const target = nodes.find((n) => n.id === id)
        // Refuse illogical wiring — same rule the review + flow use.
        const legal = classifyAgentEdge(source, target)
        if (legal.level === 'illegal') {
          setConnectError(legal.reason); setPendingSource(null)
          return
        }
        const exists = edges.some((e) => e.from === pendingSource && e.to === id)
        if (!exists) { resetSim(); setEdges((es) => [...es, { id: uid(), from: pendingSource, to: id }]) }
        setConnectError(null); setPendingSource(null)
      }
      return
    }
    setSelected({ type: 'node', id }); setHighlightFinding(null)
  }
  const onEdgeClick = (id) => { if (!connectMode) setSelected({ type: 'edge', id }) }
  const onBackgroundClick = () => { setSelected(null); setPendingSource(null); setHighlightFinding(null); setConnectError(null) }
  const toggleConnect = () => { setConnectMode((m) => !m); setPendingSource(null); setSelected(null); setConnectError(null) }
  function clearCanvas() { resetSim(); setNodes([]); setEdges([]); setBlueprintId(null); setSelected(null) }

  function loadTemplate(templateId) {
    const t = AGENT_TEMPLATES[templateId]
    if (!t) return
    const { nodes: n, edges: e } = t.build()
    resetSim(); setNodes(n); setEdges(e); setBlueprintId(t.blueprint); setSelected(null); setShowPicker(false)
  }
  const pickBlueprint = (bpId) => loadTemplate(getBlueprint(bpId)?.template)

  // simulation control
  async function play() {
    let result
    try {
      result = await simulateAgent(nodes, edges, simMode)
    } catch (err) {
      setSimSteps([]); setSimMeta({ reason: err.message }); setSimStatus('error')
      return
    }
    if (!result.steps.length) { setSimSteps([]); setSimMeta({ reason: result.reason }); setSimStatus('error'); return }
    setSimSteps(result.steps); setSimMeta({ ok: result.ok, reason: null })
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

  const simActive = simStatus !== 'idle' && simSteps.length > 0
  const selectedNode = selected?.type === 'node' ? nodes.find((n) => n.id === selected.id) : null
  const selectedEdge = selected?.type === 'edge' ? edges.find((e) => e.id === selected.id) : null

  let simLine = null
  if (simStatus === 'error') simLine = { tone: 'warn', text: simMeta?.reason }
  else if (simActive) {
    const cur = simSteps[simIndex]
    if (simStatus === 'done') simLine = { tone: 'good', text: simMeta?.ok ? 'Request flowed through the whole pipeline successfully.' : cur?.note }
    else if (simStatus === 'blocked') simLine = { tone: 'bad', text: cur?.note }
    else simLine = { tone: cur?.verdict === 'ok' ? 'info' : cur?.verdict === 'insecure' ? 'warn' : 'bad', text: cur?.note }
  }
  const toneClass = { good: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-rose-300', info: 'text-cyan-300' }
  const bpName = getBlueprint(blueprintId)?.name

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <Link to="/cloud" className="btn-ghost text-xs"><ArrowLeft size={14} /> Cloud</Link>
          <h1 className="flex items-center gap-2 text-sm font-bold text-white">
            <Bot size={15} className="text-fuchsia-400" /> Agentic Studio
          </h1>
          {bpName && <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">{bpName}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowPicker(true)} className="btn-outline text-xs"><Wand2 size={13} /> Blueprints</button>
          <button onClick={toggleConnect} className={`btn text-xs ${connectMode ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40' : 'btn-outline'}`} title="Connect two components">
            <Cable size={14} /> {connectMode ? (pendingSource ? 'Pick target…' : 'Pick source…') : 'Connect'}
          </button>
          <button onClick={clearCanvas} className="btn-ghost text-xs text-zinc-400"><Trash2 size={13} /> Clear</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        {/* Palette */}
        <aside className="panel flex w-52 shrink-0 flex-col">
          <div className="panel-header">Building blocks</div>
          <Palette onAdd={(id) => addComponent(id)} />
          <p className="border-t border-zinc-800 px-3 py-2 text-[10px] leading-relaxed text-zinc-600">
            Drag onto the canvas, or click to drop. Use <span className="text-zinc-400">Connect</span> to wire the flow, then <span className="text-zinc-400">Run</span> it.
          </p>
        </aside>

        {/* Canvas + floating inspector */}
        <div className="panel relative min-w-0 flex-1 overflow-hidden">
          <div className="h-full w-full overflow-auto">
            <ErrorBoundary label="AgentCanvas">
              <ArchitectureCanvas
                nodes={nodes} edges={edges} selected={selected} highlightIds={highlightIds}
                connectMode={connectMode} pendingSourceId={pendingSource}
                sim={simActive ? { steps: simSteps, index: simIndex, progress: simProgress, status: simStatus } : null}
                onAddComponent={addComponent} onMoveNode={moveNode}
                onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onBackgroundClick={onBackgroundClick}
                renderNodeMeta={agentNodeMeta}
                emptyHint="Pick a blueprint or drag building blocks to design your agent →"
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
          {showPicker && <BlueprintPicker onPick={pickBlueprint} onClose={() => setShowPicker(false)} onRisky={() => loadTemplate('risky-draft')} />}
        </div>

        {/* Right column */}
        <aside className="flex w-[340px] shrink-0 flex-col gap-2">
          {/* Run / flow */}
          <div className="panel shrink-0">
            <div className="panel-header justify-between">
              <span>Run the flow</span>
              {simActive && <span className="normal-case tracking-normal text-zinc-500">Step {Math.min(simIndex + 1, simSteps.length)} / {simSteps.length}</span>}
            </div>
            <div className="space-y-2 p-3">
              <select
                value={simMode}
                onChange={(e) => { setSimMode(e.target.value); resetSim() }}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
              >
                {FLOW_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <button onClick={togglePlay} className="btn-primary flex-1 justify-center">
                  {simStatus === 'running' ? <Pause size={15} /> : <Play size={15} />}
                  <span className="text-xs">{simStatus === 'running' ? 'Pause' : simActive && simStatus !== 'paused' ? 'Replay' : 'Run pipeline'}</span>
                </button>
                <button onClick={resetSim} disabled={!simActive} className="btn-ghost px-2 text-xs" title="Reset"><RotateCcw size={14} /></button>
                <button onClick={() => setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))} className="btn-ghost px-2 text-xs" title="Speed"><Gauge size={13} /> {speed}x</button>
              </div>
              {simLine && (
                <p className={`rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-2 text-[11px] leading-relaxed ${toneClass[simLine.tone]}`}>{simLine.text}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                {STAGE_LEGEND.map((s) => (
                  <span key={s.key} className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <span className="inline-block h-2 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="panel flex min-h-0 flex-1 flex-col">
            <div className="flex gap-1 border-b border-zinc-800 p-1.5">
              <button onClick={() => setRightTab('review')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${rightTab === 'review' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <ShieldCheck size={13} /> Review {analysis.findings.length > 0 && <span className="rounded-full bg-zinc-700 px-1.5 text-[9px] text-zinc-200">{analysis.findings.length}</span>}
              </button>
              <button onClick={() => setRightTab('profile')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${rightTab === 'profile' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <Sparkles size={13} /> Build profile
              </button>
            </div>

            {rightTab === 'review' && (
              <>
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Design review</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${analysis.verdict.tone === 'good' ? 'bg-emerald-500/15 text-emerald-300' : analysis.verdict.tone === 'bad' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>{analysis.verdict.label}</span>
                </div>
                {analysisError && (
                  <p className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
                    Couldn't reach the analysis service — showing the last result.
                  </p>
                )}
                <ReviewPanel analysis={analysis} highlightFinding={highlightFinding} onHighlight={setHighlightFinding} />
              </>
            )}
            {rightTab === 'profile' && <ProfilePanel profile={profile} />}
          </div>
        </aside>
      </div>
    </div>
  )
}
