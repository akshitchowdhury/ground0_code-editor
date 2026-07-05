ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_user_fk;
ALTER TABLE exam_sessions ALTER COLUMN user_id TYPE TEXT USING COALESCE(user_id::text, '');
ALTER TABLE cloud_progress DROP CONSTRAINT IF EXISTS cloud_progress_user_fk;
ALTER TABLE cloud_progress ALTER COLUMN user_id TYPE TEXT USING user_id::text;
