import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import CodeWorkspace from '../components/CodeWorkspace.jsx'
import LessonContent from '../components/LessonContent.jsx'
import { getTrack, ACCENTS } from '../data/tracks.js'
import { getLevels } from '../data/tutorials/index.js'
import { load, save } from '../lib/storage.js'

export default function TutorialPlayer() {
  const { trackId } = useParams()
  const track = getTrack(trackId)
  const levels = getLevels(trackId)

  const [progress, setProgress] = useState(() => load('progress', {}))
  const completedIds = progress[trackId] || []

  // Start at the first level the learner hasn't completed yet.
  const [levelIndex, setLevelIndex] = useState(() => {
    const stored = load('progress', {})[trackId] || []
    const firstIncomplete = levels.findIndex((l) => !stored.includes(l.id))
    return firstIncomplete === -1 ? 0 : firstIncomplete
  })

  const level = levels[levelIndex]
  const codeKey = level ? `tutorial.${trackId}.${level.id}` : null
  const [code, setCode] = useState(() => (level ? load(codeKey, level.starterCode) : ''))

  if (!track || !level) return <Navigate to="/learn" replace />

  const accent = ACCENTS[track.accent]
  const isComplete = completedIds.includes(level.id)

  function goToLevel(index) {
    if (index < 0 || index >= levels.length) return
    const next = levels[index]
    setLevelIndex(index)
    setCode(load(`tutorial.${trackId}.${next.id}`, next.starterCode))
  }

  function updateCode(value) {
    setCode(value)
    save(codeKey, value)
  }

  function loadStarter() {
    updateCode(level.starterCode)
  }

  function showSolution() {
    updateCode(level.solutionCode)
  }

  function markComplete() {
    const updated = { ...progress, [trackId]: [...new Set([...completedIds, level.id])] }
    setProgress(updated)
    save('progress', updated)
    if (levelIndex < levels.length - 1) goToLevel(levelIndex + 1)
  }

  const lessonPanel = (
    <aside className="panel flex h-full w-[360px] shrink-0 flex-col xl:w-[400px]">
      {/* Level stepper */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5 font-medium tracking-wider uppercase">
            <BookOpen size={12} /> {track.name}
          </span>
          <span>
            Level {levelIndex + 1} / {levels.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {levels.map((l, i) => {
            const done = completedIds.includes(l.id)
            const current = i === levelIndex
            return (
              <button
                key={l.id}
                onClick={() => goToLevel(i)}
                title={`Level ${i + 1}: ${l.title}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  current
                    ? `${accent.solid} text-zinc-950 ring-2 ${accent.ring}`
                    : done
                      ? `${accent.bg} ${accent.text}`
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {done && !current ? <Check size={13} /> : i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lesson body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <h2 className="text-lg font-bold text-white">{level.title}</h2>
        <p className={`mt-0.5 mb-3 text-sm ${accent.text}`}>{level.summary}</p>
        <LessonContent blocks={level.blocks} />
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <button onClick={loadStarter} className="btn-outline flex-1 justify-center text-xs">
            <RotateCcw size={13} /> Starter code
          </button>
          <button onClick={showSolution} className="btn-outline flex-1 justify-center text-xs">
            <Lightbulb size={13} /> Solution
          </button>
        </div>
        {isComplete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <CheckCircle2 size={15} /> Level complete
            </span>
            {levelIndex < levels.length - 1 && (
              <button onClick={() => goToLevel(levelIndex + 1)} className="btn-primary text-xs">
                Next level <ChevronRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <button onClick={markComplete} className="btn-primary w-full justify-center">
            <Check size={15} /> Mark complete{levelIndex < levels.length - 1 ? ' & continue' : ''}
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-1">
        <Link to="/learn" className="btn-ghost text-xs">
          <ArrowLeft size={14} /> All tracks
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToLevel(levelIndex - 1)}
            disabled={levelIndex === 0}
            className="btn-ghost text-xs"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            onClick={() => goToLevel(levelIndex + 1)}
            disabled={levelIndex === levels.length - 1}
            className="btn-ghost text-xs"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Lesson + workspace. For the shell track the terminal sits on the
          left and the lesson ("review screen") on the right. */}
      <div className={`flex min-h-0 flex-1 gap-2 ${trackId === 'shell' ? 'flex-row-reverse' : ''}`}>
        {lessonPanel}
        <div className="min-w-0 flex-1">
          <CodeWorkspace key={`${trackId}-${level.id}`} language={trackId} code={code} onCodeChange={updateCode} />
        </div>
      </div>
    </div>
  )
}
