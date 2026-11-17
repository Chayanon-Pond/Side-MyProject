import pool from '../../db/pool.js';
import { slugify } from '../../lib/slug.js';
import { absoluteImageUrl } from '../../lib/storage.js';

// Explicit column list: never `a.*` joined with users, so no email/password can leak.
const ARTICLE_DETAIL_COLUMNS = `
  a.id, a.title, a.slug, a.excerpt, a.content, a.author_id, a.category_id,
  a.featured_image_url, a.featured_image_alt, a.status, a.view_count,
  a.published_at, a.created_at, a.updated_at,
  a.dek, a.make, a.article_type, a.is_featured, a.specs, a.reading_time_min,
  a.seo_title, a.seo_description,
  c.name AS category_name, c.slug AS category_slug,
  u.full_name AS author_name, u.username AS author_username,
  u.profile_image_url AS author_avatar, u.bio AS author_bio`;

const PUBLIC_ARTICLE_FIELDS = [
  'id', 'title', 'slug', 'excerpt', 'content', 'author_id', 'category_id',
  'featured_image_url', 'featured_image_alt', 'status', 'view_count',
  'published_at', 'created_at', 'updated_at', 'category_name', 'category_slug',
  'author_name', 'author_username', 'author_avatar', 'tags',
  'dek', 'make', 'article_type', 'is_featured', 'reading_time_min', 'author_avatar_url',
  'specs', 'gallery', 'has_specs', 'seo_title', 'seo_description', 'author_bio',
];

/** Columns every list-style article payload carries (GET /api/articles items). */
export const ARTICLE_LIST_COLUMNS = `
  a.id, a.title, a.slug, a.excerpt, a.featured_image_url, a.featured_image_alt,
  a.status, a.view_count, a.published_at, a.created_at, a.updated_at,
  a.dek, a.make, a.article_type, a.is_featured, a.reading_time_min,
  (a.specs IS NOT NULL) AS has_specs,
  c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
  u.id AS author_id, u.full_name AS author_name, u.username AS author_username,
  u.profile_image_url AS author_avatar_raw`;

/** Shape a list row: absolute author avatar URL, no raw user columns. */
export function toListArticle(row, req) {
  const { author_avatar_raw: avatar, ...rest } = row;
  if ('has_specs' in rest) rest.has_specs = Boolean(rest.has_specs);
  return { ...rest, author_avatar_url: absoluteImageUrl(avatar, req) };
}

/** Columns for the "Keep reading" block: enough for a full card (kicker, byline, reading time). */
const RELATED_COLUMNS = `
  a.id, a.title, a.slug, a.excerpt, a.dek, a.featured_image_url, a.featured_image_alt,
  a.published_at, a.created_at, a.make, a.article_type, a.reading_time_min,
  (a.specs IS NOT NULL) AS has_specs,
  c.name AS category_name, c.slug AS category_slug,
  u.full_name AS author_name, u.username AS author_username,
  u.profile_image_url AS author_avatar_raw`;

/**
 * Up to `limit` published articles related to `article`: same make first (newest first),
 * then the same category to fill the remaining slots. Never the article itself.
 */
export async function findRelated(db, article, { limit = 3, req } = {}) {
  const from = `
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id`;
  const picked = [];
  const seen = new Set([article.id]);
  const take = (rows) => {
    for (const r of rows) {
      if (picked.length >= limit) break;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      picked.push(r);
    }
  };
  if (article.make) {
    const r = await db.query(
      `SELECT ${RELATED_COLUMNS} ${from}
       WHERE a.status = 'published' AND a.id <> $1 AND lower(a.make) = lower($2)
       ORDER BY a.published_at DESC NULLS LAST, a.id DESC
       LIMIT $3`,
      [article.id, article.make, limit],
    );
    take(r.rows);
  }
  if (picked.length < limit && article.category_id) {
    const r = await db.query(
      `SELECT ${RELATED_COLUMNS} ${from}
       WHERE a.status = 'published' AND a.id <> $1 AND a.category_id = $2
       ORDER BY a.published_at DESC NULLS LAST, a.id DESC
       LIMIT $3`,
      [article.id, article.category_id, limit * 2 + 1],
    );
    take(r.rows);
  }
  return picked.map((row) => toListArticle(row, req));
}

