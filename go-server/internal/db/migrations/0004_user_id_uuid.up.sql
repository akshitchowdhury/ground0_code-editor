-- Backfill real accounts for the legacy free-text user_id columns, then
-- convert cloud_progress / exam_sessions to proper UUID foreign keys.
--
--  * email-keyed rows (user.email was used as the id) get a users row
--    created for them and are re-pointed at users.id
--  * anon-xxxx rows are dropped: backend sync is auth-only from Phase 3 on,
--    guests are local-only (localStorage has always been their source of
--    truth — api.js syncs were best-effort)
--  * exam_sessions.user_id becomes NULLABLE so guests can still take exams
--    (a NULL-user session has no history, which matches guest = local-only)

-- 1. Create accounts for every email-shaped user_id seen so far.
INSERT INTO users (email)
SELECT DISTINCT user_id FROM (
  SELECT user_id FROM cloud_progress WHERE position('@' IN user_id) > 1
  UNION
  SELECT user_id FROM exam_sessions WHERE position('@' IN user_id) > 1
) legacy
ON CONFLICT (email) DO NOTHING;

-- 2. Re-point their rows at the new users.id.
UPDATE cloud_progress cp SET user_id = u.id::text FROM users u WHERE cp.user_id = u.email;
UPDATE exam_sessions es SET user_id = u.id::text FROM users u WHERE es.user_id = u.email;

-- 3. Drop rows that can't be attributed to an account (anon ids).
DELETE FROM cloud_progress
WHERE user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM exam_sessions
WHERE user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Convert to UUID + foreign keys.
ALTER TABLE cloud_progress
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE cloud_progress
  ADD CONSTRAINT cloud_progress_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE exam_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE exam_sessions
  ALTER COLUMN user_id TYPE UUID USING NULLIF(user_id, '')::uuid;
ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
