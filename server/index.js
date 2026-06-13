// Ground0: Cloud backend — Express API for learning progress and AI-driven
// mock exams. Start with `npm run server` (defaults to port 4000; the Vite dev
// server proxies /api here).
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { initStore } from './db.js'
import { EXAM_TYPES, sampleQuestions } from './exams.js'
import { aiEnabled, generateQuestions, generateFeedback, heuristicFeedback } from './ai.js'

const PORT = process.env.PORT || 4000
const store = await initStore()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: store.kind, ai: aiEnabled })
})

// ---------- Learning progress ----------

app.get('/api/progress', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })
  res.json({ progress: await store.getProgress(userId) })
})

app.put('/api/progress', async (req, res) => {
  const { userId, moduleId, completed } = req.body || {}
  if (!userId || !moduleId || !Array.isArray(completed)) {
    return res.status(400).json({ error: 'userId, moduleId and completed[] required' })
  }
  await store.setProgress(userId, moduleId, completed)
  res.json({ ok: true })
})

// ---------- Mock exams ----------

// Start an exam: AI-generated questions, falling back to the offline bank.
app.post('/api/exams', async (req, res) => {
  const { userId, examType, count = 10 } = req.body || {}
  const exam = EXAM_TYPES[examType]
  if (!userId || !exam) return res.status(400).json({ error: 'userId and valid examType required' })
  const n = Math.min(Math.max(Number(count) || 10, 3), 15)

  let source = 'ai'
  let questions = await generateQuestions(exam, n)
  if (!questions) {
    source = 'bank'
    questions = sampleQuestions(examType, n)
  }

  const id = crypto.randomUUID()
  await store.createExam({ id, userId, examType, source, questions, total: questions.length })

  res.json({
    sessionId: id,
    examType,
    examName: exam.name,
    source,
    // Strip answers/explanations before sending to the client.
    questions: questions.map((q) => ({
      id: q.id,
      domain: q.domain,
      scenario: q.scenario,
      question: q.question,
      options: q.options,
    })),
  })
})

// Submit answers: grade, store, and return results + AI feedback.
app.post('/api/exams/:id/submit', async (req, res) => {
  const { answers } = req.body || {}
  const session = await store.getExam(req.params.id)
  if (!session) return res.status(404).json({ error: 'exam session not found' })
  if (session.status === 'completed') return res.status(409).json({ error: 'exam already submitted' })
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'answers required' })

  const exam = EXAM_TYPES[session.examType]
  const graded = session.questions.map((q) => {
    const userIndex = Number.isInteger(answers[q.id]) ? answers[q.id] : null
    return {
      id: q.id,
      domain: q.domain,
      scenario: q.scenario,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      userIndex,
      correct: userIndex === q.correctIndex,
    }
  })
  const score = graded.filter((g) => g.correct).length
  const total = graded.length

  const domainBreakdown = exam.domains
    .map((domain) => {
      const inDomain = graded.filter((g) => g.domain === domain)
      return { domain, total: inDomain.length, correct: inDomain.filter((g) => g.correct).length }
    })
    .filter((d) => d.total > 0)

  const feedback =
    (await generateFeedback(exam, graded, score, total, domainBreakdown)) ||
    heuristicFeedback(exam, score, total, domainBreakdown)

  await store.completeExam(session.id, { answers, score, feedback })

  res.json({ score, total, domainBreakdown, results: graded, feedback, source: session.source })
})

// Exam history for a user.
app.get('/api/exams', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })
  res.json({ exams: await store.listExams(userId) })
})

app.listen(PORT, () => {
  console.log(`[server] Ground0: Cloud API on http://localhost:${PORT}`)
  console.log(`[server] db=${store.kind} ai=${aiEnabled ? 'anthropic' : 'offline question bank'}`)
})
