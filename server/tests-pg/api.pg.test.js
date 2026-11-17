import pg from 'pg';
import request from 'supertest';
import sharp from 'sharp';
import { describe, it, expect, inject, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { __setPool } from '../db/pool.js';
import { runMigrations } from '../db/migrate.js';
import { seedCategories, seedUsers, seedArticles } from '../scripts/seed.js';
import { testLogLines } from '../lib/logger.js';

const quiet = () => {};
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
let pool;
let app;
let adminToken;
let memberToken;
let ids; // slug -> id

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: inject('pgUrls').api, max: 5 });
  __setPool(pool);
  await runMigrations(pool, { log: quiet });
  await seedCategories(pool, quiet);
  await seedUsers(pool, quiet);
  await seedArticles(pool, quiet);
  app = createApp();
  const a = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin123' });
  expect(a.status).toBe(200);
  adminToken = a.body.token;
  const m = await request(app).post('/api/auth/login').send({ email: 'some@gmail.com', password: 'ppond333' });
  expect(m.status).toBe(200);
  memberToken = m.body.token;
  ids = Object.fromEntries((await pool.query('SELECT slug, id FROM articles')).rows.map((r) => [r.slug, r.id]));
});

afterAll(async () => {
  __setPool(null);
  await pool.end();
});

describe('auth', () => {
  it('register, login, profile, wrong password', async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ fullName: 'PG Person', username: 'pgperson', email: 'PG@Example.com', password: 'Passw0rd!' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('pg@example.com');
    const me = await request(app).get('/api/profile').set(bearer(reg.body.token));
    expect(me.status).toBe(200);
    expect(me.body.password_hash).toBeUndefined();
    const bad = await request(app).post('/api/auth/login').send({ email: 'pg@example.com', password: 'nope-nope' });
    expect(bad.status).toBe(401);
    const dup = await request(app).post('/api/auth/register')
      .send({ fullName: 'X', username: 'other', email: 'pg@EXAMPLE.com', password: 'Passw0rd!' });
    expect(dup.status).toBe(400);
  });

  it('forgot / reset token flow is single-use', async () => {
    testLogLines.length = 0;
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'pg@example.com' });
    expect(res.status).toBe(200);
    const line = testLogLines.find((l) => l.includes('resetLink'));
    const token = /reset-password\/([a-f0-9]{64})/.exec(line)[1];
    const ok = await request(app).post('/api/auth/reset-password-token').send({ token, newPassword: 'Changed123' });
    expect(ok.status).toBe(200);
    const again = await request(app).post('/api/auth/reset-password-token').send({ token, newPassword: 'Changed456' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('INVALID_RESET_TOKEN');
    const login = await request(app).post('/api/auth/login').send({ email: 'pg@example.com', password: 'Changed123' });
    expect(login.status).toBe(200);
  });
});

