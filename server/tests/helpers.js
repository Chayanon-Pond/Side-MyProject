import { newDb, DataType } from 'pg-mem';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { __setPool } from '../db/pool.js';
import { signToken } from '../middleware/auth.js';

// pg-mem cannot run plpgsql/triggers/tsvector, so tests use the migrated schema minus those parts
// (search_vector + triggers are covered by the real-Postgres suite: npm run test:pg).
const SCHEMA = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY, full_name VARCHAR(255) NOT NULL, username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user', profile_image_url VARCHAR(500), bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE categories (
  id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL, description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE articles (
  id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, excerpt TEXT,
  content TEXT NOT NULL, author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  featured_image_url VARCHAR(500), featured_image_alt VARCHAR(255), status VARCHAR(20) DEFAULT 'draft',
  view_count INTEGER DEFAULT 0, published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dek TEXT NULL, make TEXT NULL, article_type TEXT NOT NULL DEFAULT 'feature',
  is_featured BOOLEAN NOT NULL DEFAULT false, specs JSONB NULL, reading_time_min INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT NULL, seo_description TEXT NULL);
CREATE TABLE article_images (id SERIAL PRIMARY KEY, article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL, caption TEXT, credit TEXT, width INTEGER, height INTEGER, position INTEGER NOT NULL DEFAULT 0);
CREATE TABLE article_views_daily (article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  day DATE NOT NULL, views INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (article_id, day));
CREATE TABLE newsletter_subscribers (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), confirmed BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE tags (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE article_tags (id SERIAL PRIMARY KEY, article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_article_tag UNIQUE (article_id, tag_id));
CREATE TABLE comments (id SERIAL PRIMARY KEY, article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id INTEGER NULL,
  content TEXT NOT NULL, status VARCHAR(20) DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE password_reset_tokens (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
`;

// Low cost only for fixtures; the app itself always hashes with cost 12.
const FIXTURE_HASH_ROUNDS = 4;

export async function setupDb() {
  const db = newDb();
  db.public.registerFunction({ name: 'random', returns: DataType.float, implementation: Math.random, impure: true });
  db.public.none(SCHEMA);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  __setPool(pool);

  const pw = await bcrypt.hash('Secret123!', FIXTURE_HASH_ROUNDS);
  const admin = (await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, role)
     VALUES ('Admin Person', 'admin1', 'admin@test.dev', $1, 'admin') RETURNING id, username, role`, [pw])).rows[0];
  const member = (await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, role)
     VALUES ('Member Person', 'member1', 'member@test.dev', $1, 'user') RETURNING id, username, role`, [pw])).rows[0];
  const category = (await pool.query(
    "INSERT INTO categories (name, slug) VALUES ('Cars', 'cars') RETURNING id")).rows[0];
  const published = (await pool.query(
    `INSERT INTO articles (title, slug, content, author_id, category_id, status, published_at)
     VALUES ('Published One', 'published-one', '<p>hello</p>', $1, $2, 'published', NOW()) RETURNING id`,
    [admin.id, category.id])).rows[0];
  const draft = (await pool.query(
    `INSERT INTO articles (title, slug, content, author_id, category_id, status)
     VALUES ('Secret Draft', 'secret-draft', '<p>draft</p>', $1, $2, 'draft') RETURNING id`,
    [admin.id, category.id])).rows[0];

  return {
    db,
    pool,
    admin,
    member,
    category,
    published,
    draft,
    adminToken: signToken(admin),
    memberToken: signToken(member),
  };
}

export const bearer = (t) => ({ Authorization: `Bearer ${t}` });

export function expiredToken(user) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, 'test-secret', {
    algorithm: 'HS256',
    expiresIn: -10,
  });
}
