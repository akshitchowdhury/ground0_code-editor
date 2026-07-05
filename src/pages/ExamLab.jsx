import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Target,
  ListChecks,
  History,
  AlertTriangle,
  RotateCcw,
  Wand2,
  Lightbulb,
} from 'lucide-react'
import { EXAM_CATALOG } from '../data/cloud/modules.js'
import { ACCENTS } from '../data/tracks.js'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchHealth, startExam, submitExam, fetchExamHistory, fetchStudyPlan } from '../lib/api.js'

const LETTERS = ['A', 'B', 'C', 'D']

function ScoreRing({ pct }) {
  const r = 52
  const c = 2 * Math.PI * r
  const color = pct >= 80 ? 'rgb(52 211 153)' : pct >= 55 ? 'rgb(251 191 36)' : 'rgb(251 113 133)'
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(39 39 42)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white">{pct}%</span>
        <span className="text-[10px] tracking-wider text-zinc-500 uppercase">score</span>
      </div>
    </div>
  )
}

export default function ExamLab() {
  const { user } = useAuth()

  const [phase, setPhase] = useState('pick') // pick | loading | running | submitting | results
  const [health, setHealth] = useState(undefined) // undefined=checking, null=offline
  const [history, setHistory] = useState([])
  const [studyPlan, setStudyPlan] = useState(null)
  const [error, setError] = useState(null)

  const [examType, setExamType] = useState('ccp')
  const [count, setCount] = useState(10)

  const [session, setSession] = useState(null) // { sessionId, examName, source, questions }
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)

  useEffect(() => {
    fetchHealth().then(setHealth)
    fetchExamHistory().then((h) => h && setHistory(h))
    fetchStudyPlan().then((p) => p && setStudyPlan(p))
  }, [user])

  async function begin() {
    setError(null)
    setPhase('loading')
    try {
      const data = await startExam(examType, count)
      setSession(data)
      setAnswers({})
      setQIndex(0)
      setPhase('running')
    } catch (err) {
      setError(err.message)
      setPhase('pick')
    }
  }

  async function submit() {
    setError(null)
    setPhase('submitting')
    try {
      const data = await submitExam(session.sessionId, answers)
      setResults(data)
      setPhase('results')
      fetchExamHistory().then((h) => h && setHistory(h))
      fetchStudyPlan().then((p) => p && setStudyPlan(p))
    } catch (err) {
      setError(err.message)
      setPhase('running')
    }
  }

  function resetToLab() {
    setPhase('pick')
    setSession(null)
    setResults(null)
    setError(null)
  }

  const backendDown = health === null

  // ---------- phase: pick ----------
  if (phase === 'pick' || phase === 'loading') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link to="/cloud" className="btn-ghost mb-6 inline-flex text-xs">
            <ArrowLeft size={14} /> Ground0 : Cloud
          </Link>

          <div className="fade-up mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Mock Exam <span className="gradient-text">Lab</span>
            </h1>
            <p className="mt-3 text-zinc-400">
              AI-generated practice exams with personalized feedback — strengths, weak areas and what to study next.
            </p>
            {health && (
              <p className="mt-2 text-xs text-zinc-600">
                Backend connected · questions: {health.ai ? 'AI-generated (Claude)' : 'offline question bank'} ·
                storage: {health.db}
              </p>
            )}
          </div>

          {backendDown && (
            <div className="fade-up mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">The exam backend isn’t running.</p>
                <p className="mt-1 text-amber-200/80">
                  Start it with <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs">npm run goserver</code>{' '}
                  in the project folder, then refresh. (Optional: set <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code>{' '}
                  in .env for AI-generated questions.)
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="fade-up mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          {/* Exam type cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {EXAM_CATALOG.map((exam, i) => {
              const accent = ACCENTS[exam.accent]
              const selected = examType === exam.id
              return (
                <button
                  key={exam.id}
                  onClick={() => setExamType(exam.id)}
                  className={`panel fade-up p-5 text-left transition-all hover:-translate-y-0.5 ${
                    selected ? `${accent.border} ring-1 ${accent.ring}` : ''
                  }`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold ${accent.bg} ${accent.text}`}
                  >
                    {exam.badge}
                  </span>
                  <h2 className="mt-3 font-bold text-white">{exam.name}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{exam.desc}</p>
                  {selected && (
                    <span className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${accent.text}`}>
                      <CheckCircle2 size={13} /> Selected
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Config + start */}
          <div className="fade-up mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    count === n ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {n} questions
                </button>
              ))}
            </div>
            <button onClick={begin} disabled={phase === 'loading' || backendDown} className="btn-primary px-6">
              {phase === 'loading' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Writing your exam…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Start exam
                </>
              )}
            </button>
          </div>
          {phase === 'loading' && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              {health?.ai
                ? 'Claude is writing fresh questions for you — this can take up to a minute.'
                : 'Preparing questions from the offline bank…'}
            </p>
          )}

          {/* Adaptive study plan */}
          {studyPlan && !studyPlan.empty && (
            <div className="fade-up mt-12">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-widest text-zinc-500 uppercase">
                <Wand2 size={14} className="text-fuchsia-400" /> Your study plan
                <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-medium normal-case tracking-normal text-fuchsia-300">
                  {studyPlan.source === 'ai' ? 'AI-personalised' : 'from your results'}
                </span>
              </h3>
              <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.07] to-transparent p-4">
                <p className="text-sm leading-relaxed text-zinc-200">{studyPlan.summary}</p>

                {studyPlan.focus?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300/80">
                      <Target size={12} /> Focus next
                    </p>
                    {studyPlan.focus.map((s, i) => (
                      <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-400" />
                          <div>
                            <p className="text-sm font-semibold text-white">{s.topic}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">{s.why}</p>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-300">{s.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {studyPlan.strengths?.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                      <CheckCircle2 size={12} /> Strengths
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {studyPlan.strengths.map((s, i) => (
                        <span key={i} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="fade-up mt-12">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-widest text-zinc-500 uppercase">
                <History size={14} /> Recent attempts
              </h3>
              <div className="space-y-2">
                {history.map((h) => {
                  const exam = EXAM_CATALOG.find((e) => e.id === h.examType)
                  const pct = h.total ? Math.round((h.score / h.total) * 100) : 0
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{exam?.name || h.examType}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(h.createdAt).toLocaleString()} · {h.source === 'ai' ? 'AI questions' : 'question bank'}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          pct >= 80 ? 'text-emerald-400' : pct >= 55 ? 'text-amber-400' : 'text-rose-400'
                        }`}
                      >
                        {h.score}/{h.total} · {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- phase: running / submitting ----------
  if (phase === 'running' || phase === 'submitting') {
    const q = session.questions[qIndex]
    const answered = Object.keys(answers).length
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium tracking-wider uppercase">{session.examName}</span>
            <span>
              {answered}/{session.questions.length} answered
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(answered / session.questions.length) * 100}%` }}
            />
          </div>

          {/* Question palette */}
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            {session.questions.map((question, i) => (
              <button
                key={question.id}
                onClick={() => setQIndex(i)}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  i === qIndex
                    ? 'bg-indigo-500 text-white ring-2 ring-indigo-500/40'
                    : answers[question.id] !== undefined
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question card */}
          <div className="panel fade-up p-6" key={q.id}>
            <span className="mb-3 inline-block rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium tracking-wide text-zinc-400">
              {q.domain}
            </span>
            {q.scenario && (
              <p className="mb-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm leading-relaxed text-zinc-400 italic">
                {q.scenario}
              </p>
            )}
            <h2 className="text-base leading-relaxed font-semibold text-white">{q.question}</h2>

            <div className="mt-4 space-y-2">
              {q.options.map((opt, i) => {
                const chosen = answers[q.id] === i
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                      chosen
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        chosen ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nav + submit */}
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setQIndex((i) => Math.max(0, i - 1))} disabled={qIndex === 0} className="btn-outline">
              <ChevronLeft size={15} /> Prev
            </button>
            {qIndex < session.questions.length - 1 ? (
              <button onClick={() => setQIndex((i) => i + 1)} className="btn-primary">
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={submit} disabled={phase === 'submitting'} className="btn-primary px-6">
                {phase === 'submitting' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Grading &amp; writing feedback…
                  </>
                ) : (
                  <>
                    <ListChecks size={15} /> Submit exam
                  </>
                )}
              </button>
            )}
          </div>
          {answered < session.questions.length && qIndex === session.questions.length - 1 && (
            <p className="mt-2 text-right text-xs text-amber-400/80">
              {session.questions.length - answered} unanswered question(s) will be marked wrong.
            </p>
          )}
          {error && <p className="mt-3 text-right text-xs text-rose-400">{error}</p>}
        </div>
      </div>
    )
  }

  // ---------- phase: results ----------
  const pct = results.total ? Math.round((results.score / results.total) * 100) : 0
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="fade-up flex flex-col items-center text-center">
          <ScoreRing pct={pct} />
          <h1 className="mt-4 text-2xl font-extrabold text-white">
            {results.score} / {results.total} correct
          </h1>
          <p className="mt-1 text-sm font-medium text-indigo-300">{results.feedback.verdict}</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">{results.feedback.summary}</p>
        </div>

        {/* Domain breakdown */}
        <div className="fade-up mt-8">
          <h3 className="mb-3 text-sm font-semibold tracking-widest text-zinc-500 uppercase">Domain breakdown</h3>
          <div className="space-y-2.5">
            {results.domainBreakdown.map((d) => {
              const dp = d.total ? Math.round((d.correct / d.total) * 100) : 0
              return (
                <div key={d.domain}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-zinc-300">{d.domain}</span>
                    <span className="text-zinc-500">
                      {d.correct}/{d.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dp >= 75 ? 'bg-emerald-500' : dp >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${dp}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Strengths + improvements */}
        <div className="fade-up mt-8 grid gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <TrendingUp size={15} /> Strengths
            </h3>
            <ul className="mt-3 space-y-2">
              {results.feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Target size={15} /> Key areas to improve
            </h3>
            <ul className="mt-3 space-y-3">
              {results.feedback.areasToImprove.map((a, i) => (
                <li key={i} className="text-sm">
                  <p className="font-semibold text-white">{a.topic}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{a.why}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-300">→ {a.action}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Next steps */}
        <div className="fade-up panel mt-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-300">
            <ListChecks size={15} /> Next steps
          </h3>
          <ul className="mt-3 space-y-2">
            {results.feedback.nextSteps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-0.5 font-mono text-xs font-bold text-indigo-400">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Question review */}
        <div className="fade-up mt-8">
          <h3 className="mb-3 text-sm font-semibold tracking-widest text-zinc-500 uppercase">Question review</h3>
          <div className="space-y-3">
            {results.results.map((r, i) => (
              <details key={r.id} className="panel group p-0">
                <summary className="flex cursor-pointer items-center gap-3 p-4 select-none">
                  {r.correct ? (
                    <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle size={17} className="shrink-0 text-rose-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300 group-open:whitespace-normal">
                    {i + 1}. {r.question}
                  </span>
                  <span className="shrink-0 text-[10px] tracking-wide text-zinc-600 uppercase">{r.domain}</span>
                </summary>
                <div className="border-t border-zinc-800 px-4 py-3 text-sm">
                  {r.scenario && <p className="mb-2 text-xs text-zinc-500 italic">{r.scenario}</p>}
                  <div className="space-y-1.5">
                    {r.options.map((opt, j) => (
                      <p
                        key={j}
                        className={`rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
                          j === r.correctIndex
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : j === r.userIndex
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'text-zinc-500'
                        }`}
                      >
                        <span className="mr-1.5 font-bold">{LETTERS[j]}.</span>
                        {opt}
                        {j === r.correctIndex && ' ✓'}
                        {j === r.userIndex && j !== r.correctIndex && ' ← your answer'}
                      </p>
                    ))}
                  </div>
                  {r.userIndex === null && <p className="mt-2 text-xs text-amber-400/80">Not answered.</p>}
                  <p className="mt-2 leading-relaxed text-zinc-400">
                    <span className="font-semibold text-zinc-300">Why: </span>
                    {r.explanation}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3 pb-6">
          <button onClick={resetToLab} className="btn-outline">
            <RotateCcw size={14} /> New exam
          </button>
          <Link to="/cloud" className="btn-primary">
            Back to Ground0 : Cloud
          </Link>
        </div>
      </div>
    </div>
  )
}
