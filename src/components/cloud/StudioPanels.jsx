// Right-hand panels + palette for the Architecture Studio. Kept out of
// CloudDesigner.jsx so the page stays focused on state/orchestration.
import { Fragment } from 'react'
import {
  Plus, Trash2, CircleCheck, CircleX, TriangleAlert, Sparkles, Wrench, TrendingUp,
  Activity, DollarSign, Zap, Gauge, X,
} from 'lucide-react'
import {
  CATALOG_CATEGORIES, getComponent, getCatalogCategories, getProviderComparison, CLOUD_PROVIDERS, TIERS, COMMON_PORTS,
} from '../../data/cloud/components.js'
import { CATEGORY_LABELS, FINDING_STYLES } from '../../lib/cloud/analyze.js'
import {
  COMPUTE_TYPE_OPTIONS, DB_CLASS_OPTIONS, CACHE_TYPE_OPTIONS, INSTANCE_TYPES,
  TRAFFIC_PRESETS, fmtUsd, fmtRps,
} from '../../lib/cloud/specs.js'

// ───────────────────────── shared controls ─────────────────────────
// Literal class strings (Tailwind v4 only generates classes it can see whole).
const ACCENT_CLASS = { emerald: 'accent-emerald-500', rose: 'accent-rose-500' }
function Toggle({ label, checked, onChange, accent = 'emerald' }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className={ACCENT_CLASS[accent]} />
      {label}
    </label>
  )
}
function NumberField({ label, value, onChange, min = 1, max = 99 }) {
  return (
    <label className="flex items-center justify-between text-xs text-zinc-300">
      {label}
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value || min)))}
        className="w-16 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-right text-zinc-200 outline-none focus:border-indigo-500"
      />
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

