import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import CodeWorkspace from '../components/CodeWorkspace.jsx'
import { TRACKS, ACCENTS } from '../data/tracks.js'
import { DEFAULT_CODE } from '../data/defaultCode.js'
import { load, save } from '../lib/storage.js'

export default function Playground() {
  const [language, setLanguage] = useState(() => load('playground.lang', 'javascript'))
  const [codeByLang, setCodeByLang] = useState(() => {
    const stored = {}
    for (const track of TRACKS) {
      stored[track.id] = load(`playground.code.${track.id}`, DEFAULT_CODE[track.id])
    }
    return stored
  })

  function switchLanguage(id) {
    setLanguage(id)
    save('playground.lang', id)
  }

  function updateCode(value) {
    setCodeByLang((prev) => ({ ...prev, [language]: value }))
    save(`playground.code.${language}`, value)
  }

  function resetCode() {
    setCodeByLang((prev) => ({ ...prev, [language]: DEFAULT_CODE[language] }))
    save(`playground.code.${language}`, DEFAULT_CODE[language])
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* Language switcher */}
      <div className="flex shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
          {TRACKS.map((track) => {
            const accent = ACCENTS[track.accent]
            const active = language === track.id
            return (
              <button
                key={track.id}
                onClick={() => switchLanguage(track.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? `bg-zinc-800 text-white ring-1 ${accent.ring}` : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className={`font-mono text-xs font-bold ${accent.text}`}>{track.badge}</span>
                <span className="hidden md:inline">{track.short}</span>
              </button>
            )
          })}
        </div>
        <button onClick={resetCode} className="btn-ghost text-xs" title="Restore the starter snippet">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* Workspace — keyed by language so each language keeps its own panes */}
      <div className="min-h-0 flex-1">
        <CodeWorkspace
          key={language}
          language={language}
          code={codeByLang[language]}
          onCodeChange={updateCode}
        />
      </div>
    </div>
  )
}
