import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, BrainCircuit, Sparkles, Layers, Bot } from 'lucide-react'
import { CLOUD_MODULES } from '../data/cloud/modules.js'
import { getCloudLessons } from '../data/cloud/index.js'
import { ACCENTS } from '../data/tracks.js'
import { load, save } from '../lib/storage.js'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchCloudProgress } from '../lib/api.js'

export default function CloudHome() {
  const { user } = useAuth()
  const [progress, setProgress] = useState(() => load('cloudProgress', {}))

  // Merge any server-side progress (when the backend is running) with local.
  useEffect(() => {
    let cancelled = false
    fetchCloudProgress().then((remote) => {
      if (cancelled || !remote) return
      setProgress((local) => {
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="fade-up mb-10 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ground0 : <span className="gradient-text">Architectural Design studio</span>
          </h1>
          <p className="mt-3 text-zinc-400">
            Self-paced networking, cloud and DevOps learning — with interactive flow boards you can play, pause and
            step through.
          </p>
        </div>

        {/* Mock exam lab banner */}
        <Link
          to="/cloud/exam"
          className="group panel fade-up mb-8 flex items-center gap-5 border-indigo-500/30 p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-400/60"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-indigo-950/50">
            <BrainCircuit size={22} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              Mock Exam Lab <Sparkles size={15} className="text-fuchsia-400" />
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              AI-driven practice exams for AWS Cloud Practitioner, Solutions Architect and DevOps interviews — with
              personalized feedback on your strengths and what to study next.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-sm font-medium text-indigo-300 transition-all group-hover:gap-2 sm:inline-flex">
            Take an exam <ArrowRight size={15} />
          </span>
        </Link>

        {/* Architecture Studio banner */}
        <Link
          to="/cloud/designer"
          className="group panel fade-up mb-8 flex items-center gap-5 border-cyan-500/30 p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-400/60"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600 shadow-lg shadow-cyan-950/50">
            <Layers size={22} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              Architecture Studio <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">New</span>
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Drag and drop EC2, load balancers, databases and more to architect a cloud system — set security-group
              ports, play the network flow, and get a live well-architected review of how secure and resilient your
              design is.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-sm font-medium text-cyan-300 transition-all group-hover:gap-2 sm:inline-flex">
            Open studio <ArrowRight size={15} />
          </span>
        </Link>

        {/* Agentic Studio banner */}
        <Link
          to="/cloud/agent-studio"
          className="group panel fade-up mb-8 flex items-center gap-5 border-fuchsia-500/30 p-5 transition-all hover:-translate-y-0.5 hover:border-fuchsia-400/60"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 shadow-lg shadow-fuchsia-950/50">
            <Bot size={22} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              Agentic Studio <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300">New</span>
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Design LLM agents visually before you code: pick an agent type, choose how to train or ground it (RAG,
              fine-tuning, tools, memory), wire the pipeline, play the data flow — and get warned about unsafe or
              unoptimized designs.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-sm font-medium text-fuchsia-300 transition-all group-hover:gap-2 sm:inline-flex">
            Build an agent <ArrowRight size={15} />
          </span>
        </Link>

        {/* Learning modules */}
        <div className="grid gap-4 sm:grid-cols-2">
          {CLOUD_MODULES.map((mod, i) => {
            const accent = ACCENTS[mod.accent]
            const lessons = getCloudLessons(mod.id)
            const completed = (progress[mod.id] || []).filter((id) => lessons.some((l) => l.id === id)).length
            const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0
            return (
              <Link
                key={mod.id}
                to={`/cloud/${mod.id}`}
                className={`group panel fade-up p-5 transition-all hover:-translate-y-0.5 hover:${accent.border}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${accent.bg} ${accent.text}`}
                  >
                    {mod.badge}
                  </span>
                  {pct === 100 && <CheckCircle2 size={18} className="text-emerald-400" />}
                </div>
                <h2 className="mt-3 text-lg font-bold text-white">{mod.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{mod.tagline}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
                    <span>
                      {completed} / {lessons.length} lessons
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${accent.solid} transition-all`} style={{ width: `${pct}%` }} />
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
