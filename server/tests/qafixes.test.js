import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { setupDb, bearer } from './helpers.js';

// Regression tests for the APEX redesign QA report (qa/QA-REPORT.md).

async function addArticle(ctx, { title, make = null, specs = null, categoryId = ctx.category.id }) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const r = await ctx.pool.query(
    `INSERT INTO articles (title, slug, content, author_id, category_id, status, published_at, make, specs, article_type)
     VALUES ($1, $2, '<p>x</p>', $3, $4, 'published', NOW(), $5, $6, 'review') RETURNING id`,
    [title, slug, ctx.admin.id, categoryId, make, specs ? JSON.stringify(specs) : null],
  );
  return r.rows[0].id;
}

const commentId = (body) => body.comment?.id ?? body.data?.id ?? body.id;

describe('QA fixes (pg-mem)', () => {
  let ctx;
  let app;
  beforeEach(async () => {
    ctx = await setupDb();
    app = createApp();
  });

  it('C1: comments accept limit=50, paginate top-level comments and keep replies with their parent', async () => {
    const id = ctx.published.id;
    const parents = [];
    for (let i = 0; i < 3; i += 1) {
      const r = await request(app).post(`/api/comments/article/${id}`).set(bearer(ctx.memberToken)).send({ content: `top ${i}` });
      expect(r.status).toBe(201);
      parents.push(commentId(r.body));
    }
    const reply = await request(app).post(`/api/comments/article/${id}`).set(bearer(ctx.memberToken))
      .send({ content: 'reply', parent_id: parents[0] });
    expect(reply.status).toBe(201);

    const all = await request(app).get(`/api/comments/article/${id}?limit=50`);
    expect(all.status).toBe(200);
    expect(all.body.comments).toHaveLength(3);
    expect(all.body.total_comments).toBe(4);
    expect(all.body.pagination.total).toBe(3);
    const withReply = all.body.comments.find((c) => c.replies.length);
    expect(withReply.replies[0].content).toBe('reply');

    const page1 = await request(app).get(`/api/comments/article/${id}?limit=2&offset=0`);
    const page2 = await request(app).get(`/api/comments/article/${id}?limit=2&offset=2`);
    expect(page1.body.comments).toHaveLength(2);
    expect(page2.body.comments).toHaveLength(1);
    const both = [...page1.body.comments, ...page2.body.comments];
    expect(new Set(both.map((c) => c.id)).size).toBe(3);
    // The reply lives under its parent on whichever page the parent is on, never on its own.
    expect(both.reduce((n, c) => n + c.replies.length, 0)).toBe(1);

    expect((await request(app).get(`/api/comments/article/${id}?limit=51`)).status).toBe(400);
  });

  it('L3: comment content max is 2000 characters', async () => {
    const id = ctx.published.id;
    const ok = await request(app).post(`/api/comments/article/${id}`).set(bearer(ctx.memberToken)).send({ content: 'a'.repeat(2000) });
    expect(ok.status).toBe(201);
    const tooLong = await request(app).post(`/api/comments/article/${id}`).set(bearer(ctx.memberToken)).send({ content: 'a'.repeat(2001) });
    expect(tooLong.status).toBe(400);
  });

  it('H1: list items carry has_specs and ?has_specs=true filters to spec sheets only', async () => {
    const withSpecs = await addArticle(ctx, { title: 'Spec Car', make: 'McLaren', specs: { power_hp: 710 } });
    const list = await request(app).get('/api/articles?limit=50');
    expect(list.status).toBe(200);
    for (const a of list.body.articles) expect(typeof a.has_specs).toBe('boolean');
    expect(list.body.articles.find((a) => a.id === withSpecs).has_specs).toBe(true);
    expect(list.body.articles.find((a) => a.id === ctx.published.id).has_specs).toBe(false);

    const only = await request(app).get('/api/articles?has_specs=true&limit=50');
    expect(only.body.articles.map((a) => a.id)).toEqual([withSpecs]);
    expect(only.body.pagination.total).toBe(1);
    const none = await request(app).get('/api/articles?has_specs=false&limit=50');
    expect(none.body.articles.map((a) => a.id)).not.toContain(withSpecs);
    expect((await request(app).get('/api/articles?has_specs=maybe')).status).toBe(400);

    const detail = await request(app).get(`/api/articles/${withSpecs}`);
    expect(detail.body.data.has_specs).toBe(true);
  });

  it('M2: seo_title / seo_description are validated, stored, returned and clearable', async () => {
    const create = await request(app).post('/api/articles').set(bearer(ctx.adminToken)).send({
      title: 'SEO Story', content: '<p>body</p>', category_id: ctx.category.id, status: 'published',
      seo_title: 'QA SEO Title', seo_description: 'QA SEO description',
    });
    expect(create.status).toBe(201);
    const id = create.body.article.id;
    const got = await request(app).get(`/api/articles/${id}`);
    expect(got.body.data).toMatchObject({ seo_title: 'QA SEO Title', seo_description: 'QA SEO description' });

    const tooLong = await request(app).put(`/api/articles/${id}`).set(bearer(ctx.adminToken)).send({ seo_title: 'x'.repeat(71) });
    expect(tooLong.status).toBe(400);
    const tooLongDesc = await request(app).put(`/api/articles/${id}`).set(bearer(ctx.adminToken)).send({ seo_description: 'x'.repeat(161) });
    expect(tooLongDesc.status).toBe(400);

    const cleared = await request(app).put(`/api/articles/${id}`).set(bearer(ctx.adminToken)).send({ seo_title: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.article.seo_title).toBeNull();
    expect(cleared.body.article.seo_description).toBe('QA SEO description');
  });

  it('M5: related = same make first, then same category, with card fields', async () => {
    const other = (await ctx.pool.query("INSERT INTO categories (name, slug) VALUES ('Other', 'other') RETURNING id")).rows[0];
    const main = await addArticle(ctx, { title: 'McLaren Main', make: 'McLaren' });
    const sameMakeOtherCat = await addArticle(ctx, { title: 'McLaren Elsewhere', make: 'mclaren', categoryId: other.id });
    await addArticle(ctx, { title: 'Ferrari Elsewhere', make: 'Ferrari', categoryId: other.id });
    const res = await request(app).get(`/api/articles/${main}`);
    expect(res.status).toBe(200);
    const rel = res.body.relatedArticles;
    expect(rel[0].id).toBe(sameMakeOtherCat);
    expect(rel.map((a) => a.id)).toContain(ctx.published.id); // same category fills the rest
    expect(rel.map((a) => a.title)).not.toContain('Ferrari Elsewhere');
    expect(rel.map((a) => a.id)).not.toContain(main);
    expect(rel[0]).toMatchObject({ make: 'mclaren', article_type: 'review', author_name: 'Admin Person', reading_time_min: 1 });
    expect('author_avatar_url' in rel[0]).toBe(true);
    expect('author_avatar_raw' in rel[0]).toBe(false);
    expect(JSON.stringify(rel)).not.toMatch(/email|password/);
  });

  it('L4: bio is limited to 280 characters and shown as author_bio on articles', async () => {
    const long = await request(app).put('/api/profile/update').set(bearer(ctx.adminToken))
      .send({ full_name: 'Admin Person', username: 'admin1', bio: 'b'.repeat(281) });
    expect(long.status).toBe(400);
    const ok = await request(app).put('/api/profile/update').set(bearer(ctx.adminToken))
      .send({ full_name: 'Admin Person', username: 'admin1', bio: 'Writes about cars.' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.bio).toBe('Writes about cars.');
    const viaAuth = await request(app).put('/api/auth/profile').set(bearer(ctx.adminToken))
      .field('full_name', 'Admin Person').field('username', 'admin1').field('email', 'admin@test.dev').field('bio', 'c'.repeat(281));
    expect(viaAuth.status).toBe(400);
    const art = await request(app).get(`/api/articles/${ctx.published.id}`);
    expect(art.body.data.author_bio).toBe('Writes about cars.');
  });

  it('L5: JSON responses are gzip-compressed when the client accepts it', async () => {
    for (let i = 0; i < 6; i += 1) await addArticle(ctx, { title: `Bulk ${i} ${'x'.repeat(40)}` });
    const res = await request(app).get('/api/articles?limit=50').set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });
});
