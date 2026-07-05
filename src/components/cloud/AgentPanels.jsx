// Palette, inspector, review, profile and blueprint picker for the Agentic Studio.
import { Plus, Trash2, CircleCheck, CircleX, TriangleAlert, Sparkles, Wrench, AlertTriangle } from 'lucide-react'
import {
  AGENT_CATEGORIES, getAgentComponent, MODELS, MODEL_OPTIONS, AGENT_PATTERNS, PATTERN_OPTIONS,
  DATA_SOURCE_OPTIONS, AGENT_BLUEPRINTS,
} from '../../data/cloud/agentComponents.js'
import { FINDING_STYLES, CATEGORY_LABELS } from '../../lib/agent/analyze.js'
import { BUILD_STEPS } from '../../lib/agent/rules.js'
import FindingFixIt from './FindingFixIt.jsx'

// ── shared controls ──
const ACCENT_CLASS = { emerald: 'accent-emerald-500', rose: 'accent-rose-500' }
function Toggle({ label, checked, onChange, accent = 'emerald' }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className={ACCENT_CLASS[accent]} />
      {label}
    </label>
  )
}
function NumberField({ label, value, onChange, min = 0, max = 9999 }) {
  return (
    <label className="flex items-center justify-between text-xs text-zinc-300">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value || 0)))}
        className="w-20 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-right text-zinc-200 outline-none focus:border-indigo-500" />
    </label>
  )
}
function SelectField({ label, value, options, onChange, render = (o) => o }) {
  return (
    <label className="block text-xs text-zinc-300">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-zinc-200 outline-none focus:border-indigo-500">
        {options.map((o) => <option key={o} value={o}>{render(o)}</option>)}
      </select>
    </label>
  )
}

// Second line shown on each canvas node.
export function agentNodeMeta(n) {
  const c = n.config || {}
  let text = ''
  if (n.kind === 'agent') text = `${MODELS[c.model]?.label || c.model || '—'} · ${c.maxSteps || 0} steps`
  else if (n.kind === 'llm') text = MODELS[c.model]?.label || c.model || '—'
  else if (n.kind === 'tool') text = `${c.toolType}${c.sideEffecting || c.write ? ' · ⚠ action' : ''}`
  else if (n.kind === 'retriever') text = `top-${c.topK ?? 5}`
  else if (n.kind === 'data') text = c.source
  else if (n.kind === 'memory') text = c.memType === 'long' ? 'long-term' : 'short-term'
  else if (n.kind === 'training') text = `${c.method} · ${c.examples}`
  else if (n.kind === 'eval') text = `${c.examples} tests`
  else if (n.kind === 'prompt') text = c.fewShot ? 'few-shot' : 'zero-shot'
  if (!text) return null
  return <div className="mt-1 truncate text-[9.5px] text-zinc-500">{text}</div>
}

