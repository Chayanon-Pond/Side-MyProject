-- 002_improvements: additive changes that are safe on existing data.

-- 1) Allow 'archived' in articles.status (replace whichever CHECK on status exists).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
    WHERE t.relname = 'articles' AND nsp.nspname = current_schema()
      AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE articles DROP CONSTRAINT %I', r.conname);
  END LOOP;
  ALTER TABLE articles ADD CONSTRAINT articles_status_check
    CHECK (status IN ('draft', 'published', 'archived')) NOT VALID;  -- existing rows are not rescanned
END $$;

-- 2) Composite indexes matching the hot queries.
CREATE INDEX IF NOT EXISTS idx_comments_article_status_created
  ON comments (article_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status_published
  ON articles (status, published_at DESC);

-- 3) Case-insensitive unique email, only when existing data allows it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users GROUP BY lower(email) HAVING COUNT(*) > 1) THEN
    RAISE NOTICE 'Skipping users_email_lower_unique: duplicate emails (case-insensitive) exist';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));
  END IF;
END $$;

-- 4) Some older DBs created notifications.data as JSON (setup-notifications.sql);
--    the API writes jsonb. Converting json -> jsonb is lossless for valid JSON.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'notifications'
      AND column_name = 'data' AND data_type = 'json'
  ) THEN
    ALTER TABLE notifications ALTER COLUMN data TYPE JSONB USING data::jsonb;
    ALTER TABLE notifications ALTER COLUMN data SET DEFAULT '{}'::jsonb;
  END IF;
END $$;