/** Gallery images ordered by position. */
export async function getGallery(db, articleId) {
  const r = await db.query(
    `SELECT url, caption, credit, width, height FROM article_images
     WHERE article_id = $1 ORDER BY position ASC, id ASC`,
    [articleId],
  );
  return r.rows;
}

/** Replace-all gallery semantics, inside an open transaction. */
export async function replaceGallery(client, articleId, gallery) {
  await client.query('DELETE FROM article_images WHERE article_id = $1', [articleId]);
  let position = 0;
  for (const img of gallery || []) {
    await client.query(
      `INSERT INTO article_images (article_id, url, caption, credit, width, height, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [articleId, img.url, img.caption ?? null, img.credit ?? null, img.width ?? null, img.height ?? null, position],
    );
    position += 1;
  }
}

/** Whitelist projection: defence in depth against leaking user columns. */
export function toPublicArticle(row) {
  if (!row) return row;
  const out = {};
  for (const k of PUBLIC_ARTICLE_FIELDS) if (k in row) out[k] = row[k];
  return out;
}

export async function getTags(db, articleId) {
  const r = await db.query(
    `SELECT t.name FROM article_tags at JOIN tags t ON t.id = at.tag_id
     WHERE at.article_id = $1 ORDER BY t.name ASC`,
    [articleId],
  );
  return r.rows.map((x) => x.name);
}

/**
 * Load one article (by numeric id or slug) with category/author names and tags.
 * @param {{ publishedOnly?: boolean }} opts
 */
export async function findArticle(idOrSlug, { publishedOnly = true, db = pool, req } = {}) {
  const numeric = typeof idOrSlug === 'number' || /^\d+$/.test(String(idOrSlug));
  const params = [numeric ? Number(idOrSlug) : String(idOrSlug)];
  let sql = `
    SELECT ${ARTICLE_DETAIL_COLUMNS}
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.author_id = u.id
    WHERE ${numeric ? 'a.id = $1' : 'a.slug = $1'}`;
  if (publishedOnly) sql += ` AND a.status = 'published'`;
  const r = await db.query(sql, params);
  const row = r.rows[0];
  if (!row) return null;
  row.tags = await getTags(db, row.id);
  row.gallery = await getGallery(db, row.id);
  row.author_avatar_url = absoluteImageUrl(row.author_avatar, req);
  row.specs = row.specs ?? null;
  row.has_specs = row.specs !== null;
  return toPublicArticle(row);
}

export function parseTags(tags) {
  if (tags == null) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(',');
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const name = String(raw).trim().slice(0, 100);
    const slug = slugify(name);
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, slug });
  }
  return out.slice(0, 20);
}

/** Replace an article's tags inside an open transaction. */
export async function replaceTags(client, articleId, tags) {
  await client.query('DELETE FROM article_tags WHERE article_id = $1', [articleId]);
  for (const { name, slug } of parseTags(tags)) {
    const tag = await client.query(
      `INSERT INTO tags (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, slug],
    );
    await client.query(
      'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT (article_id, tag_id) DO NOTHING',
      [articleId, tag.rows[0].id],
    );
  }
}

/**
 * Notify every user except the author with a single INSERT ... SELECT (no N+1).
 * Best-effort: callers log and continue on failure.
 */
export async function notifyArticlePublished(db, { article, authorId }) {
  const author = await db.query('SELECT full_name FROM users WHERE id = $1', [authorId]);
  const authorName = author.rows[0]?.full_name || 'Someone';
  const data = JSON.stringify({ article_id: article.id, author_id: authorId, slug: article.slug, sender_id: authorId });
  return db.query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     SELECT u.id, 'article_published', $1, $2, $3::jsonb
     FROM users u WHERE u.id <> $4`,
    ['New article published', `${authorName} published: ${article.title}`, data, authorId],
  );
}
