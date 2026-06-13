// Storage layer for Ground0: Cloud. Uses Postgres when DATABASE_URL is set
// and reachable; otherwise falls back to an in-memory store so the app still
// works with zero setup (same philosophy as the demo-auth fallback).
import pg from 'pg'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cloud_progress (
  user_id    TEXT NOT NULL,
  module_id  TEXT NOT NULL,
  completed  JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  exam_type    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  source       TEXT NOT NULL DEFAULT 'ai',
  questions    JSONB NOT NULL,
  answers      JSONB,
  score        INTEGER,
  total        INTEGER,
  feedback     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS exam_sessions_user_idx ON exam_sessions (user_id, created_at DESC);
`

// ---------- Postgres implementation ----------

function pgStore(pool) {
  return {
    kind: 'postgres',

    async getProgress(userId) {
      const { rows } = await pool.query(
        'SELECT module_id, completed FROM cloud_progress WHERE user_id = $1',
        [userId],
      )
      return Object.fromEntries(rows.map((r) => [r.module_id, r.completed]))
    },

    async setProgress(userId, moduleId, completed) {
      await pool.query(
        `INSERT INTO cloud_progress (user_id, module_id, completed, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, module_id) DO UPDATE SET completed = $3, updated_at = now()`,
        [userId, moduleId, JSON.stringify(completed)],
      )
    },

    async createExam(row) {
      await pool.query(
        `INSERT INTO exam_sessions (id, user_id, exam_type, status, source, questions, total)
         VALUES ($1, $2, $3, 'active', $4, $5, $6)`,
        [row.id, row.userId, row.examType, row.source, JSON.stringify(row.questions), row.total],
      )
    },

    async getExam(id) {
      const { rows } = await pool.query('SELECT * FROM exam_sessions WHERE id = $1', [id])
      if (!rows[0]) return null
      const r = rows[0]
      return {
        id: r.id,
        userId: r.user_id,
        examType: r.exam_type,
        status: r.status,
        source: r.source,
        questions: r.questions,
        answers: r.answers,
        score: r.score,
        total: r.total,
        feedback: r.feedback,
        createdAt: r.created_at,
        completedAt: r.completed_at,
      }
    },

    async completeExam(id, { answers, score, feedback }) {
      await pool.query(
        `UPDATE exam_sessions
         SET status = 'completed', answers = $2, score = $3, feedback = $4, completed_at = now()
         WHERE id = $1`,
        [id, JSON.stringify(answers), score, JSON.stringify(feedback)],
      )
    },

    async listExams(userId, limit = 10) {
      const { rows } = await pool.query(
        `SELECT id, exam_type, status, source, score, total, created_at
         FROM exam_sessions WHERE user_id = $1 AND status = 'completed'
         ORDER BY created_at DESC LIMIT $2`,
        [userId, limit],
      )
      return rows.map((r) => ({
        id: r.id,
        examType: r.exam_type,
        source: r.source,
        score: r.score,
        total: r.total,
        createdAt: r.created_at,
      }))
    },
  }
}

// ---------- In-memory fallback ----------

function memoryStore() {
  const progress = new Map() // `${userId}` -> { moduleId: [ids] }
  const exams = new Map() // id -> row

  return {
    kind: 'memory',

    async getProgress(userId) {
      return progress.get(userId) || {}
    },

    async setProgress(userId, moduleId, completed) {
      const cur = progress.get(userId) || {}
      cur[moduleId] = completed
      progress.set(userId, cur)
    },

    async createExam(row) {
      exams.set(row.id, { ...row, status: 'active', createdAt: new Date().toISOString() })
    },

    async getExam(id) {
      return exams.get(id) || null
    },

    async completeExam(id, { answers, score, feedback }) {
      const row = exams.get(id)
      if (!row) return
      Object.assign(row, {
        status: 'completed',
        answers,
        score,
        feedback,
        completedAt: new Date().toISOString(),
      })
    },

    async listExams(userId, limit = 10) {
      return [...exams.values()]
        .filter((r) => r.userId === userId && r.status === 'completed')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          examType: r.examType,
          source: r.source,
          score: r.score,
          total: r.total,
          createdAt: r.createdAt,
        }))
    },
  }
}

// ---------- Init ----------

export async function initStore() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.log('[db] DATABASE_URL not set — using in-memory store (data resets on restart)')
    return memoryStore()
  }
  try {
    const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 4000 })
    await pool.query(SCHEMA)
    console.log('[db] Connected to Postgres, schema ready')
    return pgStore(pool)
  } catch (err) {
    console.warn(`[db] Postgres unavailable (${err.message}) — falling back to in-memory store`)
    return memoryStore()
  }
}
