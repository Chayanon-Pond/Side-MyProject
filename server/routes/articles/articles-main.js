import express from 'express';
import pool from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { authenticateToken, optionalAuth, requireRole, isAdmin } from '../../middleware/auth.js';
import { parseSingle, storeUploadedImage } from '../../middleware/upload.js';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { validate, z, idOrSlug, numericString, emptyToUndefined, paginationQuery } from '../../lib/validate.js';
import { sanitizeArticleHtml } from '../../lib/sanitize.js';
import { deleteImage } from '../../lib/storage.js';
import { slugify } from '../../lib/slug.js';
import { viewDedupe } from '../../lib/viewDedupe.js';
import logger from '../../lib/logger.js';
import {
  findArticle, replaceTags, replaceGallery, notifyArticlePublished, toPublicArticle,
  ARTICLE_LIST_COLUMNS, toListArticle, findRelated,
} from './articleQueries.js';
import { ARTICLE_TYPES, phase4Fields } from './articleSchemas.js';
import { readingTimeMin } from '../../lib/readingTime.js';
import { buildTextSearch } from '../../lib/textSearch.js';

const router = express.Router();

export const ARTICLE_STATUSES = ['draft', 'published', 'archived'];
const statusEnum = z.enum(ARTICLE_STATUSES);
const optId = emptyToUndefined(z.coerce.number().int().positive().max(2147483647).optional());

const listQuery = z.object({
  search: emptyToUndefined(z.string().trim().max(200).optional()),
  status: emptyToUndefined(z.enum([...ARTICLE_STATUSES, 'all']).optional()),
  category_id: optId,
  author_id: optId,
  sort: emptyToUndefined(z.enum(['newest', 'latest', 'oldest', 'popular', 'title']).optional()),
  featured: emptyToUndefined(z.enum(['true', 'false']).optional()),
  make: emptyToUndefined(z.string().trim().max(100).optional()),
  type: emptyToUndefined(z.enum(ARTICLE_TYPES).optional()),
  q: emptyToUndefined(z.string().trim().max(200).optional()),
  // Compare candidates: only articles that do (true) / do not (false) carry a spec sheet.
  has_specs: emptyToUndefined(z.enum(['true', 'false']).optional()),
  ...paginationQuery,
});

const idParams = z.object({ id: numericString('id') });
const idOrSlugParams = z.object({ id: idOrSlug });

const slugField = emptyToUndefined(
  z.string().trim().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase letters, numbers and dashes').optional(),
);

const createSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: slugField,
  excerpt: emptyToUndefined(z.string().max(2000).optional()),
  content: z.string().min(1).max(500_000),
  category_id: z.coerce.number().int().positive().max(2147483647),
  status: emptyToUndefined(statusEnum.default('draft')),
  featured_image_alt: emptyToUndefined(z.string().max(255).optional()),
  tags: z.union([z.string().max(2000), z.array(z.string().max(100)).max(20)]).optional(),
  ...phase4Fields,
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: slugField,
  excerpt: z.string().max(2000).optional(),
  content: z.string().min(1).max(500_000).optional(),
  category_id: optId,
  status: emptyToUndefined(statusEnum.optional()),
  featured_image_alt: z.string().max(255).optional(),
  remove_image: z.enum(['true', 'false']).optional(),
  tags: z.union([z.string().max(2000), z.array(z.string().max(100)).max(20)]).optional(),
  ...phase4Fields,
});

async function assertCategoryExists(db, categoryId) {
  const r = await db.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
  if (r.rows.length === 0) throw AppError.badRequest('Category does not exist', 'INVALID_CATEGORY');
}

async function assertSlugFree(db, slug, exceptId = null) {
  const r = exceptId
    ? await db.query('SELECT id FROM articles WHERE slug = $1 AND id <> $2', [slug, exceptId])
    : await db.query('SELECT id FROM articles WHERE slug = $1', [slug]);
  if (r.rows.length > 0) throw AppError.badRequest('An article with this slug already exists', 'SLUG_TAKEN');
}

async function notifySafely(article, authorId) {
  try {
    await notifyArticlePublished(pool, { article, authorId });
  } catch (err) {
    logger.warn({ err: { message: err?.message }, articleId: article.id }, 'Publish notification fan-out failed');
  }
}

