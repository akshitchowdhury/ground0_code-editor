import { Link } from 'react-router-dom'
import { FlaskConical, GraduationCap, Cloud, ArrowRight, Zap, ShieldCheck, WifiOff } from 'lucide-react'
import { TRACKS, ACCENTS } from '../data/tracks.js'
import Watermark3D from '../components/Watermark3D.jsx'

export default function Landing() {
  return (
    <div className="relative h-full overflow-y-auto">
      <Watermark3D />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-20">
        {/* Hero */}
        <div className="fade-up text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Zap size={12} /> Nothing to install — runs in your browser
          </span>
          <h1 className="text-5xl leading-tight font-extrabold tracking-tight text-white sm:text-6xl">
            Code. Run. <span className="gradient-text">Learn.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
            Ground Zer0 is a sandbox workspace for JavaScript, React, Python, Go, Java and Linux shell scripting —
            with a live editor, instant output, and step-by-step guided tutorials.
          </p>
        </div>

        {/* Mode cards */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/playground"
            className="group panel fade-up p-6 transition-all hover:-translate-y-0.5 hover:border-indigo-500/50"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/50">
              <FlaskConical size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Project Mode</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              A free playground. Pick a language, write whatever you want, and run it instantly — live React preview,
              console output, or an interactive terminal.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-400 group-hover:gap-2 transition-all">
              Start building <ArrowRight size={15} />
            </span>
          </Link>

          <Link
            to="/learn"
            className="group panel fade-up p-6 transition-all hover:-translate-y-0.5 hover:border-cyan-500/50"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600 shadow-lg shadow-cyan-950/50">
              <GraduationCap size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Guided Mode</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Follow-along tutorials, level by level. Each lesson explains a concept, gives you starter code, and lets
              you run it right there — with solutions when you're stuck.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-400 group-hover:gap-2 transition-all">
              Start learning <ArrowRight size={15} />
            </span>
          </Link>

          <Link
            to="/cloud"
            className="group panel fade-up p-6 transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/50"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 shadow-lg shadow-fuchsia-950/50">
              <Cloud size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Ground0 : Cloud</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Learn networking, cloud and DevOps with interactive play/pause flow boards — then prep for AWS certs and
              interviews with AI-driven mock exams and feedback.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-fuchsia-400 group-hover:gap-2 transition-all">
              Explore the cloud <ArrowRight size={15} />
            </span>
          </Link>
        </div>

        {/* Tracks */}
        <div className="fade-up mt-16" style={{ animationDelay: '0.3s' }}>
          <h3 className="mb-4 text-center text-sm font-semibold tracking-widest text-zinc-500 uppercase">
            Six tracks, one workspace
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKS.map((track) => {
              const accent = ACCENTS[track.accent]
              return (
                <div key={track.id} className={`panel border p-4 ${accent.border}`}>
                  <span
                    className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm font-bold ${accent.bg} ${accent.text}`}
                  >
                    {track.badge}
                  </span>
                  <p className="font-semibold text-white">{track.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{track.tagline}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer notes */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} /> JS, React, Python &amp; shell run sandboxed in your browser — Go &amp; Java in a free
            cloud sandbox
          </span>
          <span className="flex items-center gap-1.5">
            <WifiOff size={13} /> Your work is saved locally, automatically
          </span>
        </div>
      </div>
    </div>
  )
}
