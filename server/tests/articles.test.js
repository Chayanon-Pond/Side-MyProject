import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../app.js';
import { setupDb, bearer } from './helpers.js';

let ctx;
let app;

beforeEach(async () => {
  ctx = await setupDb();
  app = createApp();
});

const deepKeys = (obj, acc = []) => {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      acc.push(k);
      deepKeys(v, acc);
    }
  }
  return acc;
};

describe('requireRole on article writes', () => {
  it('anonymous POST /api/articles -> 401', async () => {
    const res = await request(app).post('/api/articles').field('title', 'x');
    expect(res.status).toBe(401);
  });

  it('member POST /api/articles -> 403', async () => {
    const res = await request(app).post('/api/articles').set(bearer(ctx.memberToken))
      .field('title', 'x').field('content', '<p>x</p>').field('category_id', String(ctx.category.id));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('member PUT / DELETE -> 403', async () => {
    const put = await request(app).put(`/api/articles/${ctx.published.id}`).set(bearer(ctx.memberToken)).field('title', 'hacked');
    expect(put.status).toBe(403);
    const del = await request(app).delete(`/api/articles/${ctx.published.id}`).set(bearer(ctx.memberToken));
    expect(del.status).toBe(403);
  });

  it('member cannot create categories or notifications', async () => {
    const cat = await request(app).post('/api/categories').set(bearer(ctx.memberToken)).send({ name: 'Nope' });
    expect(cat.status).toBe(403);
    const notif = await request(app).post('/api/notifications').set(bearer(ctx.memberToken))
      .send({ user_id: ctx.admin.id, type: 'system', title: 't', message: 'm' });
    expect(notif.status).toBe(403);
  });
});

describe('article create/update sanitizes HTML', () => {
  it('admin create strips <script>, onerror and javascript: URLs; publish fans out notifications', async () => {
    const evil = '<h2>Hi</h2><script>alert(1)</script><img src="x.png" onerror="alert(2)">'
      + '<a href="javascript:alert(3)">bad</a><a href="https://ok.example">ok</a><p onclick="x()">para</p>';
    const res = await request(app).post('/api/articles').set(bearer(ctx.adminToken))
      .field('title', 'Brand New Car').field('content', evil)
      .field('category_id', String(ctx.category.id)).field('status', 'published').field('tags', 'ev, Sports , ev');
    expect(res.status).toBe(201);
    const html = res.body.article.content;
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/alert\(1\)/);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).toContain('<h2>Hi</h2>');
    expect(html).toContain('href="https://ok.example"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(res.body.article.slug).toBe('brand-new-car');
    expect(res.body.article.tags.sort()).toEqual(['Sports', 'ev'].sort());

    const notes = await ctx.pool.query('SELECT user_id FROM notifications WHERE type = $1', ['article_published']);
    expect(notes.rows.map((r) => r.user_id)).toEqual([ctx.member.id]); // everyone except author
  });

  it('admin update sanitizes content too', async () => {
    const res = await request(app).put(`/api/articles/${ctx.published.id}`).set(bearer(ctx.adminToken))
      .field('content', '<p>ok</p><iframe src="https://evil"></iframe><script>x</script>');
    expect(res.status).toBe(200);
    expect(res.body.article.content).toBe('<p>ok</p>');
  });

  it('admin create with an uploaded image stores a re-encoded webp', async () => {
    const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#f00' } }).png().toBuffer();
    const res = await request(app).post('/api/articles').set(bearer(ctx.adminToken))
      .field('title', 'With Image').field('content', '<p>x</p>').field('category_id', String(ctx.category.id))
      .attach('featured_image', png, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.article.featured_image_url).toMatch(/^\/uploads\/articles\/.+\.webp$/);
  });

  it('rejects a non-image disguised as png (magic bytes)', async () => {
    const res = await request(app).post('/api/articles').set(bearer(ctx.adminToken))
      .field('title', 'Fake').field('content', '<p>x</p>').field('category_id', String(ctx.category.id))
      .attach('featured_image', Buffer.from('<?php echo 1; ?>'), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_IMAGE');
  });

  it('unknown category -> 400', async () => {
    const res = await request(app).post('/api/articles').set(bearer(ctx.adminToken))
      .field('title', 'T').field('content', '<p>x</p>').field('category_id', '9999');
    expect(res.status).toBe(400);
  });
});

describe('public article endpoints', () => {
  it('detail has no email fields anywhere', async () => {
    const res = await request(app).get(`/api/articles/${ctx.published.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Published One');
    expect(Array.isArray(res.body.relatedArticles)).toBe(true);
    const keys = deepKeys(res.body);
    expect(keys.some((k) => /email|password/i.test(k))).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('@test.dev');
  });

  it('detail by slug works', async () => {
    const res = await request(app).get('/api/articles/published-one');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ctx.published.id);
  });

  it('drafts are hidden from anonymous and members, visible to admins', async () => {
    expect((await request(app).get(`/api/articles/${ctx.draft.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/articles/${ctx.draft.id}`).set(bearer(ctx.memberToken))).status).toBe(404);
    expect((await request(app).get(`/api/articles/${ctx.draft.id}`).set(bearer(ctx.adminToken))).status).toBe(200);
  });

  it('list is forced to published unless admin; pagination has pages + totalPages', async () => {
    const anon = await request(app).get('/api/articles?status=all');
    expect(anon.status).toBe(200);
    expect(anon.body.articles.map((a) => a.slug)).toEqual(['published-one']);
    expect(anon.body.pagination).toMatchObject({ total: 1, limit: 10, offset: 0, pages: 1, totalPages: 1, currentPage: 1 });
    expect(deepKeys(anon.body).some((k) => /email/i.test(k))).toBe(false);

    const admin = await request(app).get('/api/articles?status=all&search=&category_id=').set(bearer(ctx.adminToken));
    expect(admin.body.pagination.total).toBe(2);
  });

  it('view counting is deduped per ip', async () => {
    await request(app).post(`/api/articles/${ctx.published.id}/view`);
    const second = await request(app).post(`/api/articles/${ctx.published.id}/view`);
    expect(second.body.message).toBe('Already viewed');
  });
});

describe('validation -> 400 (not 500)', () => {
  it('invalid ids', async () => {
    expect((await request(app).put('/api/articles/abc').set(bearer(ctx.adminToken)).field('title', 'x')).status).toBe(400);
    expect((await request(app).delete('/api/articles/1;DROP').set(bearer(ctx.adminToken))).status).toBe(400);
    expect((await request(app).get('/api/articles/bad%20id!')).status).toBe(400);
    expect((await request(app).get('/api/comments/article/abc')).status).toBe(400);
    expect((await request(app).delete('/api/notifications/xyz').set(bearer(ctx.memberToken))).status).toBe(400);
    expect((await request(app).delete('/api/categories/xyz').set(bearer(ctx.adminToken))).status).toBe(400);
  });

  it('pagination limit > 50 and bad status enum', async () => {
    expect((await request(app).get('/api/articles?limit=100')).status).toBe(400);
    expect((await request(app).get('/api/articles?status=bogus')).status).toBe(400);
    expect((await request(app).get('/api/articles?category_id=abc')).status).toBe(400);
  });

  it('comment length > 2000 -> 400', async () => {
    const res = await request(app).post(`/api/comments/article/${ctx.published.id}`).set(bearer(ctx.memberToken))
      .send({ content: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
  });
});

describe('comments, categories, notifications', () => {
  it('comments are public without emails, and notify the author', async () => {
    const created = await request(app).post(`/api/comments/article/${ctx.published.id}`).set(bearer(ctx.memberToken))
      .send({ content: 'Nice car' });
    expect(created.status).toBe(201);
    const list = await request(app).get(`/api/comments/article/${ctx.published.id}`);
    expect(list.status).toBe(200);
    expect(list.body.comments[0].content).toBe('Nice car');
    expect(list.body.pagination.totalPages).toBe(1);
    expect(deepKeys(list.body).some((k) => /email/i.test(k))).toBe(false);

    const notes = await request(app).get('/api/notifications').set(bearer(ctx.adminToken));
    expect(notes.body.notifications[0].sender_name).toBe('Member Person');
  });

  it('DELETE /api/categories/:id -> 409 when in use, 200 when free', async () => {
    const used = await request(app).delete(`/api/categories/${ctx.category.id}`).set(bearer(ctx.adminToken));
    expect(used.status).toBe(409);
    const created = await request(app).post('/api/categories').set(bearer(ctx.adminToken)).send({ name: 'Trucks' });
    expect(created.status).toBe(201);
    const renamed = await request(app).put(`/api/categories/${created.body.id}`).set(bearer(ctx.adminToken)).send({ name: 'Big Trucks' });
    expect(renamed.body.slug).toBe('big-trucks');
    const del = await request(app).delete(`/api/categories/${created.body.id}`).set(bearer(ctx.adminToken));
    expect(del.status).toBe(200);
  });

  it('DELETE /api/notifications/:id is owner-only', async () => {
    const n = (await ctx.pool.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'system', 't', 'm') RETURNING id`,
      [ctx.member.id])).rows[0];
    const other = await request(app).delete(`/api/notifications/${n.id}`).set(bearer(ctx.adminToken));
    expect(other.status).toBe(404);
    const own = await request(app).delete(`/api/notifications/${n.id}`).set(bearer(ctx.memberToken));
    expect(own.status).toBe(200);
  });
});