// ── Palette ──
export function Palette({ onAdd }) {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      {Object.entries(AGENT_CATEGORIES).map(([category, items]) => (
        <div key={category}>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{category}</p>
          <div className="space-y-1">
            {items.map((c) => (
              <button key={c.id} draggable
                onDragStart={(e) => e.dataTransfer.setData('application/x-ground0-component', c.id)}
                onClick={() => onAdd(c.id)} title={c.blurb}
                className="flex w-full cursor-grab items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 active:cursor-grabbing">
                <span className="text-base leading-none">{c.icon}</span>
                <span className="truncate text-xs font-medium text-zinc-200">{c.short}</span>
                <Plus size={12} className="ml-auto shrink-0 text-zinc-600" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Inspector ──
function ConfigControls({ node, onUpdate }) {
  const c = node.config || {}
  const set = (k, v) => onUpdate({ config: { ...c, [k]: v } })
  switch (node.kind) {
    case 'agent':
      return (
        <div className="space-y-2.5">
          <SelectField label="Model" value={c.model || 'gpt-4o-mini'} options={MODEL_OPTIONS} onChange={(v) => set('model', v)} render={(o) => `${MODELS[o].label} · ${MODELS[o].tier}`} />
          <SelectField label="Reasoning pattern" value={c.pattern || 'react'} options={PATTERN_OPTIONS} onChange={(v) => set('pattern', v)} render={(o) => AGENT_PATTERNS[o]} />
          <NumberField label="Max steps (loop limit)" value={c.maxSteps ?? 0} onChange={(v) => set('maxSteps', v)} min={0} max={50} />
        </div>
      )
    case 'llm':
      return <SelectField label="Model" value={c.model || 'gpt-4o'} options={MODEL_OPTIONS} onChange={(v) => set('model', v)} render={(o) => `${MODELS[o].label} · ${MODELS[o].tier}`} />
    case 'data':
      return <SelectField label="Source type" value={c.source || 'docs'} options={DATA_SOURCE_OPTIONS} onChange={(v) => set('source', v)} />
    case 'retriever':
      return <NumberField label="Top-k chunks" value={c.topK ?? 5} onChange={(v) => set('topK', v)} min={1} max={50} />
    case 'memory':
      return <SelectField label="Memory type" value={c.memType || 'short'} options={['short', 'long']} onChange={(v) => set('memType', v)} render={(o) => (o === 'short' ? 'Short-term (conversation)' : 'Long-term (cross-session)')} />
    case 'prompt':
      return <Toggle label="Include few-shot examples" checked={c.fewShot} onChange={(v) => set('fewShot', v)} />
    case 'training':
      return (
        <div className="space-y-2.5">
          <p className="text-[11px] text-zinc-500">Method: <span className="font-medium text-zinc-300">{c.method}</span></p>
          <NumberField label="Examples" value={c.examples ?? 0} onChange={(v) => set('examples', v)} min={0} max={100000} />
          {'labeled' in c && <Toggle label="Labeled input → output pairs" checked={c.labeled} onChange={(v) => set('labeled', v)} />}
        </div>
      )
    case 'eval':
      return <NumberField label="Test examples" value={c.examples ?? 0} onChange={(v) => set('examples', v)} min={0} max={100000} />
    case 'tool':
      return (
        <div className="space-y-2">
          {'sideEffecting' in c && <Toggle label="Side-effecting (changes the world)" checked={c.sideEffecting} onChange={(v) => set('sideEffecting', v)} accent="rose" />}
          {'write' in c && <Toggle label="Can write / modify data" checked={c.write} onChange={(v) => set('write', v)} accent="rose" />}
          {'sandboxed' in c && <Toggle label="Sandboxed (isolated)" checked={c.sandboxed} onChange={(v) => set('sandboxed', v)} />}
          {'auth' in c && <Toggle label="Authenticated / least-privilege" checked={c.auth} onChange={(v) => set('auth', v)} />}
        </div>
      )
    default:
      return null
  }
}

export function NodeInspector({ node, onUpdate, onDelete }) {
  const comp = getAgentComponent(node.type)
  const hasConfig = ['agent', 'llm', 'data', 'retriever', 'memory', 'prompt', 'training', 'eval', 'tool'].includes(node.kind)
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{node.icon}</span>
        <input value={node.label || ''} placeholder={node.name} onChange={(e) => onUpdate({ label: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-white outline-none focus:border-indigo-500" />
      </div>
      {comp?.blurb && <p className="text-xs leading-relaxed text-zinc-500">{comp.blurb}</p>}
      {hasConfig && <div className="border-t border-zinc-800 pt-2.5"><ConfigControls node={node} onUpdate={onUpdate} /></div>}
      <button onClick={onDelete} className="btn-outline w-full justify-center text-xs text-rose-300 hover:border-rose-500/60 hover:text-rose-200">
        <Trash2 size={13} /> Delete component
      </button>
    </div>
  )
}

export function EdgeInspector({ edge, nodes, onUpdate, onDelete }) {
  const from = nodes.find((n) => n.id === edge.from)
  const to = nodes.find((n) => n.id === edge.to)
  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-zinc-400">
        <span className="font-medium text-zinc-200">{from?.label || from?.name}</span>
        <span className="mx-1 text-zinc-600">→</span>
        <span className="font-medium text-zinc-200">{to?.label || to?.name}</span>
      </p>
      <label className="block text-xs text-zinc-300">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Edge label (optional)</span>
        <input value={edge.label || ''} placeholder="e.g. query, top-k, approve" onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-zinc-200 outline-none focus:border-indigo-500" />
      </label>
      <button onClick={onDelete} className="btn-outline w-full justify-center text-xs text-rose-300 hover:border-rose-500/60 hover:text-rose-200">
        <Trash2 size={13} /> Delete connection
      </button>
    </div>
  )
}

// ── Review ──
function ScoreBar({ label, value }) {
  const color = value >= 85 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-zinc-400"><span>{label}</span><span className="font-mono">{value}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} /></div>
    </div>
  )
}

export function ReviewPanel({ analysis, highlightFinding, onHighlight }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2.5 border-b border-zinc-800 p-3">
        <ScoreBar label="Pipeline correctness" value={analysis.correctnessScore} />
        <ScoreBar label="Safety" value={analysis.safetyScore} />
        <ScoreBar label="Design (reliability & cost)" value={analysis.designScore} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {analysis.empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <Sparkles size={22} className="text-zinc-600" />
            <p className="text-xs">Nothing built yet — pick a blueprint or drag in a User and an Agent to begin.</p>
          </div>
        ) : analysis.findings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <CircleCheck size={22} className="text-emerald-400" />
            <p className="text-xs">No issues found. Solid agent design.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {analysis.findings.map((f) => {
              const st = FINDING_STYLES[f.level]
              const open = highlightFinding === f.id
              const Icon = f.level === 'info' ? Sparkles : f.level === 'warn' ? TriangleAlert : f.level === 'high' ? AlertTriangle : CircleX
              return (
                <li key={f.id}>
                  <button onClick={() => onHighlight(open ? null : f.id)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${open ? 'border-zinc-600 bg-zinc-800/60' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}>
                    <div className="flex items-start gap-2">
                      <Icon size={13} className={`mt-0.5 shrink-0 ${st.text}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${st.badge}`}>{st.label}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium uppercase text-zinc-400">{CATEGORY_LABELS[f.category] || f.category}</span>
                          <span className="truncate text-xs font-semibold text-zinc-100">{f.title}</span>
                        </div>
                        {open && <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">{f.detail}</p>}
                      </div>
                    </div>
                  </button>
                  {/* Outside the finding <button> — nesting buttons is invalid HTML. */}
                  {open && (
                    <div className="mt-1.5 pl-6">
                      <FindingFixIt finding={f} studio="agent" />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Build profile ──
export function ProfilePanel({ profile }) {
  if (profile.empty) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <p className="text-xs text-zinc-500">{profile.summary}</p>
      </div>
    )
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-3">
        <p className="text-[10px] uppercase tracking-wider text-fuchsia-300/80">You are building</p>
        <p className="mt-0.5 text-base font-bold text-white">{profile.archetype}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-300">{profile.summary}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {profile.traits.map((t) => (
          <div key={t.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500">{t.label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-zinc-200" title={t.value}>{t.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Capabilities</p>
      <ul className="space-y-1">
        {profile.capabilities.map((cap, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
            <CircleCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" /> {cap}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
        <Wrench size={13} className="mt-0.5 shrink-0 text-zinc-500" />
        <p className="text-[11px] leading-relaxed text-zinc-400"><span className="font-medium text-zinc-300">{profile.method}:</span> {profile.note}</p>
      </div>
    </div>
  )
}

// ── Blueprint picker (choose what kind of agent to build) ──
export function BlueprintPicker({ onPick, onClose, onRisky }) {
  // Beginner blueprints first so newcomers start small.
  const ordered = [...AGENT_BLUEPRINTS].sort((a, b) => (a.level === 'beginner' ? 0 : 1) - (b.level === 'beginner' ? 0 : 1))
  return (
    <div onClick={onClose} className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="fade-up flex max-h-[92%] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl">
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white">What kind of agent are you building?</h2>
            <p className="mt-0.5 text-sm text-zinc-400">Each blueprint drops a working, <span className="text-zinc-300">valid</span> pipeline you can edit, run and review. New to this? Start with a <span className="text-emerald-300">Beginner</span> one and read how it works.</p>
          </div>
          {onClose && <button onClick={onClose} className="btn-ghost !p-1 text-zinc-500"><CircleX size={16} /></button>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((b) => (
              <button key={b.id} onClick={() => onPick(b.id)}
                className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{b.icon}</span>
                  {b.level === 'beginner' && <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-emerald-300">Beginner</span>}
                </div>
                <p className="mt-1.5 text-sm font-bold text-white">{b.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{b.explain || b.desc}</p>
              </button>
            ))}
          </div>

          {/* Step-by-step build guide */}
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Prefer to build from scratch? Add pieces in this order</p>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {BUILD_STEPS.map((s) => (
                <li key={s.n} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-[9px] font-bold text-fuchsia-300">{s.n}</span>
                  <p className="text-[11px] leading-snug text-zinc-400"><span className="font-medium text-zinc-200">{s.title}.</span> {s.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 p-3 px-5">
          <button onClick={onRisky} className="text-[11px] text-amber-300/90 hover:text-amber-200">⚠ Load a deliberately risky draft (see the warnings)</button>
          <button onClick={onClose} className="btn-ghost text-xs">Start from scratch →</button>
        </div>
      </div>
    </div>
  )
}
