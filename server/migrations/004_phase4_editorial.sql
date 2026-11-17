-- 004_phase4_editorial: editorial metadata, specs, gallery, full-text search, daily views,
-- newsletter. Additive only: every new column is nullable or has a default, nothing is
-- dropped or rewritten except the derived columns (search_vector, reading_time_min), which
-- are backfilled without touching updated_at.

-- 1) New article columns ------------------------------------------------------------------
ALTER TABLE articles ADD COLUMN IF NOT EXISTS dek TEXT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS make TEXT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS article_type TEXT NOT NULL DEFAULT 'feature';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS specs JSONB NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reading_time_min INTEGER NOT NULL DEFAULT 1;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'articles'::regclass AND conname = 'articles_article_type_check'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_article_type_check
      CHECK (article_type IN ('review', 'news', 'feature'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'articles'::regclass AND conname = 'articles_specs_object_check'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_specs_object_check
      CHECK (specs IS NULL OR jsonb_typeof(specs) = 'object');
  END IF;
END $$;

-- 2) Derived values: plain text, reading time (words/220, ceil, min 1), search vector ---------
CREATE OR REPLACE FUNCTION article_plain_text(html TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           regexp_replace(COALESCE(html, ''), '<[^>]*>', ' ', 'g'),
           '&[a-zA-Z0-9#]+;', ' ', 'g')
$$;

CREATE OR REPLACE FUNCTION article_reading_time(html TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(1, CEIL(
    COALESCE(array_length(regexp_split_to_array(btrim(article_plain_text(html)), '\s+'), 1), 0) / 220.0
  ))::INTEGER
$$;

CREATE OR REPLACE FUNCTION article_search_vector(p_title TEXT, p_dek TEXT, p_content TEXT, p_make TEXT)
RETURNS tsvector LANGUAGE sql IMMUTABLE AS $$
  SELECT setweight(to_tsvector('simple', COALESCE(p_title, '')), 'A')
      || setweight(to_tsvector('simple', COALESCE(p_make, '')), 'A')
      || setweight(to_tsvector('simple', COALESCE(p_dek, '')), 'B')
      || setweight(to_tsvector('simple', article_plain_text(p_content)), 'C')
$$;

CREATE OR REPLACE FUNCTION articles_derived_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := article_search_vector(NEW.title, NEW.dek, NEW.content, NEW.make);
  NEW.reading_time_min := article_reading_time(NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_derived_columns_trg ON articles;
CREATE TRIGGER articles_derived_columns_trg
  BEFORE INSERT OR UPDATE OF title, dek, content, make ON articles
  FOR EACH ROW EXECUTE FUNCTION articles_derived_columns();

-- Backfill existing rows without bumping updated_at (that trigger is paused only inside
-- this migration's transaction).
ALTER TABLE articles DISABLE TRIGGER update_articles_updated_at;
UPDATE articles
   SET search_vector = article_search_vector(title, dek, content, make),
       reading_time_min = article_reading_time(content)
 WHERE search_vector IS NULL;
ALTER TABLE articles ENABLE TRIGGER update_articles_updated_at;

-- 3) Indexes --------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_make ON articles (make);
CREATE INDEX IF NOT EXISTS idx_articles_article_type ON articles (article_type);
CREATE INDEX IF NOT EXISTS idx_articles_featured_published ON articles (is_featured, published_at DESC);

-- 4) Gallery ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_images (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  credit TEXT,
  width INTEGER,
  height INTEGER,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_article_images_article_position ON article_images (article_id, position);

-- 5) Daily views (for the admin 7-day chart) -------------------------------------------------
CREATE TABLE IF NOT EXISTS article_views_daily (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, day)
);
CREATE INDEX IF NOT EXISTS idx_article_views_daily_day ON article_views_daily (day);

-- 6) Newsletter (plain TEXT + unique lower(email); no citext extension needed) ----------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_lower_key
  ON newsletter_subscribers (lower(email));
