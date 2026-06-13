import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { SquareTerminal, Trash2 } from 'lucide-react'

const ENTRY_STYLES = {
  cmd: 'text-zinc-100',
  out: 'text-zinc-300',
  err: 'text-red-400',
  sys: 'text-indigo-300 italic',
}

// Interactive terminal bound to a ShellSession. Also accepts scripted
// input via the imperative `runScript` handle (used by "Run Script").
const Terminal = forwardRef(function Terminal({ session, welcome }, ref) {
  const [entries, setEntries] = useState(welcome ? [{ type: 'sys', text: welcome }] : [])
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [, forceUpdate] = useState(0)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [entries])

  function pushEntries(newOnes) {
    setEntries((prev) => {
      let next = [...prev]
      for (const entry of newOnes) {
        if (entry.type === 'clear') next = []
        else next.push(entry)
      }
      return next
    })
  }

  function runLine(line) {
    const batch = [{ type: 'cmd', text: `${session.prompt()} ${line}` }]
    const result = session.exec(line)
    if (result.clear) {
      setEntries([])
      forceUpdate((n) => n + 1)
      return
    }
    if (result.stdout) batch.push({ type: 'out', text: result.stdout })
    if (result.stderr) batch.push({ type: 'err', text: result.stderr })
    pushEntries(batch)
    forceUpdate((n) => n + 1) // prompt may have changed (cd)
  }

  useImperativeHandle(ref, () => ({
    runScript(script) {
      const batch = []
      session.runScript(script, (entry) => batch.push(entry))
      pushEntries([{ type: 'sys', text: '— running script —' }, ...batch, { type: 'sys', text: '— script finished —' }])
      forceUpdate((n) => n + 1)
    },
    clear() {
      setEntries([])
    },
  }))

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const line = input
      setInput('')
      setHistoryIndex(-1)
      if (line.trim()) runLine(line)
      else pushEntries([{ type: 'cmd', text: session.prompt() }])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const hist = session.history
      if (!hist.length) return
      const next = historyIndex < 0 ? hist.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(next)
      setInput(hist[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const hist = session.history
      if (historyIndex < 0) return
      const next = historyIndex + 1
      if (next >= hist.length) {
        setHistoryIndex(-1)
        setInput('')
      } else {
        setHistoryIndex(next)
        setInput(hist[next])
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setEntries([])
    }
  }

  return (
    <div className="flex h-full flex-col" onClick={() => inputRef.current?.focus()}>
      <div className="panel-header justify-between">
        <span className="flex items-center gap-2">
          <SquareTerminal size={13} /> Terminal — learner@ground0
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setEntries([])
          }}
          className="btn-ghost !p-1"
          title="Clear terminal"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 cursor-text overflow-y-auto bg-zinc-950/80 p-3 font-mono text-[13px] leading-relaxed">
        {entries.map((entry, i) => (
          <div key={i} className={`whitespace-pre-wrap ${ENTRY_STYLES[entry.type] || ENTRY_STYLES.out}`}>
            {entry.text}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-emerald-400">{session.prompt()}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] text-zinc-100 caret-emerald-400 outline-none"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            aria-label="terminal input"
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  )
})

export default Terminal
