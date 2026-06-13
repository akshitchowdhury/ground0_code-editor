import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { TRACKS, ACCENTS } from '../data/tracks.js'
import { getLevels } from '../data/tutorials/index.js'
import { load } from '../lib/storage.js'

export default function LearnHome() {
  const progress = load('progress', {})

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="fade-up mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Guided <span className="gradient-text">Tutorials</span>
          </h1>
          <p className="mt-3 text-zinc-400">
            Pick a track and work through it level by level. Your progress is saved automatically.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TRACKS.map((track, i) => {
            const accent = ACCENTS[track.accent]
            const levels = getLevels(track.id)
            const completed = (progress[track.id] || []).filter((id) => levels.some((l) => l.id === id)).length
            const pct = levels.length ? Math.round((completed / levels.length) * 100) : 0
            return (
              <Link
                key={track.id}
                to={`/learn/${track.id}`}
                className={`group panel fade-up p-5 transition-all hover:-translate-y-0.5 hover:${accent.border}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl font-mono text-base font-bold ${accent.bg} ${accent.text}`}
                  >
                    {track.badge}
                  </span>
                  {pct === 100 && <CheckCircle2 size={18} className="text-emerald-400" />}
                </div>
                <h2 className="mt-3 text-lg font-bold text-white">{track.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{track.tagline}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
                    <span>
                      {completed} / {levels.length} levels
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${accent.solid} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-300 transition-all group-hover:gap-2 group-hover:text-white">
                  {completed === 0 ? 'Start track' : pct === 100 ? 'Review track' : 'Continue'}
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
