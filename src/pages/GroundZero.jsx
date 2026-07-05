import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Bot, Scale } from 'lucide-react'
import DevaFigure from '../components/art/DevaFigure.jsx'
import AshuraFigure from '../components/art/AshuraFigure.jsx'

// Ground Φ (Ground Zero) — the balance point where Deva knowledge and Ashura
// power meet: the design studios. Neutral techno theming — purple and crimson
// held in equilibrium around the Φ.
export default function GroundZero() {
  return (
    <div className="relative h-full overflow-y-auto">
      {/* Balanced ambience — violet left, crimson right */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-violet-600/12 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-rose-600/12 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        {/* Hero — the two guardians flanking the Φ */}
        <div className="fade-up mb-4 flex items-center justify-center gap-2 sm:gap-8">
          <DevaFigure className="hidden h-52 w-52 opacity-80 sm:block lg:h-64 lg:w-64" />
          <div className="shrink-0 text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 font-mono text-xs font-medium text-zinc-300">
              <Scale size={12} /> φ · the balance point
            </span>
            <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
              <span className="text-white">Ground</span>
              <span className="phi-neon">Φ</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
              Where knowledge meets power, design happens. Architect cloud systems and forge LLM agents —
              reviewed, simulated, load-tested and priced as you build.
            </p>
          </div>
          <AshuraFigure className="hidden h-52 w-52 opacity-80 sm:block lg:h-64 lg:w-64" />
        </div>

        {/* The two studios */}
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Link
            to="/cloud/designer"
            className="group panel fade-up border-violet-500/25 p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/60"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 shadow-lg shadow-violet-950/50">
              <Layers size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Architecture Studio</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Drag-and-drop cloud design across AWS, Azure and GCP. Wire components, set security-group ports,
              play the packet flow, break it under load — and get a live well-architected review with one-click
              fixes and AI-generated starter designs from a plain-English prompt.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-300 transition-all group-hover:gap-2">
              Design a system <ArrowRight size={15} />
            </span>
          </Link>

          <Link
            to="/cloud/agent-studio"
            className="group panel fade-up border-rose-500/25 p-6 transition-all hover:-translate-y-0.5 hover:border-rose-400/60"
            style={{ animationDelay: '0.25s' }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-500 shadow-lg shadow-rose-950/50">
              <Bot size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Agentic Studio</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Design LLM agents before you code them. Pick a blueprint, choose how to ground it — RAG,
              fine-tuning, tools, memory — wire the pipeline, simulate the lifecycle, and get a correctness
              and safety review with AI fix suggestions on every finding.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-rose-300 transition-all group-hover:gap-2">
              Forge an agent <ArrowRight size={15} />
            </span>
          </Link>
        </div>

        {/* The philosophy strip */}
        <div className="fade-up mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-zinc-600" style={{ animationDelay: '0.35s' }}>
          <span><span className="deva-neon font-semibold">Deva</span> — learn it in Ground Δeva</span>
          <span className="phi-neon font-display font-bold">Φ</span>
          <span><span className="ashura-neon font-semibold">Ashura</span> — prove it in Ground Λshura</span>
        </div>
      </div>
    </div>
  )
}
