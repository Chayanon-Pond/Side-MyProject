import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { sanitizeArticleHtml } from '../lib/sanitize.js';
import { readingTimeMin } from '../lib/readingTime.js';
import { absoluteImageUrl } from '../lib/storage.js';
import { lastSevenDays } from '../routes/admin/admin-main.js';
import { specsField, galleryField } from '../routes/articles/articleSchemas.js';
import { setupDb, bearer } from './helpers.js';

// Full-text search, triggers and the stats SQL need real Postgres: see tests-pg (npm run test:pg).

describe('sanitizer: Phase-4 additions', () => {
  it('keeps figure/img loading + align-*/pull-quote classes only', () => {
    const out = sanitizeArticleHtml('<figure class="align-wide evil"><img src="/u/a.webp" loading="lazy" class="x align-left"></figure><blockquote class="pull-quote">q</blockquote><p class="hack">p</p>');
    expect(out).toBe('<figure class="align-wide"><img src="/u/a.webp" loading="lazy" class="align-left" /></figure><blockquote class="pull-quote">q</blockquote><p>p</p>');
  });

  it('allows YouTube /embed and player.vimeo.com iframes only, always allowfullscreen', () => {
    expect(sanitizeArticleHtml('<iframe src="https://www.youtube.com/embed/abc_1-2" onload="x" allow="camera"></iframe>'))
      .toBe('<iframe src="https://www.youtube.com/embed/abc_1-2" allowfullscreen></iframe>');
    expect(sanitizeArticleHtml('<iframe src="https://player.vimeo.com/video/1" width="640" height="360"></iframe>'))
      .toBe('<iframe src="https://player.vimeo.com/video/1" width="640" height="360" allowfullscreen></iframe>');
    for (const bad of [
      'https://youtube.com/watch?v=abc', 'https://www.youtube.com.evil.com/embed/x', 'http://www.youtube.com/embed/x',
      'https://evil.com/embed/x', 'javascript:alert(1)', '//player.vimeo.com/video/1', 'https://vimeo.com/1',
    ]) {
      expect(sanitizeArticleHtml(`<iframe src="${bad}">t</iframe>`)).toBe('');
    }
  });
});

describe('helpers', () => {
  it('readingTimeMin = ceil(words/220), min 1, ignores markup', () => {
    expect(readingTimeMin('')).toBe(1);
    expect(readingTimeMin(`<p>${'w '.repeat(220)}</p>`)).toBe(1);
    expect(readingTimeMin(`<p>${'w '.repeat(221)}</p>`)).toBe(2);
    expect(readingTimeMin('<p>a&nbsp;b</p><img src="x">')).toBe(1);
  });

  it('absoluteImageUrl', () => {
    const req = { protocol: 'https', get: () => 'api.example.com' };
    expect(absoluteImageUrl('/uploads/p/a.webp', req)).toBe('https://api.example.com/uploads/p/a.webp');
    expect(absoluteImageUrl('https://res.cloudinary.com/x/a.webp', req)).toBe('https://res.cloudinary.com/x/a.webp');
    expect(absoluteImageUrl(null, req)).toBeNull();
    expect(absoluteImageUrl('relative/a.webp', req)).toBeNull();
  });

  it('lastSevenDays crosses month/year boundaries', () => {
    expect(lastSevenDays('2026-01-03')).toEqual([
      '2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03',
    ]);
  });

  it('specs/gallery accept JSON strings (multipart) and validate', () => {
    expect(specsField.parse('{"power_hp":"710","year":2018}')).toEqual({ power_hp: 710, year: 2018 });
    expect(specsField.parse('{}')).toBeNull();
    expect(specsField.parse('')).toBeNull();
    expect(() => specsField.parse({ power_hp: -1 })).toThrow();
    expect(() => specsField.parse({ unknown: 1 })).toThrow();
    expect(() => specsField.parse('{not json')).toThrow();
    expect(galleryField.parse('[{"url":"https://x.dev/a.jpg"}]')).toEqual([{ url: 'https://x.dev/a.jpg' }]);
    expect(() => galleryField.parse([{ url: 'javascript:alert(1)' }])).toThrow();
    expect(() => galleryField.parse(Array.from({ length: 31 }, () => ({ url: 'https://x.dev/a.jpg' })))).toThrow();
  });
});

describe('Phase-4 routes (pg-mem)', () => {
  let ctx;
  let app;
  beforeEach(async () => {
    ctx = await setupDb();
    app = createApp();
  });

  it('article payloads carry the new fields', async () => {
    const d = await request(app).get(`/api/articles/${ctx.published.id}`);
    expect(d.body.data).toMatchObject({ dek: null, make: null, article_type: 'feature', is_featured: false, specs: null, gallery: [], reading_time_min: 1 });
    expect('author_avatar_url' in d.body.data).toBe(true);
    const list = await request(app).get('/api/articles');
    expect(list.body.articles[0]).toMatchObject({ article_type: 'feature', is_featured: false, author_avatar_url: null });
  });

  it('compare validation -> 400', async () => {
    expect((await request(app).get('/api/compare?ids=1')).status).toBe(400);
    expect((await request(app).get('/api/compare?ids=1,2,3,4')).status).toBe(400);
    expect((await request(app).get('/api/compare?ids=a,b')).status).toBe(400);
  });

  it('admin-only endpoints reject members', async () => {
    expect((await request(app).get('/api/admin/stats').set(bearer(ctx.memberToken))).status).toBe(403);
    expect((await request(app).post('/api/uploads/image').set(bearer(ctx.memberToken))).status).toBe(403);
    expect((await request(app).post('/api/uploads/image')).status).toBe(401);
  });

  it('newsletter validates email', async () => {
    const res = await request(app).post('/api/newsletter').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
