import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, FlaskConical, Flame, Swords } from 'lucide-react'
import { TRACKS, ACCENTS } from '../data/tracks.js'
import AshuraFigure from '../components/art/AshuraFigure.jsx'

// Ground Λshura — the proving ground. Mock exams under pressure and the free
// code sandbox where you build with your own hands. Techno-crimson theming.
export default function GroundAshura() {
  return (
    <div className="relative h-full overflow-y-auto">
      {/* Ashura ambience — ember glow */}
      <div aria-hidden className="pointer-events-none absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-rose-600/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-72 -left-16 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <div className="fade-up mb-12 flex flex-col items-center gap-6 sm:flex-row-reverse sm:items-center sm:gap-10">
          <div className="flex-1 text-center sm:text-left">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-mono text-xs font-medium text-rose-300">
              α · the proving ground
            </span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="text-white">Ground&nbsp;</span>
              <span className="ashura-neon">Λshura</span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-400">
              Knowledge means nothing untested. Face AI-driven mock exams that grade you and expose your
              weakest domains — or descend into the project ground and forge something real, in six languages.
            </p>
          </div>
          <AshuraFigure className="h-64 w-64 shrink-0 sm:h-72 sm:w-72" />
        </div>

        {/* Mock Exam Lab */}
        <Link
          to="/cloud/exam"
          className="group panel fade-up mb-6 flex items-center gap-5 border-rose-500/30 p-6 transition-all hover:-translate-y-0.5 hover:border-rose-400/70"
          style={{ animationDelay: '0.1s' }}
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shadow-lg shadow-rose-950/50">
            <BrainCircuit size={26} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              Mock Exam Lab <Flame size={16} className="text-orange-400" />
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              AI-generated practice exams for AWS Cloud Practitioner, Solutions Architect and DevOps — graded
              with personalized feedback, an adaptive study plan, and no mercy for weak domains.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-sm font-medium text-rose-300 transition-all group-hover:gap-2 sm:inline-flex">
            Enter the trial <ArrowRight size={15} />
          </span>
        </Link>

        {/* Project ground — code sandbox */}
        <Link
          to="/playground"
          className="group panel fade-up mb-10 flex items-center gap-5 border-orange-500/30 p-6 transition-all hover:-translate-y-0.5 hover:border-orange-400/70"
          style={{ animationDelay: '0.2s' }}
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 shadow-lg shadow-orange-950/50">
            <FlaskConical size={26} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              Project Ground <Swords size={16} className="text-rose-400" />
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              The free code sandbox. Pick a language, build whatever you want, run it instantly — live React
              preview, real Python, remote Go &amp; Java, an interactive terminal. Your forge, your rules.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-sm font-medium text-orange-300 transition-all group-hover:gap-2 sm:inline-flex">
            Start forging <ArrowRight size={15} />
          </span>
        </Link>

        {/* The six weapons */}
        <div className="fade-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="mb-3 text-center text-xs font-semibold tracking-widest text-rose-300/70 uppercase">
            Six weapons at your disposal
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TRACKS.map((track) => {
              const accent = ACCENTS[track.accent]
              return (
                <span
                  key={track.id}
                  className={`inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs font-medium text-zinc-300`}
                >
                  <span className={`font-mono text-[11px] font-bold ${accent.text}`}>{track.badge}</span>
                  {track.name}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