describe('articles: admin CRUD with Phase-4 fields', () => {
  let createdId;
  const specs = { power_hp: 500, torque_nm: 600, zero_to_100_s: 3.5, drivetrain: 'RWD', year: 2023, model: 'Test' };
  const gallery = [
    { url: 'https://res.cloudinary.com/demo/image/upload/a.webp', caption: 'Front', credit: 'Staff', width: 1600, height: 900 },
    { url: '/uploads/content/b.webp', caption: 'Rear' },
  ];

  it('member gets 403, admin creates via multipart with JSON-string specs/gallery', async () => {
    const forbidden = await request(app).post('/api/articles').set(bearer(memberToken)).send({ title: 'x' });
    expect(forbidden.status).toBe(403);

    const body = `<p>${'fast '.repeat(500)}</p><figure class="align-wide"><img src="/uploads/x.webp" loading="lazy"></figure>`
      + '<iframe src="https://www.youtube.com/embed/abc123"></iframe><iframe src="https://evil.example/embed/x"></iframe>';
    const res = await request(app).post('/api/articles').set(bearer(adminToken))
      .field('title', 'Porsche 911 GT3 Driven')
      .field('content', body)
      .field('category_id', '1')
      .field('status', 'published')
      .field('dek', 'Naturally aspirated joy')
      .field('make', 'Porsche')
      .field('article_type', 'review')
      .field('is_featured', 'true')
      .field('specs', JSON.stringify(specs))
      .field('gallery', JSON.stringify(gallery));
    expect(res.status).toBe(201);
    const a = res.body.article;
    createdId = a.id;
    expect(a).toMatchObject({ dek: 'Naturally aspirated joy', make: 'Porsche', article_type: 'review', is_featured: true, reading_time_min: 3, specs });
    expect(a.gallery).toEqual([
      { ...gallery[0] },
      { url: '/uploads/content/b.webp', caption: 'Rear', credit: null, width: null, height: null },
    ]);
    expect(a.content).toContain('<iframe src="https://www.youtube.com/embed/abc123" allowfullscreen></iframe>');
    expect(a.content).not.toContain('evil.example');
    expect(a.content).toContain('class="align-wide"');
    expect('author_avatar_url' in a).toBe(true);
  });

  it('update replaces gallery atomically, clears specs, validates', async () => {
    const bad = await request(app).put(`/api/articles/${createdId}`).set(bearer(adminToken))
      .send({ specs: { power_hp: -1 } });
    expect(bad.status).toBe(400);
    const badKey = await request(app).put(`/api/articles/${createdId}`).set(bearer(adminToken))
      .send({ specs: { horsepower: 1 } });
    expect(badKey.status).toBe(400);
    const tooMany = await request(app).put(`/api/articles/${createdId}`).set(bearer(adminToken))
      .send({ gallery: Array.from({ length: 31 }, () => ({ url: 'https://x.dev/a.jpg' })) });
    expect(tooMany.status).toBe(400);
    const badType = await request(app).put(`/api/articles/${createdId}`).set(bearer(adminToken)).send({ article_type: 'opinion' });
    expect(badType.status).toBe(400);

    const res = await request(app).put(`/api/articles/${createdId}`).set(bearer(adminToken))
      .send({ gallery: [{ url: 'https://x.dev/only.jpg', caption: 'Only' }], specs: null, make: '', is_featured: false });
    expect(res.status).toBe(200);
    expect(res.body.article.gallery).toEqual([{ url: 'https://x.dev/only.jpg', caption: 'Only', credit: null, width: null, height: null }]);
    expect(res.body.article.specs).toBeNull();
    expect(res.body.article.make).toBeNull();
    expect(res.body.article.is_featured).toBe(false);
    const n = await pool.query('SELECT COUNT(*)::int n FROM article_images WHERE article_id = $1', [createdId]);
    expect(n.rows[0].n).toBe(1);
  });

  it('featured flag does not unset other featured articles', async () => {
    await request(app).put(`/api/articles/${createdId}`).set(bearer(adminToken)).send({ is_featured: true, make: 'Porsche' });
    const featured = await request(app).get('/api/articles?featured=true&limit=50');
    expect(featured.body.articles.map((a) => a.slug)).toEqual(expect.arrayContaining(['porsche-911-gt3-driven', 'mclaren-720s-review']));
  });

  it('detail has specs + gallery; list items carry the new fields', async () => {
    const d = await request(app).get('/api/articles/mclaren-720s-review');
    expect(d.status).toBe(200);
    expect(d.body.data).toMatchObject({ make: 'McLaren', article_type: 'review', is_featured: true, gallery: [] });
    expect(d.body.data.specs).toMatchObject({ power_hp: 710, zero_to_100_s: 2.9, top_speed_kmh: 341 });
    const list = await request(app).get('/api/articles');
    for (const a of list.body.articles) {
      for (const k of ['dek', 'make', 'article_type', 'is_featured', 'reading_time_min', 'author_name', 'author_avatar_url']) {
        expect(k in a).toBe(true);
      }
      expect(a.author_avatar_raw).toBeUndefined();
      expect(a.content).toBeUndefined();
    }
  });

  it('author_avatar_url is absolute', async () => {
    await pool.query(`UPDATE users SET profile_image_url = '/uploads/profiles/p.webp' WHERE email = 'admin@example.com'`);
    const list = await request(app).get('/api/articles?make=porsche');
    expect(list.body.articles[0].author_avatar_url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/uploads\/profiles\/p\.webp$/);
  });

  it('list filters: make (case-insensitive), type, q full-text, q fallback, sort', async () => {
    const mc = await request(app).get('/api/articles?make=mclaren');
    expect(mc.body.articles.map((a) => a.slug).sort()).toEqual(['mclaren-720s-review', 'mclaren-gts-launch']);
    const news = await request(app).get('/api/articles?type=news');
    expect(news.body.articles.map((a) => a.slug)).toEqual(['mclaren-gts-launch']);
    const q = await request(app).get('/api/articles?q=' + encodeURIComponent('urus rear-wheel'));
    expect(q.body.articles.map((a) => a.slug)).toEqual(['lamborghini-urus-review']);
    expect(q.body.pagination.total).toBe(1);
    const fallback = await request(app).get('/api/articles?q=' + encodeURIComponent('!!'));
    expect(fallback.status).toBe(200);
    const noisy = await request(app).get('/api/articles?q=' + encodeURIComponent('"unterminated & | ! ('));
    expect(noisy.status).toBe(200);
    await pool.query(`UPDATE articles SET view_count = 999 WHERE slug = 'lamborghini-urus-review'`);
    const pop = await request(app).get('/api/articles?sort=popular');
    expect(pop.body.articles[0].slug).toBe('lamborghini-urus-review');
    const latest = await request(app).get('/api/articles?sort=latest');
    expect(latest.status).toBe(200);
    expect((await request(app).get('/api/articles?type=opinion')).status).toBe(400);
    expect((await request(app).get('/api/articles?featured=yes')).status).toBe(400);
    expect((await request(app).get('/api/articles?sort=random')).status).toBe(400);
  });

  it('view endpoint increments view_count and article_views_daily once per ip', async () => {
    const id = ids['mclaren-gts-launch'];
    await request(app).post(`/api/articles/${id}/view`).expect(200);
    const second = await request(app).post(`/api/articles/${id}/view`);
    expect(second.body.message).toBe('Already viewed');
    const d = await pool.query('SELECT views FROM article_views_daily WHERE article_id = $1 AND day = CURRENT_DATE', [id]);
    expect(d.rows[0].views).toBe(1);
  });

  it('admin delete cascades gallery', async () => {
    const del = await request(app).delete(`/api/articles/${createdId}`).set(bearer(adminToken));
    expect(del.status).toBe(200);
    const n = await pool.query('SELECT COUNT(*)::int n FROM article_images WHERE article_id = $1', [createdId]);
    expect(n.rows[0].n).toBe(0);
  });
});

