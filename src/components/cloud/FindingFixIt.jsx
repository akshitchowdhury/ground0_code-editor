import { useState } from 'react'
import { Wand2, Loader2, Terminal } from 'lucide-react'
import { fixFinding } from '../../lib/studioApi.js'

// A "Suggest a fix" expander rendered inside an expanded review finding.
// Shared by the Architecture and Agentic studios (pass studio="cloud"|"agent").
// AI-first with a curated library fallback — the backend always returns
// something, so this never dead-ends without an API key.
export default function FindingFixIt({ finding, studio }) {
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [fix, setFix] = useState(null)
  const [error, setError] = useState(null)

  async function suggest(e) {
    e.stopPropagation()
    if (state === 'loading') return
    setState('loading')
    setError(null)
    try {
      const result = await fixFinding({
        studio,
        title: finding.title,
        detail: finding.detail,
        category: finding.category,
        level: finding.level,
      })
      setFix(result)
      setState('done')
    } catch (err) {
      setError(err.message || 'Could not fetch a suggestion.')
      setState('error')
    }
  }

  if (state === 'idle' || state === 'error') {
    return (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={suggest}
          className="inline-flex items-center gap-1.5 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[10.5px] font-medium text-fuchsia-200 hover:bg-fuchsia-500/20"
        >
          <Wand2 size={11} /> Suggest a fix
        </button>
        {error && <p className="mt-1 text-[10.5px] text-rose-300">{error}</p>}
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fuchsia-300" onClick={(e) => e.stopPropagation()}>
        <Loader2 size={12} className="animate-spin" /> Thinking through a fix…
      </p>
    )
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-2.5" onClick={(e) => e.stopPropagation()}>
      <p className="text-[11px] leading-relaxed text-zinc-200">{fix.explanation}</p>
      {fix.steps?.length > 0 && (
        <ol className="ml-3.5 list-decimal space-y-1 text-[11px] leading-relaxed text-zinc-400 marker:text-fuchsia-400/70">
          {fix.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {fix.snippet && (
        <div>
          <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
            <Terminal size={10} /> {fix.language || 'snippet'}
          </div>
          <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[10.5px] leading-relaxed text-zinc-300"><code>{fix.snippet}</code></pre>
        </div>
      )}
      <p className="text-[9px] text-zinc-600">{fix.source === 'ai' ? 'AI-generated suggestion' : 'From the built-in fix library'}</p>
    </div>
  )
}
