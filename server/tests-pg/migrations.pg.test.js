import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { describe, it, expect, inject, afterAll } from 'vitest';
import { runMigrations, listMigrationFiles, MIGRATIONS_DIR } from '../db/migrate.js';
import { seedCategories, seedUsers, seedArticles } from '../scripts/seed.js';
import { SAMPLE_ARTICLES } from '../scripts/seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGACY = path.join(__dirname, 'fixtures', 'legacy');
const urls = inject('pgUrls');
const pools = [];
const open = (url) => {
  const p = new pg.Pool({ connectionString: url, max: 3 });
  pools.push(p);
  return p;
};
afterAll(async () => {
  await Promise.all(pools.map((p) => p.end()));
});
const quiet = () => {};

async function seedAll(db) {
  await seedCategories(db, quiet);
  await seedUsers(db, quiet);
  await seedArticles(db, quiet);
}

describe('fresh database', () => {
  it('applies every migration, is idempotent on re-run and on raw re-execution', async () => {
    const db = open(urls.fresh);
    const files = await listMigrationFiles();
    expect(await runMigrations(db, { log: quiet })).toEqual(files);
    expect(await runMigrations(db, { log: quiet })).toEqual([]);

    // Stronger: execute every file again, bypassing schema_migrations. Must not fail.
    const client = await db.connect();
    try {
      for (const f of files) {
        const sql = await fs.readFile(path.join(MIGRATIONS_DIR, f), 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`re-running ${f} failed: ${err.message}`);
        }
      }
    } finally {
      client.release();
    }
  });

  it('seed runs twice without duplicates and fills Phase-4 fields', async () => {
    const db = open(urls.fresh);
    await seedAll(db);
    await seedAll(db);
    const users = await db.query('SELECT lower(email) e, COUNT(*)::int n FROM users GROUP BY 1 HAVING COUNT(*) > 1');
    expect(users.rows).toEqual([]);
    const arts = await db.query(
      'SELECT slug, make, article_type, is_featured, specs, dek, reading_time_min, search_vector IS NOT NULL AS has_sv FROM articles ORDER BY id',
    );
    expect(arts.rows.map((r) => r.slug)).toEqual(SAMPLE_ARTICLES.map((a) => a.slug));
    expect(arts.rows.filter((r) => r.is_featured)).toHaveLength(1);
    for (const r of arts.rows) {
      expect(r.make).toBeTruthy();
      expect(r.dek).toBeTruthy();
      expect(r.specs.power_hp).toBeGreaterThan(0);
      expect(r.has_sv).toBe(true);
      expect(r.reading_time_min).toBeGreaterThanOrEqual(1);
    }
    expect(arts.rows.find((r) => r.slug === 'mclaren-720s-review').specs).toMatchObject({ power_hp: 710, top_speed_kmh: 341 });
  });

  it('trigger keeps search_vector / reading_time_min in sync; CHECKs enforced', async () => {
    const db = open(urls.fresh);
    const words = Array.from({ length: 450 }, (_, i) => `word${i}`).join(' ');
    await db.query(`UPDATE articles SET content = $1, make = 'Zonda' WHERE slug = 'mclaren-gts-launch'`, [`<p>${words}</p>`]);
    const r = await db.query(
      `SELECT reading_time_min, search_vector @@ websearch_to_tsquery('simple', 'zonda word77') AS hit
       FROM articles WHERE slug = 'mclaren-gts-launch'`,
    );
    expect(r.rows[0]).toEqual({ reading_time_min: 3, hit: true }); // 450 / 220 -> 3
    await expect(db.query(`UPDATE articles SET article_type = 'opinion' WHERE id = 1`)).rejects.toThrow(/article_type_check/);
    await expect(db.query(`UPDATE articles SET specs = '[1]'::jsonb WHERE id = 1`)).rejects.toThrow(/specs_object_check/);
    await expect(db.query(`UPDATE articles SET status = 'bogus' WHERE id = 1`)).rejects.toThrow(/status_check/);
  });
});

// ---------------------------------------------------------------------------------------
// "Existing prod DB": build the OLD schema exactly as the old server did, put data in it,
// then run the migrations and assert nothing pre-existing changed.
// ---------------------------------------------------------------------------------------
async function runLegacy(db, file) {
  await db.query(await fs.readFile(path.join(LEGACY, file), 'utf8'));
}

const SNAPSHOT_QUERIES = {
  users: 'SELECT id, full_name, username, email, password_hash, role, profile_image_url, bio, created_at, updated_at FROM users ORDER BY id',
  categories: 'SELECT id, name, slug, description, created_at, updated_at FROM categories ORDER BY id',
  articles: `SELECT id, title, slug, excerpt, content, author_id, category_id, featured_image_url, featured_image_alt,
               status, view_count, published_at, created_at, updated_at FROM articles ORDER BY id`,
  tags: 'SELECT * FROM tags ORDER BY id',
  article_tags: 'SELECT * FROM article_tags ORDER BY id',
  comments: 'SELECT * FROM comments ORDER BY id',
  notifications: 'SELECT id, user_id, type, title, message, data::text AS data, is_read, created_at, updated_at FROM notifications ORDER BY id',
};

