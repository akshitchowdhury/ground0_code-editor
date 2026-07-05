import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, CheckCircle2, BookOpen } from 'lucide-react'
import LessonContent from '../components/LessonContent.jsx'
import FlowBoard from '../components/FlowBoard.jsx'
import { getCloudModule } from '../data/cloud/modules.js'
import { getCloudLessons } from '../data/cloud/index.js'
import { ACCENTS } from '../data/tracks.js'
import { load, save } from '../lib/storage.js'
import { useAuth } from '../context/AuthContext.jsx'
import { syncCloudProgress } from '../lib/api.js'

function CardsBoard({ cards, accent }) {
  return (
    <div className="panel flex h-full flex-col">
      <div className="panel-header">{cards.title}</div>
      <div className="grid min-h-0 flex-1 auto-rows-min gap-3 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.items.map((card, i) => (
          <div
            key={i}
            className="fade-up rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <span className={`text-xl ${accent.text}`}>{card.icon}</span>
            <p className="mt-2 text-sm font-bold text-white">{card.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CloudTopicPlayer() {
  const { moduleId } = useParams()
  const { user } = useAuth()
  const mod = getCloudModule(moduleId)
  const lessons = getCloudLessons(moduleId)

  const [progress, setProgress] = useState(() => load('cloudProgress', {}))
  const completedIds = progress[moduleId] || []

  const [lessonIndex, setLessonIndex] = useState(() => {
    const stored = load('cloudProgress', {})[moduleId] || []
    const firstIncomplete = lessons.findIndex((l) => !stored.includes(l.id))
    return firstIncomplete === -1 ? 0 : firstIncomplete
  })

  if (!mod || !lessons[lessonIndex]) return <Navigate to="/cloud" replace />

  const lesson = lessons[lessonIndex]
  const accent = ACCENTS[mod.accent]
  const isComplete = completedIds.includes(lesson.id)

  function goToLesson(index) {
    if (index < 0 || index >= lessons.length) return
    setLessonIndex(index)
  }

  function markComplete() {
    const updatedIds = [...new Set([...completedIds, lesson.id])]
    const updated = { ...progress, [moduleId]: updatedIds }
    setProgress(updated)
    save('cloudProgress', updated)
    syncCloudProgress(moduleId, updatedIds)
    if (lessonIndex < lessons.length - 1) goToLesson(lessonIndex + 1)
  }

  const lessonPanel = (
    <aside className="panel flex h-full w-[360px] shrink-0 flex-col xl:w-[400px]">
      {/* Lesson stepper */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5 font-medium tracking-wider uppercase">
            <BookOpen size={12} /> {mod.name}
          </span>
          <span>
            Lesson {lessonIndex + 1} / {lessons.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {lessons.map((l, i) => {
            const done = completedIds.includes(l.id)
            const current = i === lessonIndex
            return (
              <button
                key={l.id}
                onClick={() => goToLesson(i)}
                title={`Lesson ${i + 1}: ${l.title}`}
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
        <h2 className="text-lg font-bold text-white">{lesson.title}</h2>
        <p className={`mt-0.5 mb-3 text-sm ${accent.text}`}>{lesson.summary}</p>
        <LessonContent blocks={lesson.blocks} />
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-zinc-800 p-3">
        {isComplete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <CheckCircle2 size={15} /> Lesson complete
            </span>
            {lessonIndex < lessons.length - 1 && (
              <button onClick={() => goToLesson(lessonIndex + 1)} className="btn-primary text-xs">
                Next lesson <ChevronRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <button onClick={markComplete} className="btn-primary w-full justify-center">
            <Check size={15} /> Mark complete{lessonIndex < lessons.length - 1 ? ' & continue' : ''}
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-1">
        <Link to="/cloud" className="btn-ghost text-xs">
          <ArrowLeft size={14} /> All modules
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => goToLesson(lessonIndex - 1)} disabled={lessonIndex === 0} className="btn-ghost text-xs">
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            onClick={() => goToLesson(lessonIndex + 1)}
            disabled={lessonIndex === lessons.length - 1}
            className="btn-ghost text-xs"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Lesson + interactive board */}
      <div className="flex min-h-0 flex-1 gap-2">
        {lessonPanel}
        <div className="min-w-0 flex-1">
          {lesson.flow ? (
            <FlowBoard key={`${moduleId}-${lesson.id}`} flow={lesson.flow} accent={accent} />
          ) : lesson.cards ? (
            <CardsBoard cards={lesson.cards} accent={accent} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
