import { Link } from 'react-router-dom'
import { BookOpenText, Flame, DraftingCompass, ArrowRight, Zap, ShieldCheck, WifiOff, Code2, GraduationCap, Workflow } from 'lucide-react'
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
            Learn. Prove. <span className="gradient-text">Forge.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
            <span className="font-semibold text-zinc-200">DevAshura F<span className="phi-neon">Φ</span>rge</span> — three
            grounds, one workspace: gain knowledge like a <span className="deva-neon font-medium">Deva</span>, prove it
            like an <span className="ashura-neon font-medium">Ashura</span>, and design in balance at Ground<span className="phi-neon font-semibold">Φ</span>.
          </p>
        </div>

        {/* The three grounds */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/deva"
            className="group panel fade-up border-violet-500/20 p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/60"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-950/50">
              <BookOpenText size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Ground <span className="deva-neon">Δeva</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The knowledge realm. Learn to code through guided, level-by-level tracks in six languages — and
              absorb the concepts behind cloud systems and AI with animated flow boards.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-400 group-hover:gap-2 transition-all">
              Seek knowledge <ArrowRight size={15} />
            </span>
          </Link>

          <Link
            to="/ashura"
            className="group panel fade-up border-rose-500/20 p-6 transition-all hover:-translate-y-0.5 hover:border-rose-400/60"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shadow-lg shadow-rose-950/50">
              <Flame size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Ground <span className="ashura-neon">Λshura</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The proving ground. Face AI-driven mock exams that grade you and target your weakest domains —
              or build freely in the project sandbox. Trial by fire.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-rose-400 group-hover:gap-2 transition-all">
              Prove yourself <ArrowRight size={15} />
            </span>
          </Link>

          <Link
            to="/zero"
            className="group panel fade-up border-fuchsia-500/20 p-6 transition-all hover:-translate-y-0.5 hover:border-fuchsia-400/60"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 shadow-lg shadow-fuchsia-950/50">
              <DraftingCompass size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Ground<span className="phi-neon">Φ</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The balance point. Design cloud architectures and LLM-agent pipelines on a live canvas — reviewed,
              simulated, load-tested, priced, and AI-assisted as you build.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-fuchsia-400 group-hover:gap-2 transition-all">
              Enter the forge <ArrowRight size={15} />
            </span>
          </Link>
        </div>

        {/* Capabilities — the three studios inside the forge */}
        <div className="fade-up mt-16" style={{ animationDelay: '0.3s' }}>
          <h3 className="mb-4 text-center text-sm font-semibold tracking-widest text-zinc-500 uppercase">
            One forge, three studios
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Learning Paths — Deva */}
            <div className="panel border border-violet-500/20 p-5">
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <GraduationCap size={18} />
              </span>
              <p className="font-semibold text-white">Learning Paths</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Guided, level-by-level tracks with an AI mentor and mock exams that target your weak spots.
              </p>
            </div>

            {/* Code Studio — Ashura */}
            <div className="panel border border-rose-500/20 p-5">
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300">
                <Code2 size={18} />
              </span>
              <p className="font-semibold text-white">Code Studio</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Write and run real code with live output — sandboxed in your browser or a cloud runner.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {TRACKS.map((track) => {
                  const accent = ACCENTS[track.accent]
                  return (
                    <span
                      key={track.id}
                      title={track.name}
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-bold ${accent.bg} ${accent.text}`}
                    >
                      {track.badge}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Design Studio — Φ */}
            <div className="panel border border-fuchsia-500/20 p-5">
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-300">
                <Workflow size={18} />
              </span>
              <p className="font-semibold text-white">Design Studio</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Architect cloud systems and LLM-agent pipelines on a live canvas — reviewed, simulated and priced.
              </p>
            </div>
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
