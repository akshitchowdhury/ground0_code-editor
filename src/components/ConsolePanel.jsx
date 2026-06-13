import { useEffect, useRef } from 'react'
import { Terminal as TerminalIcon, Trash2, Loader2 } from 'lucide-react'

const LEVEL_STYLES = {
  log: 'text-zinc-300',
  info: 'text-sky-300',
  warn: 'text-amber-300',
  error: 'text-red-400',
}

export default function ConsolePanel({ entries, onClear, running, status, title = 'Console' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries, status])

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header justify-between">
        <span className="flex items-center gap-2">
          <TerminalIcon size={13} />
          {title}
          {running && <Loader2 size={12} className="animate-spin text-indigo-400" />}
        </span>
        <button onClick={onClear} className="btn-ghost !p-1" title="Clear console">
          <Trash2 size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
        {entries.length === 0 && !status && (
          <p className="text-zinc-600 italic">Output will appear here. Press Run (or Ctrl+Enter in the editor).</p>
        )}
        {entries.map((entry, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap border-b border-zinc-800/40 py-0.5 last:border-0 ${LEVEL_STYLES[entry.level] || LEVEL_STYLES.log}`}
          >
            {entry.level === 'error' && <span className="mr-1.5 text-red-500">✖</span>}
            {entry.level === 'warn' && <span className="mr-1.5 text-amber-400">⚠</span>}
            {entry.text}
          </div>
        ))}
        {status && (
          <div className="flex items-center gap-2 py-1 text-indigo-300">
            <Loader2 size={13} className="animate-spin" /> {status}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
