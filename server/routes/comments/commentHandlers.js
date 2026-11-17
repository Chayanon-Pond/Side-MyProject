import pool from '../../db/pool.js';
import { AppError } from '../../lib/errors.js';
import { createNotificationHelper } from '../notifications/notifications-handlers.js';
import logger from '../../lib/logger.js';

// Explicit columns: user email is never selected for public comment payloads.
const COMMENT_COLUMNS = `
  c.id, c.content, c.parent_id, c.status, c.created_at, c.updated_at,
  u.id AS user_id, u.full_name AS user_name, u.username AS user_username,
  u.profile_image_url AS user_avatar`;

// GET /api/comments/article/:articleId
// Pagination applies to top-level comments (newest first); every approved reply below a
// returned comment is attached, so a page never shows a reply without its parent.
// pagination.total counts top-level comments (what "load more" pages over);
// total_comments counts every approved comment including replies (what the UI shows).
export const getCommentsByArticle = async (req, res) => {
  const { articleId } = req.params;
  const { limit, offset } = req.query;

  const [top, replies, count] = await Promise.all([
    pool.query(
      `SELECT ${COMMENT_COLUMNS}
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.article_id = $1 AND c.status = 'approved' AND c.parent_id IS NULL
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $2 OFFSET $3`,
      [articleId, limit, offset],
    ),
    pool.query(
      `SELECT ${COMMENT_COLUMNS}
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.article_id = $1 AND c.status = 'approved' AND c.parent_id IS NOT NULL
       ORDER BY c.created_at ASC, c.id ASC`,
      [articleId],
    ),
    pool.query(
      `SELECT COUNT(*) AS all_total,
              SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) AS top_total
       FROM comments WHERE article_id = $1 AND status = 'approved'`,
      [articleId],
    ),
  ]);
  const total = parseInt(count.rows[0].top_total ?? 0, 10) || 0;
  const totalComments = parseInt(count.rows[0].all_total, 10);

  const byId = new Map();
  const topLevel = top.rows.map((c) => {
    const node = { ...c, replies: [] };
    byId.set(c.id, node);
    return node;
  });
  // Replies may nest; attach each to its parent once the parent is known.
  let pending = replies.rows;
  while (pending.length) {
    const next = [];
    for (const c of pending) {
      const parent = byId.get(c.parent_id);
      if (!parent) {
        next.push(c);
        continue;
      }
      const node = { ...c, replies: [] };
      byId.set(c.id, node);
      parent.replies.push(node);
    }
    if (next.length === pending.length) break; // remaining replies belong to other pages
    pending = next;
  }

  const pages = Math.ceil(total / limit);
  res.json({
    comments: topLevel,
    total_comments: totalComments,
    pagination: { total, limit, offset, pages, totalPages: pages, currentPage: Math.floor(offset / limit) + 1 },
  });
};

// POST /api/comments/article/:articleId
export const createComment = async (req, res) => {
  const { articleId } = req.params;
  const { content, parent_id } = req.body;
  const userId = req.user.id;

  const article = await pool.query(
    "SELECT id, author_id, title, slug FROM articles WHERE id = $1 AND status = 'published'",
    [articleId],
  );
  if (article.rows.length === 0) throw AppError.notFound('Article not found');
  const articleInfo = article.rows[0];

  let parentUserId = null;
  if (parent_id) {
    const parent = await pool.query('SELECT id, user_id FROM comments WHERE id = $1 AND article_id = $2', [parent_id, articleId]);
    if (parent.rows.length === 0) throw AppError.notFound('Parent comment not found');
    parentUserId = parent.rows[0].user_id;
  }

  const inserted = await pool.query(
    `INSERT INTO comments (article_id, user_id, parent_id, content, status)
     VALUES ($1, $2, $3, $4, 'approved') RETURNING id`,
    [articleId, userId, parent_id ?? null, content],
  );
  const commentId = inserted.rows[0].id;
  const comment = (await pool.query(
    `SELECT ${COMMENT_COLUMNS} FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
    [commentId],
  )).rows[0];

  // Best-effort notifications (never fail the request).
  try {
    const who = comment.user_username || 'Someone';
    const authorId = articleInfo.author_id;
    if (authorId && authorId !== userId) {
      await createNotificationHelper(authorId, 'comment', 'New comment on your article',
        `${who} commented on "${articleInfo.title}"`,
        { article_id: articleInfo.id, comment_id: commentId, slug: articleInfo.slug, sender_id: userId });
    }
    if (parentUserId && parentUserId !== userId && parentUserId !== authorId) {
      await createNotificationHelper(parentUserId, 'comment', 'New reply to your comment',
        `${who} replied to your comment on "${articleInfo.title}"`,
        { article_id: articleInfo.id, comment_id: commentId, parent_id, slug: articleInfo.slug, sender_id: userId });
    }
  } catch (err) {
    logger.warn({ err: { message: err?.message }, commentId }, 'Comment notification failed');
  }

  logger.info({ userId, articleId: articleInfo.id, commentId }, 'Comment created');
  res.status(201).json({ message: 'Comment created successfully', comment });
};

async function loadOwnedComment(commentId, req, action) {
  const r = await pool.query('SELECT id, user_id FROM comments WHERE id = $1', [commentId]);
  if (r.rows.length === 0) throw AppError.notFound('Comment not found');
  const isOwner = r.rows[0].user_id === req.user.id;
  // Admins may delete (moderate) any comment; only owners may edit.
  if (!isOwner && !(action === 'delete' && req.user.role === 'admin')) {
    throw AppError.forbidden(`You can only ${action} your own comments`, 'NOT_OWNER');
  }
  return r.rows[0];
}

// PUT /api/comments/:commentId
export const updateComment = async (req, res) => {
  const { commentId } = req.params;
  await loadOwnedComment(commentId, req, 'edit');
  const result = await pool.query(
    `UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
     RETURNING id, article_id, user_id, parent_id, content, status, created_at, updated_at`,
    [req.body.content, commentId],
  );
  res.json({ message: 'Comment updated successfully', comment: result.rows[0] });
};

// DELETE /api/comments/:commentId
export const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  await loadOwnedComment(commentId, req, 'delete');
  await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
  res.json({ message: 'Comment deleted successfully' });
};
