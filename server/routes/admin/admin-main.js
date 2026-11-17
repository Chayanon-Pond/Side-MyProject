import express from 'express';
import pool from '../../db/pool.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';

const router = express.Router();
router.use(authenticateToken, requireRole('admin'));

/** 'YYYY-MM-DD' strings for the 7 days ending at `today` (oldest first). */
export function lastSevenDays(today) {
  const [y, m, d] = today.split('-').map(Number);
  const end = Date.UTC(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => new Date(end - (6 - i) * 86_400_000).toISOString().slice(0, 10));
}

// GET /api/admin/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const [totals, comments, daily, today, top, recent] = await Promise.all([
    pool.query(
      `SELECT
         SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS published,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)::int AS drafts,
         COALESCE(SUM(view_count), 0)::bigint AS views
       FROM articles`,
    ),
    pool.query('SELECT COUNT(*)::int AS n FROM comments'),
    pool.query(
      `SELECT to_char(day, 'YYYY-MM-DD') AS date, SUM(views)::int AS views
       FROM article_views_daily
       WHERE day > CURRENT_DATE - 7
       GROUP BY day`,
    ),
    pool.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today`),
    pool.query(
      `SELECT id, slug, title, COALESCE(view_count, 0)::int AS views
       FROM articles ORDER BY view_count DESC NULLS LAST, id ASC LIMIT 5`,
    ),
    pool.query(
      `SELECT c.id, c.article_id, a.title AS article_title, u.full_name AS user_name,
              LEFT(c.content, 140) AS content, c.created_at
       FROM comments c
       JOIN articles a ON a.id = c.article_id
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT 8`,
    ),
  ]);

  const byDay = new Map(daily.rows.map((r) => [r.date, Number(r.views)]));
  const t = totals.rows[0] || {};
  res.json({
    totals: {
      published: Number(t.published) || 0,
      drafts: Number(t.drafts) || 0,
      comments: Number(comments.rows[0].n) || 0,
      views: Number(t.views) || 0,
    },
    views7d: lastSevenDays(today.rows[0].today).map((date) => ({ date, views: byDay.get(date) ?? 0 })),
    topArticles: top.rows,
    recentComments: recent.rows,
  });
}));

export default router;