describe('comments + categories', () => {
  it('member comments on a published article; reply; list', async () => {
    const id = ids['mclaren-720s-review'];
    const c = await request(app).post(`/api/comments/article/${id}`).set(bearer(memberToken)).send({ content: 'What a car' });
    expect(c.status).toBe(201);
    const r = await request(app).post(`/api/comments/article/${id}`).set(bearer(adminToken))
      .send({ content: 'Thanks!', parent_id: c.body.comment.id });
    expect(r.status).toBe(201);
    const list = await request(app).get(`/api/comments/article/${id}`);
    expect(list.status).toBe(200);
    expect(list.body.comments[0].replies[0].content).toBe('Thanks!');
  });

  it('category delete -> 409 while in use, 200 when free', async () => {
    const used = await request(app).delete('/api/categories/6').set(bearer(adminToken)); // supercars
    expect(used.status).toBe(409);
    expect(used.body.code).toBe('CATEGORY_IN_USE');
    const created = await request(app).post('/api/categories').set(bearer(adminToken)).send({ name: 'Hypercars' });
    const del = await request(app).delete(`/api/categories/${created.body.id}`).set(bearer(adminToken));
    expect(del.status).toBe(200);
  });
});

describe('Phase-4 endpoints', () => {
  it('GET /api/makes: published only, by count desc', async () => {
    await pool.query(`INSERT INTO articles (title, slug, content, author_id, category_id, status, make)
      VALUES ('Draft Ferrari', 'draft-ferrari', '<p>x</p>', 1, 1, 'draft', 'Ferrari')`);
    const res = await request(app).get('/api/makes');
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual({ make: 'McLaren', count: 2 });
    expect(res.body.map((m) => m.make)).not.toContain('Ferrari');
    expect(res.body.map((m) => m.make)).toEqual(expect.arrayContaining(['Lamborghini', 'Mercedes-AMG']));
  });

  it('GET /api/search: results, facets, filters, validation', async () => {
    const res = await request(app).get('/api/search?q=V8');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(Object.keys(res.body.results[0]).sort()).toEqual(
      ['article_type', 'dek', 'featured_image_url', 'id', 'make', 'published_at', 'reading_time_min', 'slug', 'title'].sort(),
    );
    expect(res.body.facets.makes).toEqual(expect.arrayContaining([{ make: 'McLaren', count: expect.any(Number) }]));
    expect(res.body.facets.types.length).toBeGreaterThan(0);

    const filtered = await request(app).get('/api/search?q=steering&make=McLaren&type=review&limit=1');
    expect(filtered.body.results).toHaveLength(1);
    expect(filtered.body.results[0].slug).toBe('mclaren-720s-review');
    // Facets ignore their own filter: makes facet still lists other makes for type=review.
    expect(filtered.body.facets.makes.map((m) => m.make)).toContain('Lamborghini');

    const empty = await request(app).get('/api/search?q=');
    expect(empty.status).toBe(200);
    expect(empty.body.results.length).toBe(4);
    expect((await request(app).get('/api/search?limit=500')).status).toBe(400);
    expect((await request(app).get('/api/search?type=x')).status).toBe(400);
  });

  it('GET /api/compare', async () => {
    const a = ids['mclaren-720s-review'];
    const b = ids['lamborghini-urus-review'];
    const ok = await request(app).get(`/api/compare?ids=${b},${a}`);
    expect(ok.status).toBe(200);
    expect(ok.body.cars.map((c) => c.article_id)).toEqual([b, a]);
    expect(Object.keys(ok.body.cars[0]).sort()).toEqual(['article_id', 'featured_image_url', 'make', 'slug', 'specs', 'title']);
    expect(ok.body.cars[1].specs.power_hp).toBe(710);

    expect((await request(app).get(`/api/compare?ids=${a}`)).status).toBe(400);
    expect((await request(app).get(`/api/compare?ids=1,2,3,4`)).status).toBe(400);
    expect((await request(app).get(`/api/compare?ids=${a},${a}`)).status).toBe(400);
    expect((await request(app).get('/api/compare')).status).toBe(400);
    const draft = (await pool.query(`SELECT id FROM articles WHERE slug = 'draft-ferrari'`)).rows[0].id;
    const noSpecs = await request(app).get(`/api/compare?ids=${a},${draft}`);
    expect(noSpecs.status).toBe(400);
    expect(noSpecs.body.code).toBe('COMPARE_UNAVAILABLE');
  });

  it('POST /api/newsletter: 201 new, 200 repeat, 400 invalid, 429 after 5/hour', async () => {
    const fresh = createApp(); // own rate-limit counters
    const first = await request(fresh).post('/api/newsletter').send({ email: 'Fan@Example.com' });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ ok: true });
    const repeat = await request(fresh).post('/api/newsletter').send({ email: 'fan@example.com ' });
    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual({ ok: true });
    expect((await request(fresh).post('/api/newsletter').send({ email: 'nope' })).status).toBe(400);
    await request(fresh).post('/api/newsletter').send({ email: 'a@example.com' });
    await request(fresh).post('/api/newsletter').send({ email: 'b@example.com' });
    const limited = await request(fresh).post('/api/newsletter').send({ email: 'c@example.com' });
    expect(limited.status).toBe(429);
    const rows = await pool.query(`SELECT email FROM newsletter_subscribers WHERE lower(email) = 'fan@example.com'`);
    expect(rows.rows).toEqual([{ email: 'fan@example.com' }]);
  });

  it('search is rate limited at 60/min', async () => {
    const fresh = createApp();
    for (let i = 0; i < 60; i++) await request(fresh).get('/api/search?q=a');
    expect((await request(fresh).get('/api/search?q=a')).status).toBe(429);
  });

  it('POST /api/uploads/image: admin only, returns absolute url + dimensions', async () => {
    const png = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#0af' } }).png().toBuffer();
    const member = await request(app).post('/api/uploads/image').set(bearer(memberToken))
      .attach('image', png, { filename: 'a.png', contentType: 'image/png' });
    expect(member.status).toBe(403);
    const res = await request(app).post('/api/uploads/image').set(bearer(adminToken))
      .attach('image', png, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/uploads\/content\/.+\.webp$/);
    expect(res.body).toMatchObject({ width: 2000, height: 1000 });
    const fake = await request(app).post('/api/uploads/image').set(bearer(adminToken))
      .attach('image', Buffer.from('<svg/>'), { filename: 'x.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    expect(fake.body.code).toBe('INVALID_IMAGE');
    const none = await request(app).post('/api/uploads/image').set(bearer(adminToken)).field('x', '1');
    expect(none.status).toBe(400);
  });

  it('GET /api/admin/stats', async () => {
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
    expect((await request(app).get('/api/admin/stats').set(bearer(memberToken))).status).toBe(403);
    await pool.query(
      `INSERT INTO article_views_daily (article_id, day, views) VALUES ($1, CURRENT_DATE - 3, 5), ($1, CURRENT_DATE - 10, 99)`,
      [ids['mclaren-720s-review']],
    );
    const res = await request(app).get('/api/admin/stats').set(bearer(adminToken));
    expect(res.status).toBe(200);
    const s = res.body;
    expect(s.totals).toEqual({
      published: 4,
      drafts: 1,
      comments: 2,
      views: Number((await pool.query('SELECT SUM(view_count)::int s FROM articles')).rows[0].s),
    });
    expect(s.views7d).toHaveLength(7);
    for (const d of s.views7d) expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = (await pool.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') d`)).rows[0].d;
    expect(s.views7d[6]).toEqual({ date: today, views: 1 });
    expect(s.views7d[3].views).toBe(5);
    expect(s.views7d.reduce((n, d) => n + d.views, 0)).toBe(6); // the 10-day-old row is excluded
    expect(s.topArticles[0]).toMatchObject({ slug: 'lamborghini-urus-review', views: 999 });
    expect(s.topArticles.length).toBeLessThanOrEqual(5);
    expect(s.recentComments[0]).toMatchObject({ content: 'Thanks!', article_title: expect.any(String), user_name: 'Admin User' });
    expect(Object.keys(s.recentComments[0]).sort()).toEqual(['article_id', 'article_title', 'content', 'created_at', 'id', 'user_name']);
  });
});

describe('QA fixes on real Postgres (migration 005, has_specs, related, comments paging)', () => {
  it('migration 005 adds seo columns with length checks', async () => {
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'articles' AND column_name IN ('seo_title', 'seo_description') ORDER BY 1`,
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual(['seo_description', 'seo_title']);
    await expect(pool.query(`UPDATE articles SET seo_title = repeat('x', 71) WHERE slug = 'mclaren-720s-review'`))
      .rejects.toThrow(/articles_seo_title_length_check/);
  });

  it('seo fields round-trip through the API and has_specs filters on real PG', async () => {
    const id = ids['mclaren-720s-review'];
    const put = await request(app).put(`/api/articles/${id}`).set(bearer(adminToken))
      .field('seo_title', 'PG SEO Title').field('seo_description', 'PG SEO description');
    expect(put.status).toBe(200);
    const got = await request(app).get('/api/articles/mclaren-720s-review');
    expect(got.body.data).toMatchObject({ seo_title: 'PG SEO Title', seo_description: 'PG SEO description', has_specs: true });

    const spec = await request(app).get('/api/articles?has_specs=true&limit=50');
    expect(spec.status).toBe(200);
    expect(spec.body.articles.length).toBeGreaterThan(0);
    for (const a of spec.body.articles) expect(a.has_specs).toBe(true);
  });

  it('related prefers the same make', async () => {
    const res = await request(app).get('/api/articles/mclaren-720s-review');
    expect(res.body.relatedArticles[0].slug).toBe('mclaren-gts-launch');
    expect(res.body.relatedArticles[0]).toMatchObject({ make: 'McLaren' });
    expect(res.body.relatedArticles[0].author_name).toBeTruthy();
  });

  it('comments list at limit=50 returns total_comments', async () => {
    const id = ids['mclaren-720s-review'];
    const list = await request(app).get(`/api/comments/article/${id}?limit=50`);
    expect(list.status).toBe(200);
    expect(list.body.total_comments).toBeGreaterThanOrEqual(list.body.comments.length);
  });
});
