-- Identical DDL to server/db.js's SCHEMA constant, so Express and Go can
-- share one Postgres instance during the incremental cutover.
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
