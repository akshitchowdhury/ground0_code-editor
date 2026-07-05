-- Cloud + Agent Studio reference/pricing data — was hardcoded in
-- src/lib/cloud/specs.js and src/data/cloud/agentComponents.js (MODELS).
-- Moved to Postgres so it's editable data, not compiled constants; the Go
-- backend caches reads in front of these tables (see internal/cache and
-- internal/studio/*/specs_repo.go).

CREATE TABLE IF NOT EXISTS studio_instance_types (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  rps        INTEGER NOT NULL,
  hourly_usd NUMERIC(10,4) NOT NULL,
  note       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS studio_db_classes (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  qps        INTEGER NOT NULL,
  hourly_usd NUMERIC(10,4) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS studio_cache_types (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  hourly_usd NUMERIC(10,4) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Single-row-per-key generic pricing/behavioral constants — avoids a schema
-- migration every time a single number (e.g. cacheHitRatio) changes.
CREATE TABLE IF NOT EXISTS studio_constants (
  key   TEXT PRIMARY KEY,
  value NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS studio_agent_models (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  tier       TEXT NOT NULL,
  reasoning  INTEGER NOT NULL,
  cost_per_1k NUMERIC(10,4) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Seed data — verbatim from specs.js / agentComponents.js at the time of the
-- Go migration, so behavior doesn't change on cutover. ON CONFLICT DO NOTHING
-- keeps this migration idempotent/re-runnable.

INSERT INTO studio_instance_types (id, label, rps, hourly_usd, note, sort_order) VALUES
  ('t3.micro',   't3.micro',   250,  0.0104, 'burstable, dev-size', 0),
  ('t3.small',   't3.small',   500,  0.0208, 'burstable', 1),
  ('t3.medium',  't3.medium',  1000, 0.0416, 'burstable', 2),
  ('t3.large',   't3.large',   2000, 0.0832, 'burstable', 3),
  ('m5.large',   'm5.large',   3000, 0.096,  'general purpose', 4),
  ('m5.xlarge',  'm5.xlarge',  6000, 0.192,  'general purpose', 5),
  ('c5.large',   'c5.large',   4000, 0.085,  'compute optimized', 6),
  ('c5.xlarge',  'c5.xlarge',  8000, 0.17,   'compute optimized', 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO studio_db_classes (id, label, qps, hourly_usd, sort_order) VALUES
  ('db.t3.micro',   'db.t3.micro',   400,   0.017, 0),
  ('db.t3.medium',  'db.t3.medium',  1500,  0.068, 1),
  ('db.r5.large',   'db.r5.large',   6000,  0.24,  2),
  ('db.r5.xlarge',  'db.r5.xlarge',  12000, 0.48,  3),
  ('db.r5.2xlarge', 'db.r5.2xlarge', 24000, 0.96,  4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO studio_cache_types (id, label, hourly_usd, sort_order) VALUES
  ('cache.t3.micro', 'cache.t3.micro', 0.017, 0),
  ('cache.r5.large', 'cache.r5.large', 0.21,  1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO studio_constants (key, value) VALUES
  ('hoursPerMonth', 730),
  ('secondsPerMonth', 2592000),
  ('cacheHitRatio', 0.8),
  ('cdnOffload', 0.45),
  ('baseLatencyMs', 35),
  ('albMonthly', 16.43),
  ('albPerMillionReq', 0.008),
  ('natMonthly', 32.4),
  ('natPerMillionReq', 0.6),
  ('apigwPerMillionReq', 3.5),
  ('cdnPerMillionReq', 0.9),
  ('wafMonthly', 5.0),
  ('wafPerMillionReq', 0.6),
  ('lambdaPerMillionReq', 0.6),
  ('dynamoPerMillionReq', 1.25),
  ('s3Monthly', 1.5),
  ('s3PerMillionReq', 0.4),
  ('sqsPerMillionReq', 0.4),
  ('dnsMonthly', 0.5),
  ('dnsPerMillionReq', 0.4)
ON CONFLICT (key) DO NOTHING;

INSERT INTO studio_agent_models (id, label, tier, reasoning, cost_per_1k, sort_order) VALUES
  ('gpt-4o',       'GPT-4o',                 'frontier', 5, 0.0075, 0),
  ('claude-sonnet','Claude Sonnet',          'frontier', 5, 0.009,  1),
  ('llama-70b',    'Llama 3.1 70B (OSS)',    'mid',      4, 0.0009, 2),
  ('gpt-4o-mini',  'GPT-4o mini',            'small',    3, 0.0004, 3),
  ('llama-8b',     'Llama 3.1 8B (OSS)',     'small',    2, 0.0002, 4)
ON CONFLICT (id) DO NOTHING;
