import rateLimit from 'express-rate-limit';

const handler = (req, res, next, options) =>
  res.status(options.statusCode).json({ error: 'Too many requests, please try again later', code: 'RATE_LIMITED' });

const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler };

/** Factory so each app instance (and each test) gets fresh counters. */
export function createRateLimiters() {
  return {
    global: rateLimit({ ...base, windowMs: 60 * 1000, limit: 300 }),
    auth: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 10 }),
    comments: rateLimit({ ...base, windowMs: 60 * 1000, limit: 20 }),
    passwordReset: rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 5 }),
    search: rateLimit({ ...base, windowMs: 60 * 1000, limit: 60 }),
    newsletter: rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 5 }),
  };
}
