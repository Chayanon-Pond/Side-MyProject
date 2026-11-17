import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { Writable } from 'stream';
import { createApp } from '../app.js';
import { testLogLines, REDACT_PATHS } from '../lib/logger.js';
import { setupDb, bearer, expiredToken } from './helpers.js';

let ctx;
let app;

beforeEach(async () => {
  ctx = await setupDb();
  app = createApp();
  testLogLines.length = 0;
});

const PASSWORD = 'Sup3r-Secret-Pw!';

describe('auth: register / login', () => {
  it('registers, logs in, and never writes the password or token to logs', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      fullName: 'New Person', username: 'newbie', email: 'New@Example.com', password: PASSWORD,
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ username: 'newbie', email: 'new@example.com', role: 'user' });
    expect(reg.body.user.password_hash).toBeUndefined();
    expect(typeof reg.body.token).toBe('string');

    const login = await request(app).post('/api/auth/login').send({ email: 'new@example.com', password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('user');

    // Use the token on an authenticated route so its Authorization header gets logged by pino-http.
    const me = await request(app).get('/api/profile').set(bearer(login.body.token));
    expect(me.status).toBe(200);
    expect(me.body.password_hash).toBeUndefined();

    const allLogs = testLogLines.join('\n');
    expect(testLogLines.length).toBeGreaterThan(0);
    expect(allLogs).not.toContain(PASSWORD);
    expect(allLogs).not.toContain(login.body.token);
    expect(allLogs).not.toContain(reg.body.token);
    expect(allLogs).not.toMatch(/\$2[aby]\$/); // no bcrypt hashes
  });

  it('wrong password -> 401 with compatible error shape, and nothing sensitive logged', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'nope-nope' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    expect(testLogLines.join('\n')).not.toContain('nope-nope');
  });

  it('unknown email -> 401 (no user enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'whatever1' });
    expect(res.status).toBe(401);
  });

  it('register validation -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(typeof res.body.error).toBe('string');
  });

  it('duplicate email (case-insensitive) -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'X', username: 'another', email: 'ADMIN@test.dev', password: PASSWORD,
    });
    expect(res.status).toBe(400);
  });

  it('issues HS256 tokens', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'Secret123!' });
    expect(jwt.decode(login.body.token, { complete: true }).header.alg).toBe('HS256');
  });
});

describe('auth: token handling', () => {
  it('expired token -> 401 (not 403)', async () => {
    const res = await request(app).get('/api/profile').set(bearer(expiredToken(ctx.member)));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });

  it('garbage token -> 401', async () => {
    const res = await request(app).get('/api/profile').set(bearer('not.a.token'));
    expect(res.status).toBe(401);
  });

  it('alg=none token is rejected', async () => {
    const none = jwt.sign({ userId: ctx.admin.id, role: 'admin' }, '', { algorithm: 'none' });
    const res = await request(app).get('/api/profile').set(bearer(none));
    expect(res.status).toBe(401);
  });

  it('token signed with another secret is rejected', async () => {
    const forged = jwt.sign({ userId: ctx.admin.id, role: 'admin' }, 'other-secret', { algorithm: 'HS256' });
    const res = await request(app).post('/api/categories').set(bearer(forged)).send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('auth: forgot / reset password', () => {
  it('forgot-password always returns 200, reset token is single-use', async () => {
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.dev' });
    expect(unknown.status).toBe(200);

    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'member@test.dev' });
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);

    // Dev link is logged (no SMTP in tests) without the email address.
    const line = testLogLines.find((l) => l.includes('resetLink'));
    expect(line).toBeDefined();
    expect(line).not.toContain('member@test.dev');
    const token = /reset-password\/([a-f0-9]{64})/.exec(line)[1];

    // Only the hash is stored.
    const stored = await ctx.pool.query('SELECT token_hash FROM password_reset_tokens');
    expect(stored.rows[0].token_hash).not.toBe(token);

    const reset = await request(app).post('/api/auth/reset-password-token').send({ token, newPassword: 'BrandNew123' });
    expect(reset.status).toBe(200);
    const again = await request(app).post('/api/auth/reset-password-token').send({ token, newPassword: 'Another123' });
    expect(again.status).toBe(400);

    const login = await request(app).post('/api/auth/login').send({ email: 'member@test.dev', password: 'BrandNew123' });
    expect(login.status).toBe(200);
  });

  it('malformed reset token -> 400', async () => {
    const res = await request(app).post('/api/auth/reset-password-token').send({ token: 'abc', newPassword: 'BrandNew123' });
    expect(res.status).toBe(400);
  });
});

describe('logger redaction', () => {
  it('redacts authorization, password and token fields', () => {
    const lines = [];
    const sink = new Writable({ write(c, e, cb) { lines.push(c.toString()); cb(); } });
    const log = pino({ redact: { paths: REDACT_PATHS, censor: '[Redacted]' } }, sink);
    log.info({
      req: { headers: { authorization: 'Bearer abc.def.ghi' } },
      password: 'p@ss',
      body: { password: 'p@ss2', token: 'tok' },
      token: 'tok2',
    }, 'x');
    const out = lines.join('');
    for (const s of ['abc.def.ghi', 'p@ss', 'p@ss2', 'tok2', '"tok"']) expect(out).not.toContain(s);
    expect(out).toContain('[Redacted]');
  });
});