// ───────────────────────── Palette ─────────────────────────
export function Palette({ onAdd, provider = 'aws' }) {
  const categories = getCatalogCategories(provider)
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      {Object.entries(categories).map(([category, items]) => (
        <div key={category}>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{category}</p>
          <div className="space-y-1">
            {items.map((c) => (
              <button
                key={c.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/x-ground0-component', c.id)}
                onClick={() => onAdd(c.id)}
                title={c.blurb}
                className="flex w-full cursor-grab items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 active:cursor-grabbing"
              >
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

// ───────────────────────── Inspector ───────────────────────
function ConfigControls({ node, onUpdate }) {
  const c = node.config || {}
  const set = (field, val) => onUpdate({ config: { ...c, [field]: val } })
  const isCompute = node.kind === 'compute' || node.kind === 'container'

  return (
    <div className="space-y-2.5 border-t border-zinc-800 pt-2.5">
      {isCompute && (
        <>
          <SelectField label="Instance type" value={c.instanceType || 't3.micro'} options={COMPUTE_TYPE_OPTIONS} onChange={(v) => set('instanceType', v)} render={(o) => `${o} — ${INSTANCE_TYPES[o].rps.toLocaleString()} rps`} />
          <Toggle label="Auto Scaling enabled" checked={c.autoScale} onChange={(v) => set('autoScale', v)} />
          {c.autoScale
            ? <NumberField label="Max instances" value={c.maxInstances ?? 4} onChange={(v) => set('maxInstances', v)} max={200} />
            : <NumberField label="Instances" value={c.instances ?? 1} onChange={(v) => set('instances', v)} max={200} />}
          <Toggle label="Uses admin / wildcard (*) IAM policy" checked={c.iam === 'admin'} onChange={(v) => set('iam', v ? 'admin' : 'least')} accent="rose" />
        </>
      )}
      {node.kind === 'serverless' && (
        <Toggle label="Uses admin / wildcard (*) IAM policy" checked={c.iam === 'admin'} onChange={(v) => set('iam', v ? 'admin' : 'least')} accent="rose" />
      )}
      {node.type === 'rds' && (
        <>
          <SelectField label="DB instance class" value={c.dbClass || 'db.t3.medium'} options={DB_CLASS_OPTIONS} onChange={(v) => set('dbClass', v)} />
          <NumberField label="Read replicas" value={c.readReplicas ?? 0} onChange={(v) => set('readReplicas', v)} min={0} max={15} />
          <Toggle label="Multi-AZ (standby in another zone)" checked={c.multiAz} onChange={(v) => set('multiAz', v)} />
          <Toggle label="Encrypted at rest (KMS)" checked={c.encrypted} onChange={(v) => set('encrypted', v)} />
          <Toggle label="Automated backups / PITR" checked={c.backups} onChange={(v) => set('backups', v)} />
        </>
      )}
      {node.type === 'dynamodb' && (
        <Toggle label="Encrypted at rest" checked={c.encrypted} onChange={(v) => set('encrypted', v)} />
      )}
      {node.kind === 'cache' && (
        <>
          <SelectField label="Cache node type" value={c.cacheType || 'cache.t3.micro'} options={CACHE_TYPE_OPTIONS} onChange={(v) => set('cacheType', v)} />
          <Toggle label="Encryption (in-transit + at-rest)" checked={c.encrypted} onChange={(v) => set('encrypted', v)} />
        </>
      )}
      {node.kind === 'storage' && (
        <>
          <Toggle label="Public access (block this!)" checked={c.public} onChange={(v) => set('public', v)} accent="rose" />
          <Toggle label="Encrypted (SSE)" checked={c.encrypted} onChange={(v) => set('encrypted', v)} />
          <Toggle label="Versioning" checked={c.versioning} onChange={(v) => set('versioning', v)} />
        </>
      )}
    </div>
  )
}

export function NodeInspector({ node, onUpdate, onDelete }) {
  const comp = getComponent(node.type, node.provider)
  const togglePort = (p) => {
    const has = node.ports.includes(p)
    onUpdate({ ports: has ? node.ports.filter((x) => x !== p) : [...node.ports, p].sort((a, b) => a - b) })
  }
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{node.icon}</span>
        <input value={node.label || ''} placeholder={node.name} onChange={(e) => onUpdate({ label: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-white outline-none focus:border-indigo-500" />
      </div>
      {comp?.blurb && <p className="text-xs leading-relaxed text-zinc-500">{comp.blurb}</p>}

      <SelectField label="Subnet / tier" value={node.tier} options={Object.keys(TIERS)} onChange={(v) => onUpdate({ tier: v })} render={(k) => `${TIERS[k].label} — ${TIERS[k].hint}`} />

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Security group — allowed inbound ports</label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PORTS.map(({ port, label }) => {
            const on = node.ports.includes(port)
            return (
              <button key={port} onClick={() => togglePort(port)}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${on ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300' : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>
                {label} <span className="font-mono opacity-70">:{port}</span>
              </button>
            )
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2">
        <input type="checkbox" checked={node.openToInternet} onChange={(e) => onUpdate({ openToInternet: e.target.checked })} className="accent-rose-500" />
        <span className="text-xs text-zinc-300">Source <span className="font-mono">0.0.0.0/0</span> (open to the whole internet)</span>
      </label>

      {node.config && Object.keys(node.config).length > 0 && <ConfigControls node={node} onUpdate={onUpdate} />}

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
      <label className="flex items-center justify-between text-xs text-zinc-300">
        Destination port
        <input type="number" min="1" max="65535" value={edge.port} onChange={(e) => onUpdate({ port: Math.max(1, +e.target.value || 1) })}
          className="w-24 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-right font-mono text-zinc-200 outline-none focus:border-indigo-500" />
      </label>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        The packet is accepted only if <span className="text-zinc-300">{to?.label || to?.name}</span>'s security group allows inbound <span className="font-mono text-zinc-300">:{edge.port}</span>.
      </p>
      <button onClick={onDelete} className="btn-outline w-full justify-center text-xs text-rose-300 hover:border-rose-500/60 hover:text-rose-200">
        <Trash2 size={13} /> Delete connection
      </button>
    </div>
  )
}

// ───────────────────────── Review ──────────────────────────
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
        <ScoreBar label="Setup correctness" value={analysis.correctnessScore} />
        <ScoreBar label="Security (incl. IAM & data)" value={analysis.securityScore} />
        <ScoreBar label="Reliability, cost & network" value={analysis.designScore} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {analysis.empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <Sparkles size={22} className="text-zinc-600" />
            <p className="text-xs">Nothing built yet — drop components and connect them to start scoring.</p>
          </div>
        ) : analysis.findings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <CircleCheck size={22} className="text-emerald-400" />
            <p className="text-xs">No issues found. Clean architecture.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {analysis.findings.map((f) => {
              const st = FINDING_STYLES[f.level]
              const open = highlightFinding === f.id
              const Icon = f.level === 'info' ? Sparkles : f.level === 'warn' ? TriangleAlert : CircleX
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
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Cost ────────────────────────────
export function CostPanel({ provisioned, atLoad, mode, onMode, loadRps }) {
  const data = mode === 'load' && atLoad ? atLoad : provisioned
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-zinc-800 p-2">
        <button onClick={() => onMode('provisioned')} className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium ${mode === 'provisioned' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>Provisioned</button>
        <button onClick={() => onMode('load')} disabled={!atLoad} className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-40 ${mode === 'load' && atLoad ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>
          {atLoad ? `At ${fmtRps(loadRps)} rps` : 'At load (run test)'}
        </button>
      </div>
      <div className="border-b border-zinc-800 p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Estimated monthly cost</p>
        <p className="mt-0.5 text-2xl font-bold text-white">{fmtUsd(data.total)}<span className="text-sm font-normal text-zinc-500"> /mo</span></p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {data.items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800/40">
              <span className="text-sm">{it.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200">{it.name}</p>
                <p className="truncate text-[10px] text-zinc-500">{it.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-zinc-300">{fmtUsd(it.monthly)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-zinc-800 px-3 py-2 text-[10px] leading-relaxed text-zinc-600">
        Rough, illustrative estimate (on-demand pricing). Not a billing quote — use it to compare design choices.
      </p>
    </div>
  )
}

// ───────────────────────── Load test ───────────────────────
const STATUS_STYLE = {
  Healthy: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', bar: 'bg-emerald-500' },
  Degraded: { text: 'text-amber-300', bg: 'bg-amber-500/15', bar: 'bg-amber-500' },
  Overloaded: { text: 'text-rose-300', bg: 'bg-rose-500/15', bar: 'bg-rose-500' },
}
function utilColor(u) {
  return u > 1 ? 'bg-rose-500' : u > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
}

export function LoadTestPanel({ rps, onRps, onRun, running, result, onApplyFix, costAtLoad, onPlayOnBoard }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-zinc-800 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Throw traffic at it</p>
        <div className="grid grid-cols-3 gap-1.5">
          {TRAFFIC_PRESETS.map((p) => (
            <button key={p.rps} onClick={() => onRps(p.rps)}
              className={`rounded-lg border px-1.5 py-1.5 text-center transition-colors ${rps === p.rps ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'}`}>
              <span className="block text-[11px] font-bold">{p.label}</span>
              <span className="block text-[9px] text-zinc-500">{p.sub}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onRun} className="btn-primary flex-1 justify-center">
            {running ? <><Activity size={14} className="animate-pulse" /> Simulating…</> : <><Zap size={14} /> Run — {fmtRps(rps)} req/s</>}
          </button>
          {onPlayOnBoard && (
            <button onClick={onPlayOnBoard} className="btn-outline shrink-0 text-xs" title="Watch the traffic flow on the design board">
              <Activity size={13} /> Play on board
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!result ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-500">
            <TrendingUp size={22} className="text-zinc-600" />
            <p className="text-xs">Pick a traffic level and run the test to find your bottleneck and learn how to scale past it.</p>
          </div>
        ) : !result.ok ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">{result.reason}</p>
        ) : (
          <div className="space-y-3">
            {/* Headline */}
            <div className={`rounded-xl border border-zinc-800 p-3 ${STATUS_STYLE[result.status].bg}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${STATUS_STYLE[result.status].text}`}>{result.status}</span>
                <span className="text-[10px] text-zinc-400">at {fmtRps(result.rps)} req/s</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[9px] uppercase text-zinc-500">Success</p><p className={`text-sm font-bold ${STATUS_STYLE[result.status].text}`}>{Math.round(result.successRate * 100)}%</p></div>
                <div><p className="text-[9px] uppercase text-zinc-500">p95 latency</p><p className="text-sm font-bold text-zinc-200">{result.overloaded ? 'timeouts' : `${result.latencyMs} ms`}</p></div>
                <div><p className="text-[9px] uppercase text-zinc-500">Served</p><p className="text-sm font-bold text-zinc-200">{fmtRps(result.servedRps)}/s</p></div>
              </div>
              {result.bottleneck && result.status !== 'Healthy' && (
                <p className="mt-2 text-[11px] text-zinc-300">Bottleneck: <span className={`font-semibold ${STATUS_STYLE[result.status].text}`}>{result.bottleneck.name}</span></p>
              )}
              {costAtLoad != null && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400"><DollarSign size={11} /> ~{fmtUsd(costAtLoad)}/mo at this scale</p>
              )}
            </div>

            {/* Per-tier utilisation */}
            <div className="space-y-2">
              {result.tiers.map((t) => (
                <div key={t.id}>
                  <div className="mb-0.5 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-zinc-300">{t.icon} {t.name}</span>
                    <span className="font-mono text-zinc-500">{t.scalable ? 'elastic' : `${Math.round(t.util * 100)}%`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${t.scalable ? 'bg-sky-500/60' : utilColor(t.util)} transition-all`} style={{ width: `${t.scalable ? 100 : Math.min(100, t.util * 100)}%` }} />
                  </div>
                  <p className="mt-0.5 text-[9.5px] text-zinc-600">
                    {t.scalable ? 'scales automatically' : `${t.incoming.toLocaleString()} / ${t.capacity.toLocaleString()} rps${t.scaledInstances ? ` · ${t.scaledInstances}× instances` : ''}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"><Wrench size={11} /> Scale it</p>
                {result.recommendations.map((r) => (
                  <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100">{r.label}</p>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-400">{r.detail}</p>
                      </div>
                      {r.patch && (
                        <button onClick={() => onApplyFix(r)} className="btn-primary shrink-0 px-2.5 py-1 text-[11px]">Apply</button>
                      )}
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[10px] text-zinc-600">Apply a fix, then run the test again to watch the bottleneck clear (and the cost change).</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cross-cloud comparison modal ──
export function ProviderComparison({ onClose }) {
  const rows = getProviderComparison()
  const grouped = rows.reduce((acc, r) => { (acc[r.category] ||= []).push(r); return acc }, {})
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="fade-up flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-white">AWS · Azure · GCP — service equivalents</h2>
            <p className="text-xs text-zinc-500">The same building block, named differently per cloud — with what makes each one distinct.</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 text-zinc-400"><X size={16} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /> AWS</span>
                </th>
                <th className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" /> Azure</span>
                </th>
                <th className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> GCP</span>
                </th>
                <th className="py-2">Notes — cost &amp; features</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([cat, items]) => (
                <Fragment key={cat}>
                  <tr><td colSpan={4} className="pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{cat}</td></tr>
                  {items.map((r, i) => (
                    <tr key={i} className="border-t border-zinc-800/70 align-top">
                      <td className="py-2 pr-3"><span className="flex items-center gap-1.5 text-xs font-medium text-zinc-100"><span>{r.icon}</span> {r.aws}</span></td>
                      <td className="py-2 pr-3 text-xs text-zinc-300">{r.azure}</td>
                      <td className="py-2 pr-3 text-xs text-zinc-300">{r.gcp}</td>
                      <td className="py-2 text-[11px] leading-relaxed text-zinc-500">{r.note}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-zinc-800 px-5 py-2 text-[10px] text-zinc-600">
          Equivalents are approximate — services differ in features and limits. Pricing notes are directional, not quotes.
        </p>
      </div>
    </div>
  )
}