// ---------- GET /api/articles ----------
router.get('/', optionalAuth, validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const q = req.query;
  // Only admins may look beyond published articles.
  const status = isAdmin(req) ? (q.status || 'published') : 'published';

  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };
  if (status !== 'all') add('a.status = ?', status);
  if (q.search) {
    params.push(`%${q.search}%`);
    where.push(`(a.title ILIKE $${params.length} OR a.content ILIKE $${params.length})`);
  }
  if (q.category_id) add('a.category_id = ?', q.category_id);
  if (q.author_id) add('a.author_id = ?', q.author_id);
  if (q.featured) add('a.is_featured = ?', q.featured === 'true');
  if (q.make) add('lower(a.make) = lower(?)', q.make);
  if (q.type) add('a.article_type = ?', q.type);
  if (q.has_specs === 'true') where.push('a.specs IS NOT NULL');
  if (q.has_specs === 'false') where.push('a.specs IS NULL');
  if (q.q) {
    const ts = await buildTextSearch(pool, q.q, params.length + 1);
    params.push(...ts.params);
    where.push(ts.sql);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const order = {
    oldest: 'a.created_at ASC',
    popular: 'a.view_count DESC NULLS LAST, a.created_at DESC',
    latest: 'a.published_at DESC NULLS LAST, a.created_at DESC',
    title: 'a.title ASC',
    newest: 'a.created_at DESC',
  }[q.sort || 'newest'];

  const listSql = `
    SELECT ${ARTICLE_LIST_COLUMNS}
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    ${whereSql}
    ORDER BY ${order}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [list, count] = await Promise.all([
    pool.query(listSql, [...params, q.limit, q.offset]),
    pool.query(`SELECT COUNT(*) AS total FROM articles a ${whereSql}`, params),
  ]);
  const total = parseInt(count.rows[0].total, 10);
  const pages = Math.ceil(total / q.limit);

  res.json({
    articles: list.rows.map((row) => toListArticle(row, req)),
    pagination: {
      total,
      limit: q.limit,
      offset: q.offset,
      pages,
      totalPages: pages,
      currentPage: Math.floor(q.offset / q.limit) + 1,
    },
  });
}));

// ---------- GET /api/articles/:id  (id or slug) ----------
router.get('/:id', optionalAuth, validate({ params: idOrSlugParams }), asyncHandler(async (req, res) => {
  const article = await findArticle(req.params.id, { publishedOnly: !isAdmin(req), req });
  if (!article) throw AppError.notFound('Article not found');

  const relatedArticles = await findRelated(pool, article, { limit: 3, req });
  res.json({ data: article, relatedArticles });
}));

// ---------- POST /api/articles/:id/view ----------
router.post('/:id/view', validate({ params: idOrSlugParams }), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const numeric = /^\d+$/.test(id);
  const found = await pool.query(
    `SELECT id FROM articles WHERE ${numeric ? 'id = $1' : 'slug = $1'} AND status = 'published'`,
    [numeric ? Number(id) : id],
  );
  if (found.rows.length === 0) throw AppError.notFound('Article not found');
  const articleId = found.rows[0].id;

  if (!viewDedupe.shouldCount(articleId, req.ip)) return res.json({ message: 'Already viewed' });
  await withTransaction(async (client) => {
    await client.query('UPDATE articles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [articleId]);
    await client.query(
      `INSERT INTO article_views_daily (article_id, day, views) VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (article_id, day) DO UPDATE SET views = article_views_daily.views + 1`,
      [articleId],
    );
  });
  res.json({ message: 'View count updated' });
}));

// ---------- POST /api/articles  (admin) ----------
router.post('/', authenticateToken, requireRole('admin'), parseSingle('featured_image'), asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body ?? {});
  const slug = body.slug || slugify(body.title);
  if (!slug) throw AppError.badRequest('Could not derive a slug from the title; provide one', 'INVALID_SLUG');
  const content = sanitizeArticleHtml(body.content);
  if (!content.trim()) throw AppError.badRequest('Content is empty after sanitizing', 'EMPTY_CONTENT');

  await assertCategoryExists(pool, body.category_id);
  await assertSlugFree(pool, slug);

  const imageUrl = await storeUploadedImage(req.file, 'articles');
  let articleId;
  try {
    articleId = await withTransaction(async (client) => {
      const ins = await client.query(
        `INSERT INTO articles (title, slug, excerpt, content, author_id, category_id,
           featured_image_url, featured_image_alt, status, published_at,
           dek, make, article_type, is_featured, specs, reading_time_min,
           seo_title, seo_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING id`,
        [
          body.title, slug, body.excerpt ?? null, content, req.user.id, body.category_id,
          imageUrl, body.featured_image_alt ?? null, body.status,
          body.status === 'published' ? new Date() : null,
          body.dek ?? null, body.make ?? null, body.article_type ?? 'feature', body.is_featured ?? false,
          body.specs ? JSON.stringify(body.specs) : null, readingTimeMin(content),
          body.seo_title ?? null, body.seo_description ?? null,
        ],
      );
      const id = ins.rows[0].id;
      if (body.tags !== undefined) await replaceTags(client, id, body.tags);
      if (body.gallery !== undefined) await replaceGallery(client, id, body.gallery);
      return id;
    });
  } catch (err) {
    if (imageUrl) await deleteImage(imageUrl);
    throw err;
  }

  const article = await findArticle(articleId, { publishedOnly: false, req });
  if (body.status === 'published') await notifySafely(article, req.user.id);

  res.status(201).json({
    message: body.status === 'published' ? 'Article published successfully' : 'Article saved as draft',
    article,
  });
}));

// ---------- PUT /api/articles/:id  (admin) ----------
router.put('/:id', authenticateToken, requireRole('admin'), validate({ params: idParams }), parseSingle('featured_image'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const body = updateSchema.parse(req.body ?? {});

  const existing = await pool.query('SELECT id, slug, status, featured_image_url FROM articles WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw AppError.notFound('Article not found');
  const current = existing.rows[0];

  if (body.slug && body.slug !== current.slug) await assertSlugFree(pool, body.slug, id);
  if (body.category_id) await assertCategoryExists(pool, body.category_id);

  const sets = [];
  const values = [];
  const set = (col, value) => {
    values.push(value);
    sets.push(`${col} = $${values.length}`);
  };

  if (body.title !== undefined) set('title', body.title);
  if (body.slug !== undefined) set('slug', body.slug);
  if (body.excerpt !== undefined) set('excerpt', body.excerpt || null);
  if (body.content !== undefined) {
    const content = sanitizeArticleHtml(body.content);
    if (!content.trim()) throw AppError.badRequest('Content is empty after sanitizing', 'EMPTY_CONTENT');
    set('content', content);
    set('reading_time_min', readingTimeMin(content));
  }
  if (body.dek !== undefined) set('dek', body.dek);
  if (body.make !== undefined) set('make', body.make);
  if (body.article_type !== undefined) set('article_type', body.article_type);
  if (body.is_featured !== undefined) set('is_featured', body.is_featured);
  if (body.specs !== undefined) set('specs', body.specs ? JSON.stringify(body.specs) : null);
  if (body.seo_title !== undefined) set('seo_title', body.seo_title);
  if (body.seo_description !== undefined) set('seo_description', body.seo_description);
  if (body.category_id !== undefined) set('category_id', body.category_id);
  if (body.featured_image_alt !== undefined) set('featured_image_alt', body.featured_image_alt || null);
  let becamePublished = false;
  if (body.status !== undefined) {
    set('status', body.status);
    if (body.status === 'published' && current.status !== 'published') {
      set('published_at', new Date());
      becamePublished = true;
    }
  }

  const newImageUrl = await storeUploadedImage(req.file, 'articles');
  let oldImageToDelete = null;
  if (newImageUrl) {
    set('featured_image_url', newImageUrl);
    oldImageToDelete = current.featured_image_url;
  } else if (body.remove_image === 'true') {
    set('featured_image_url', null);
    oldImageToDelete = current.featured_image_url;
  }
  sets.push('updated_at = CURRENT_TIMESTAMP');

  try {
    await withTransaction(async (client) => {
      values.push(id);
      await client.query(`UPDATE articles SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
      if (body.tags !== undefined) await replaceTags(client, id, body.tags);
      if (body.gallery !== undefined) await replaceGallery(client, id, body.gallery);
    });
  } catch (err) {
    if (newImageUrl) await deleteImage(newImageUrl);
    throw err;
  }
  // Delete the replaced file only after the DB no longer references it.
  if (oldImageToDelete) await deleteImage(oldImageToDelete);

  const article = await findArticle(id, { publishedOnly: false, req });
  if (becamePublished) await notifySafely(article, req.user.id);
  res.json({ message: 'Article updated successfully', article });
}));

// ---------- DELETE /api/articles/:id  (admin) ----------
router.delete('/:id', authenticateToken, requireRole('admin'), validate({ params: idParams }), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const deleted = await withTransaction(async (client) => {
    await client.query('DELETE FROM article_tags WHERE article_id = $1', [id]);
    const r = await client.query('DELETE FROM articles WHERE id = $1 RETURNING id, title, featured_image_url', [id]);
    return r.rows[0] || null;
  });
  if (!deleted) throw AppError.notFound('Article not found');

  await deleteImage(deleted.featured_image_url);
  logger.info({ userId: req.user.id, articleId: deleted.id }, 'Article deleted');
  res.json({ message: 'Article deleted successfully', deletedId: deleted.id });
}));

export { toPublicArticle };
export default router;
