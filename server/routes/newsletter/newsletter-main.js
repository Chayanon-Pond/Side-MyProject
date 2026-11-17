import express from 'express';
import pool from '../../db/pool.js';
import { asyncHandler } from '../../lib/errors.js';
import { validate, z } from '../../lib/validate.js';

const router = express.Router();

const body = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

// POST /api/newsletter  -> 201 new subscriber, 200 already subscribed; same body either way.
// Rate limit (5/hour/IP) is mounted in app.js.
router.post('/', validate({ body }), asyncHandler(async (req, res) => {
  const r = await pool.query(
    'INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id',
    [req.body.email],
  );
  res.status(r.rows.length > 0 ? 201 : 200).json({ ok: true });
}));

export default router;
