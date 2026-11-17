#!/usr/bin/env node
/**
 * npm run seed  -> dev/demo data. Create-if-missing only:
 *  - never updates an existing user (an existing password is NEVER reset),
 *  - categories use ON CONFLICT DO NOTHING,
 *  - sample car articles are inserted by slug only if missing; for existing sample slugs only
 *    NULL dek/make/specs are filled. One sample is marked featured only if none is featured.
 * Refuses to run with NODE_ENV=production unless --allow-production is passed.
 *
 * Demo accounts (shown on the public Login / Admin-login / Help pages on purpose):
 *   ADMIN_EMAIL / ADMIN_PASSWORD            (admin)  default chayanon.5723@gmail.com / ppond333
 *   DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD  (admin)  default admin@example.com / admin123
 *   DEMO_USER_EMAIL / DEMO_USER_PASSWORD    (user)   default some@gmail.com / ppond333
 */
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { getPool, closePool } from '../db/pool.js';
import { config } from '../config/env.js';
import { SAMPLE_CATEGORIES, SAMPLE_ARTICLES } from './seed-data.js';
import { readingTimeMin } from '../lib/readingTime.js';

export const DEMO_ACCOUNTS = () => [
  {
    email: process.env.ADMIN_EMAIL || 'chayanon.5723@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'ppond333',
    full_name: 'Chayanon Admin',
    username: 'chayanon',
    role: 'admin',
  },
  {
    email: process.env.DEMO_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.DEMO_ADMIN_PASSWORD || 'admin123',
    full_name: 'Admin User',
    username: 'admin',
    role: 'admin',
  },
  {
    email: process.env.DEMO_USER_EMAIL || 'some@gmail.com',
    password: process.env.DEMO_USER_PASSWORD || 'ppond333',
    full_name: 'Demo User',
    username: 'demo_user',
    role: 'user',
  },
];

async function freeUsername(db, base) {
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i}`;
    const r = await db.query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [candidate]);
    if (r.rows.length === 0) return candidate;
  }
  throw new Error(`No free username for ${base}`);
}

export async function seedUsers(db, log = console.log) {
  for (const acc of DEMO_ACCOUNTS()) {
    const email = acc.email.trim().toLowerCase();
    const exists = await db.query('SELECT id FROM users WHERE lower(email) = $1', [email]);
    if (exists.rows.length > 0) {
      log(`= user ${acc.role} exists, left untouched (id ${exists.rows[0].id})`);
      continue;
    }
    const username = await freeUsername(db, acc.username);
    const hash = await bcrypt.hash(acc.password, config.bcryptRounds);
    const r = await db.query(
      `INSERT INTO users (full_name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [acc.full_name, username, email, hash, acc.role],
    );
    log(`+ created ${acc.role} user id ${r.rows[0].id}`);
  }
}

export async function seedCategories(db, log = console.log) {
  for (const c of SAMPLE_CATEGORIES) {
    await db.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
      [c.name, c.slug, c.description],
    );
  }
  log(`= categories ensured (${SAMPLE_CATEGORIES.length})`);
}

/**
 * Sample car articles, create-if-missing by slug. For sample slugs that already exist, only
 * Phase-4 fields that are still NULL are filled in (nothing is overwritten). One article is
 * marked featured only when no article is featured yet.
 */
export async function seedArticles(db, log = console.log) {
  const admin = await db.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const anyCat = await db.query('SELECT id FROM categories ORDER BY id LIMIT 1');
  if (!anyCat.rows[0] || !admin.rows[0]) {
    log('! no category/admin, sample articles skipped');
    return;
  }
  let inserted = 0;
  for (const a of SAMPLE_ARTICLES) {
    const cat = await db.query('SELECT id FROM categories WHERE slug = $1', [a.category_slug]);
    const categoryId = cat.rows[0]?.id ?? anyCat.rows[0].id;
    const r = await db.query(
      `INSERT INTO articles (title, slug, excerpt, content, status, category_id, author_id,
         featured_image_alt, published_at, dek, make, article_type, specs, reading_time_min)
       VALUES ($1, $2, $3, $4, 'published', $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11::jsonb, $12)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [a.title, a.slug, a.excerpt, a.content, categoryId, admin.rows[0].id, a.featured_image_alt,
        a.dek, a.make, a.article_type, JSON.stringify(a.specs), readingTimeMin(a.content)],
    );
    if (r.rows.length > 0) {
      inserted += 1;
    } else {
      await db.query(
        `UPDATE articles SET
           dek = COALESCE(dek, $2), make = COALESCE(make, $3), specs = COALESCE(specs, $4::jsonb)
         WHERE slug = $1 AND (dek IS NULL OR make IS NULL OR specs IS NULL)`,
        [a.slug, a.dek, a.make, JSON.stringify(a.specs)],
      );
    }
  }
  const featured = SAMPLE_ARTICLES.find((a) => a.is_featured);
  const hasFeatured = await db.query('SELECT 1 FROM articles WHERE is_featured = true LIMIT 1');
  if (featured && hasFeatured.rows.length === 0) {
    await db.query('UPDATE articles SET is_featured = true WHERE slug = $1', [featured.slug]);
  }
  log(inserted ? `+ inserted ${inserted} sample articles` : '= sample articles exist, missing fields filled only');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (config.isProduction && !process.argv.includes('--allow-production')) {
    console.error('Refusing to seed with NODE_ENV=production (pass --allow-production to override; it is create-if-missing only).');
    process.exit(1);
  }
  const db = getPool();
  try {
    await seedCategories(db);
    await seedUsers(db);
    await seedArticles(db);
    console.log('Seed complete');
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  }
}
