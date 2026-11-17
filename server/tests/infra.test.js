import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, isAllowedOrigin } from '../app.js';
import { __setPool } from '../db/pool.js';
import { sanitizeArticleHtml } from '../lib/sanitize.js';
import { ViewDedupe } from '../lib/viewDedupe.js';
import { cloudinaryPublicId, localPathFromUrl } from '../lib/storage.js';
import { uploadsPath, contentUploadRefs } from '../scripts/migrate-uploads-to-cloudinary.js';
import { setupDb } from './helpers.js';

describe('health / ready', () => {
  beforeEach(async () => { await setupDb(); });

  it('/api/health is liveness only, no DB details', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('/api/ready pings the DB', async () => {
    const ok = await request(createApp()).get('/api/ready');
    expect(ok.body).toEqual({ status: 'ok' });

    __setPool({ query: async () => { throw new Error('connect ECONNREFUSED 10.0.0.1:5432 secret-host'); } });
    const bad = await request(createApp()).get('/api/ready');
    expect(bad.status).toBe(503);
    expect(bad.body).toEqual({ status: 'error' });
  });

  it('debug endpoints are gone', async () => {
    const res = await request(createApp()).get('/api/debug/articles');
    expect(res.status).toBe(404);
  });
});

describe('CORS allowlist', () => {
  it('allows localhost dev and project previews, rejects others', async () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('https://side-my-project-git-feature-x.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://side-my-project.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://evil.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://side-my-project.vercel.app.evil.com')).toBe(false);
    const res = await request(createApp()).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('sanitizeArticleHtml', () => {
  it('keeps the allowed subset', () => {
    const html = '<h2>T</h2><p><strong>b</strong> <em>i</em></p><ul><li>x</li></ul><blockquote>q</blockquote>'
      + '<figure><img src="/uploads/a.webp" alt="a" width="10" height="5"><figcaption>c</figcaption></figure><pre><code>c</code></pre><hr><br>';
    expect(sanitizeArticleHtml(html)).toBe(html.replace('<hr>', '<hr />').replace('<br>', '<br />').replace('height="5">', 'height="5" />'));
  });

  it('removes scripts, handlers, styles and unsafe URLs', () => {
    const out = sanitizeArticleHtml('<img src="javascript:alert(1)" onerror="x"><img src="data:image/png;base64,AAA"><a href="//evil.com" onclick="y" style="color:red">l</a><style>p{}</style>');
    expect(out).toBe('<a rel="noopener noreferrer">l</a>');
  });

  it('forces rel on links and keeps target=_blank', () => {
    expect(sanitizeArticleHtml('<a href="https://x.dev" target="_blank" rel="opener">x</a>'))
      .toBe('<a rel="noopener noreferrer" href="https://x.dev" target="_blank">x</a>');
  });
});

describe('ViewDedupe', () => {
  it('counts once per ttl and is size-capped', () => {
    let now = 0;
    const d = new ViewDedupe({ ttlMs: 1000, maxEntries: 3, now: () => now });
    expect(d.shouldCount(1, 'a')).toBe(true);
    expect(d.shouldCount(1, 'a')).toBe(false);
    now = 1001;
    expect(d.shouldCount(1, 'a')).toBe(true);
    for (let i = 0; i < 10; i++) d.shouldCount(i, 'b');
    expect(d.size).toBe(3);
  });
});

describe('storage helpers', () => {
  it('recognises our cloudinary urls and blocks path traversal', () => {
    expect(cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v123/side-myproject/articles/abc.webp'))
      .toBe('side-myproject/articles/abc');
    expect(cloudinaryPublicId('https://res.cloudinary.com/demo/image/upload/v1/other/abc.webp')).toBeNull();
    expect(localPathFromUrl('/uploads/../../etc/passwd')).toBeNull();
    expect(localPathFromUrl('/uploads/articles/a.webp')).toMatch(/articles[\\/]a\.webp$/);
  });

  it('migration script picks only /uploads references', () => {
    const base = 'https://api.example.app';
    expect(uploadsPath('/uploads/articles/a.jpg', base)).toBe('/uploads/articles/a.jpg');
    expect(uploadsPath('https://api.example.app/uploads/profiles/p.png', base)).toBe('/uploads/profiles/p.png');
    expect(uploadsPath('https://res.cloudinary.com/x/image/upload/a.jpg', base)).toBeNull();
    expect(uploadsPath('https://images.unsplash.com/uploads/a.jpg', base)).toBeNull();
    expect(contentUploadRefs('<p><img src="/uploads/a.png"><img src="https://cdn.x/b.png"><a href=\'/uploads/c.png\'>c</a></p>', base))
      .toEqual(['/uploads/a.png', '/uploads/c.png']);
  });
});

describe('seed + migrations', () => {
  it('seedUsers creates demo accounts only if missing and never resets an existing password', async () => {
    const { seedUsers } = await import('../scripts/seed.js');
    const ctx = await setupDb();
    await ctx.pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role)
       VALUES ('Owner', 'chayanon', 'chayanon.5723@gmail.com', 'EXISTING-HASH', 'admin')`,
    );
    await seedUsers(ctx.pool, () => {});
    await seedUsers(ctx.pool, () => {}); // idempotent
    const rows = (await ctx.pool.query('SELECT email, username, role, password_hash FROM users ORDER BY id')).rows;
    const owner = rows.find((r) => r.email === 'chayanon.5723@gmail.com');
    expect(owner.password_hash).toBe('EXISTING-HASH');
    expect(rows.filter((r) => r.email === 'admin@example.com')).toHaveLength(1);
    expect(rows.find((r) => r.email === 'admin@example.com').role).toBe('admin');
    expect(rows.find((r) => r.email === 'some@gmail.com').role).toBe('user');
  });

  it('runMigrations applies pending files in order inside transactions and records them', async () => {
    const { runMigrations, listMigrationFiles } = await import('../db/migrate.js');
    const files = await listMigrationFiles();
    expect(files[0]).toBe('001_baseline.sql');
    const log = [];
    const client = {
      query: async (sql, params) => {
        log.push(typeof sql === 'string' ? sql.trim().split('\n')[0] : sql);
        if (/SELECT name FROM schema_migrations/.test(sql)) return { rows: [{ name: '001_baseline.sql' }] };
        if (/INSERT INTO schema_migrations/.test(sql)) log.push(`recorded ${params[0]}`);
        return { rows: [] };
      },
      release: () => log.push('released'),
    };
    const applied = await runMigrations({ connect: async () => client }, { log: () => {} });
    expect(applied).toEqual(files.slice(1));
    expect(log).toContain('recorded 002_improvements.sql');
    expect(log).not.toContain('recorded 001_baseline.sql');
    expect(log.filter((l) => l === 'BEGIN')).toHaveLength(files.length - 1);
    expect(log.at(-1)).toBe('released');
  });
});
