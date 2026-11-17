-- 005_seo_and_bio: editor-controlled search appearance per article, and a short author bio.
-- Additive only: new nullable columns and CHECK constraints that every existing row passes
-- (NULL is allowed, and the limits match the API validation: 70 / 160 / 280 characters).

ALTER TABLE articles ADD COLUMN IF NOT EXISTS seo_title TEXT NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS seo_description TEXT NULL;

-- users.bio already exists on databases created from 001_baseline; this keeps older ones in line.
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'articles'::regclass AND conname = 'articles_seo_title_length_check'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_seo_title_length_check
      CHECK (seo_title IS NULL OR char_length(seo_title) <= 70);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'articles'::regclass AND conname = 'articles_seo_description_length_check'
  ) THEN
    ALTER TABLE articles ADD CONSTRAINT articles_seo_description_length_check
      CHECK (seo_description IS NULL OR char_length(seo_description) <= 160);
  END IF;
  -- Existing bios may be longer than the new 280-character API limit, so the column keeps no
  -- length constraint; the API enforces 280 on every write.
END $$;

-- Compare candidates: "published and has a spec sheet" is a frequent filter (has_specs=true).
CREATE INDEX IF NOT EXISTS idx_articles_has_specs_published
  ON articles (published_at DESC)
  WHERE specs IS NOT NULL AND status = 'published';
