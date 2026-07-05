import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, BookOpenText, Sparkles } from 'lucide-react'
import { TRACKS, ACCENTS } from '../data/tracks.js'
import { getLevels } from '../data/tutorials/index.js'
import { CLOUD_MODULES } from '../data/cloud/modules.js'
import { getCloudLessons } from '../data/cloud/index.js'
import { load, save } from '../lib/storage.js'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchCloudProgress } from '../lib/api.js'
import DevaFigure from '../components/art/DevaFigure.jsx'

// Ground Δeva — the knowledge realm. Learn to code (guided language tracks)
// and learn the concepts behind cloud & AI systems. Techno-purple theming.
export default function GroundDeva() {
  const { user } = useAuth()
  const trackProgress = load('progress', {})
  const [cloudProgress, setCloudProgress] = useState(() => load('cloudProgress', {}))

  // Merge any server-side progress (when the backend is running) with local.
  useEffect(() => {
    let cancelled = false
    fetchCloudProgress().then((remote) => {
      if (cancelled || !remote) return
      setCloudProgress((local) => {
        const merged = { ...local }
        for (const [moduleId, ids] of Object.entries(remote)) {
          merged[moduleId] = [...new Set([...(merged[moduleId] || []), ...ids])]
        }
        save('cloudProgress', merged)
        return merged
      })
    })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Deva ambience — violet aurora */}
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-64 -right-16 h-80 w-80 rounded-full bg-fuchsia-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <div className="fade-up mb-12 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="flex-1 text-center sm:text-left">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-mono text-xs font-medium text-violet-300">
              δ · the knowledge realm
            </span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="text-white">Ground&nbsp;</span>
              <span className="deva-neon">Δeva</span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-400">
              Wisdom before power. Learn to code through guided, level-by-level tracks — then absorb the
              concepts behind networks, databases, cloud systems and AI with animated flow boards.
            </p>
          </div>
          <DevaFigure className="h-64 w-64 shrink-0 sm:h-72 sm:w-72" />
        </div>

        {/* Code tracks */}
        <div className="fade-up mb-4 flex items-center gap-2" style={{ animationDelay: '0.1s' }}>
          <BookOpenText size={16} className="text-violet-400" />
          <h2 className="text-sm font-semibold tracking-widest text-violet-300 uppercase">Learn to code — six tracks</h2>
        </div>
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((track, i) => {
            const accent = ACCENTS[track.accent]
            const levels = getLevels(track.id)
            const completed = (trackProgress[track.id] || []).filter((id) => levels.some((l) => l.id === id)).length
            const pct = levels.length ? Math.round((completed / levels.length) * 100) : 0
            return (
              <Link
                key={track.id}
                to={`/learn/${track.id}`}
                className="group panel fade-up border-violet-500/15 p-5 transition-all hover:-translate-y-0.5 hover:border-violet-400/50"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold ${accent.bg} ${accent.text}`}>
                    {track.badge}
                  </span>
                  {pct === 100 && <CheckCircle2 size={17} className="text-emerald-400" />}
                </div>
                <h3 className="mt-3 font-bold text-white">{track.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{track.tagline}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
                    <span>{completed} / {levels.length} levels</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Cloud & AI concept modules */}
        <div className="fade-up mb-4 flex items-center gap-2" style={{ animationDelay: '0.2s' }}>
          <Sparkles size={16} className="text-fuchsia-400" />
          <h2 className="text-sm font-semibold tracking-widest text-fuchsia-300 uppercase">Concepts of cloud &amp; AI</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {CLOUD_MODULES.map((mod, i) => {
            const accent = ACCENTS[mod.accent]
            const lessons = getCloudLessons(mod.id)
            const completed = (cloudProgress[mod.id] || []).filter((id) => lessons.some((l) => l.id === id)).length
            const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0
            return (
              <Link
                key={mod.id}
                to={`/cloud/${mod.id}`}
                className="group panel fade-up border-violet-500/15 p-5 transition-all hover:-translate-y-0.5 hover:border-fuchsia-400/50"
                style={{ animationDelay: `${0.2 + i * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${accent.bg} ${accent.text}`}>
                    {mod.badge}
                  </span>
                  {pct === 100 && <CheckCircle2 size={18} className="text-emerald-400" />}
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">{mod.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{mod.tagline}</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
                    <span>{completed} / {lessons.length} lessons</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-fuchsia-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-300 transition-all group-hover:gap-2 group-hover:text-white">
                  {completed === 0 ? 'Start module' : pct === 100 ? 'Review module' : 'Continue'}
                  <ArrowRight size={14} />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