async function snapshot(db) {
  const out = {};
  for (const [k, sql] of Object.entries(SNAPSHOT_QUERIES)) out[k] = (await db.query(sql)).rows;
  return out;
}

describe('existing (legacy) production-shaped database', () => {
  it('migrates in place with every existing row intact', async () => {
    const db = open(urls.legacy);

    // Old schema, in the order the old setup scripts / boot code applied it.
    await runLegacy(db, 'setup-tables.sql');
    await runLegacy(db, 'update-users-table.sql');
    await runLegacy(db, 'setup_admin.sql'); // inserts the old admin row (id 1)
    await runLegacy(db, 'setup-comments.sql');
    // Oldest notifications table had no data column; setup-notifications.sql then adds it as JSON.
    await db.query('ALTER TABLE notifications DROP COLUMN data');
    await db.query(`INSERT INTO users (full_name, username, email, password_hash, role)
      VALUES ('Writer Two', 'writer2', 'Writer2@Example.com', 'h2', 'user'),
             ('Reader Three', 'reader3', 'reader3@example.com', 'h3', 'user')`);
    await runLegacy(db, 'setup-notifications.sql'); // inserts sample notifications for user 3
    await runLegacy(db, 'boot-ddl.sql');

    const legacyDataType = await db.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data'`,
    );
    expect(legacyDataType.rows[0].data_type).toBe('json');

    // Realistic data.
    await db.query(`INSERT INTO categories (name, slug, description) VALUES ('Supercars', 'supercars', 'Fast'), ('EV', 'ev', NULL)`);
    await db.query(`INSERT INTO articles (title, slug, excerpt, content, author_id, category_id, featured_image_url, status, view_count, published_at)
      VALUES ('Old McLaren piece', 'old-mclaren', 'ex', '<p>The McLaren F1 was a legend &amp; still is.</p>', 1, 1, '/uploads/articles/a.jpg', 'published', 42, NOW() - INTERVAL '30 days'),
             ('Draft EV', 'draft-ev', NULL, '<p>draft</p>', 2, 2, NULL, 'draft', 0, NULL)`);
    await db.query(`INSERT INTO tags (name, slug) VALUES ('mclaren', 'mclaren')`);
    await db.query(`INSERT INTO article_tags (article_id, tag_id) VALUES (1, 1)`);
    await db.query(`INSERT INTO comments (article_id, user_id, content) VALUES (1, 3, 'Great read')`);
    await db.query(`INSERT INTO comments (article_id, user_id, parent_id, content) VALUES (1, 2, 1, 'Agreed')`);
    // Make updated_at distinct from "now" so an accidental bump would be visible.
    await db.query(`ALTER TABLE articles DISABLE TRIGGER update_articles_updated_at`);
    await db.query(`UPDATE articles SET updated_at = '2024-01-02 03:04:05'`);
    await db.query(`ALTER TABLE articles ENABLE TRIGGER update_articles_updated_at`);

    const before = await snapshot(db);
    expect(before.notifications.length).toBeGreaterThan(0);

    const files = await listMigrationFiles();
    expect(await runMigrations(db, { log: quiet })).toEqual(files);
    expect(await runMigrations(db, { log: quiet })).toEqual([]);

    const after = await snapshot(db);
    // json -> jsonb may normalise whitespace/key order of notification payloads; compare parsed.
    const norm = (s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, data: n.data == null ? null : JSON.parse(n.data) })) });
    expect(norm(after)).toEqual(norm(before));

    // New structure is in place and derived columns were backfilled.
    const arts = await db.query(
      `SELECT slug, article_type, is_featured, dek, make, specs, reading_time_min,
              search_vector @@ websearch_to_tsquery('simple', 'mclaren legend') AS hit
       FROM articles ORDER BY id`,
    );
    expect(arts.rows[0]).toMatchObject({ slug: 'old-mclaren', article_type: 'feature', is_featured: false, dek: null, make: null, specs: null, reading_time_min: 1, hit: true });
    const dataType = await db.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data'`,
    );
    expect(dataType.rows[0].data_type).toBe('jsonb');
    await db.query(`UPDATE articles SET status = 'archived' WHERE slug = 'draft-ev'`);
    for (const t of ['article_images', 'article_views_daily', 'newsletter_subscribers', 'password_reset_tokens']) {
      const r = await db.query('SELECT to_regclass($1) AS t', [t]);
      expect(r.rows[0].t).toBe(t);
    }
    const idx = await db.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'articles'`);
    expect(idx.rows.map((r) => r.indexname)).toEqual(expect.arrayContaining([
      'idx_articles_search_vector', 'idx_articles_make', 'idx_articles_article_type', 'idx_articles_featured_published',
    ]));
    const emailIdx = await db.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_lower_unique'`);
    expect(emailIdx.rows).toHaveLength(1);

    // Seeding on top of the legacy DB is also create-if-missing and repeatable.
    await seedAll(db);
    await seedAll(db);
    const old = await db.query(`SELECT title, updated_at FROM articles WHERE slug = 'old-mclaren'`);
    expect(old.rows[0].title).toBe('Old McLaren piece');
    expect(old.rows[0].updated_at.toISOString()).toBe(before.articles[0].updated_at.toISOString());
  });
});
