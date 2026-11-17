import express from 'express';
import pool from '../../db/pool.js';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { validate, z, emptyToUndefined } from '../../lib/validate.js';
import { buildTextSearch } from '../../lib/textSearch.js';
import { ARTICLE_TYPES } from '../articles/articleSchemas.js';

/**
 * Public discovery endpoints mounted at /api:
 *   GET /api/makes, GET /api/search, GET /api/compare
 */
const router = express.Router();

// ---------- GET /api/makes ----------
router.get('/makes', asyncHandler(async (req, res) => {
  const r = await pool.query(
    `SELECT make, COUNT(*)::int AS count
     FROM articles
     WHERE status = 'published' AND make IS NOT NULL AND make <> ''
     GROUP BY make
     ORDER BY count DESC, make ASC`,
  );
  res.json(r.rows);
}));

// ---------- GET /api/search ----------
const searchQuery = z.object({
  q: emptyToUndefined(z.string().trim().max(200).optional()),
  make: emptyToUndefined(z.string().trim().max(100).optional()),
  type: emptyToUndefined(z.enum(ARTICLE_TYPES).optional()),
  limit: emptyToUndefined(z.coerce.number().int().min(1).max(20).default(8)),
});

/** Tiny WHERE builder so each facet query gets its own $n numbering. */
function whereBuilder() {
  const parts = [`a.status = 'published'`];
  const params = [];
  return {
    parts,
    params,
    add(sql, value) {
      params.push(value);
      parts.push(sql.replace('?', `$${params.length}`));
    },
    sql() {
      return `WHERE ${parts.join(' AND ')}`;
    },
  };
}

router.get('/search', validate({ query: searchQuery }), asyncHandler(async (req, res) => {
  const { q, make, type, limit } = req.query;

  // Facets follow the usual convention: each facet applies every filter except its own,
  // so the UI can show "switch to Lamborghini (3)" while McLaren is selected.
  // The text clause always takes $1 (it is added first), so it can be shared by all three queries.
  const ts = q ? await buildTextSearch(pool, q, 1) : null;
  const rankSql = ts?.rankSql ?? null;
  const scope = ({ withMake, withType }) => {
    const w = whereBuilder();
    if (ts) {
      w.params.push(...ts.params);
      w.parts.push(ts.sql);
    }
    if (withMake && make) w.add('lower(a.make) = lower(?)', make);
    if (withType && type) w.add('a.article_type = ?', type);
    return { w };
  };

  const main = scope({ withMake: true, withType: true });
  const makesF = scope({ withMake: false, withType: true });
  const typesF = scope({ withMake: true, withType: false });

  const order = rankSql
    ? `${rankSql} DESC, a.published_at DESC NULLS LAST, a.id DESC`
    : 'a.published_at DESC NULLS LAST, a.id DESC';
  main.w.params.push(limit);

  const [results, makes, types] = await Promise.all([
    pool.query(
      `SELECT a.id, a.slug, a.title, a.dek, a.make, a.article_type, a.featured_image_url,
              a.published_at, a.reading_time_min
       FROM articles a ${main.w.sql()}
       ORDER BY ${order}
       LIMIT $${main.w.params.length}`,
      main.w.params,
    ),
    pool.query(
      `SELECT a.make, COUNT(*)::int AS count FROM articles a
       ${makesF.w.sql()} AND a.make IS NOT NULL AND a.make <> ''
       GROUP BY a.make ORDER BY count DESC, a.make ASC`,
      makesF.w.params,
    ),
    pool.query(
      `SELECT a.article_type AS type, COUNT(*)::int AS count FROM articles a
       ${typesF.w.sql()}
       GROUP BY a.article_type ORDER BY count DESC, a.article_type ASC`,
      typesF.w.params,
    ),
  ]);

  res.json({ results: results.rows, facets: { makes: makes.rows, types: types.rows } });
}));

// ---------- GET /api/compare?ids=1,2[,3] ----------
const compareQuery = z.object({
  ids: z.string()
    .regex(/^\s*\d+\s*(,\s*\d+\s*){1,2}$/, 'must be 2 or 3 comma-separated article ids')
    .transform((s) => s.split(',').map((x) => parseInt(x.trim(), 10)))
    .pipe(z.array(z.number().int().positive().max(2147483647)).min(2).max(3))
    .refine((ids) => new Set(ids).size === ids.length, 'ids must be distinct'),
});

router.get('/compare', validate({ query: compareQuery }), asyncHandler(async (req, res) => {
  const { ids } = req.query;
  const r = await pool.query(
    `SELECT id AS article_id, slug, title, make, featured_image_url, specs
     FROM articles
     WHERE id = ANY($1::int[]) AND status = 'published' AND specs IS NOT NULL`,
    [ids],
  );
  if (r.rows.length !== ids.length) {
    const found = new Set(r.rows.map((x) => x.article_id));
    throw AppError.badRequest(
      'Every compared article must be published and have specs',
      'COMPARE_UNAVAILABLE',
      ids.filter((id) => !found.has(id)).map((id) => ({ path: 'ids', message: `article ${id} is not comparable` })),
    );
  }
  const byId = new Map(r.rows.map((x) => [x.article_id, x]));
  res.json({ cars: ids.map((id) => byId.get(id)) });
}));

export default router;
