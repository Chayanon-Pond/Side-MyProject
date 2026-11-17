import pool from '../../db/pool.js';
import { AppError } from '../../lib/errors.js';
import logger from '../../lib/logger.js';

export const NOTIFICATION_TYPES = ['comment', 'like', 'article_published', 'mention', 'system'];

const ACTION_TEXT = {
  comment: 'commented on the article you have commented on.',
  article_published: 'published new article.',
  like: 'liked your comment.',
};

// GET /api/notifications
export const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const { filter, limit, offset } = req.query;

  let sql = `
    SELECT n.id, n.type, n.title, n.message, n.data, n.is_read, n.created_at, n.updated_at,
           u.full_name AS sender_name, u.profile_image_url AS sender_avatar
    FROM notifications n
    LEFT JOIN users u ON COALESCE(n.data->>'sender_id', '') = u.id::text
    WHERE n.user_id = $1`;
  if (filter === 'unread') sql += ' AND n.is_read = false';
  else if (filter === 'read') sql += ' AND n.is_read = true';
  sql += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';

  const [result, unread] = await Promise.all([
    pool.query(sql, [userId, limit, offset]),
    pool.query('SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
  ]);

  const notifications = result.rows.map((n) => ({ ...n, action: ACTION_TEXT[n.type] || n.title }));
  res.json({
    notifications,
    unreadCount: parseInt(unread.rows[0].unread_count, 10),
    total: notifications.length,
  });
};

// PUT /api/notifications/:id/read
export const markNotificationAsRead = async (req, res) => {
  const result = await pool.query(
    'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params.id, req.user.id],
  );
  if (result.rows.length === 0) throw AppError.notFound('Notification not found');
  res.json({ message: 'Notification marked as read', notification: result.rows[0] });
};

// PUT /api/notifications/mark-all-read
export const markAllNotificationsAsRead = async (req, res) => {
  await pool.query(
    'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
    [req.user.id],
  );
  res.json({ message: 'All notifications marked as read' });
};

// DELETE /api/notifications/:id  (owner only; someone else's id -> 404, no existence leak)
export const deleteNotification = async (req, res) => {
  const result = await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
  if (result.rows.length === 0) throw AppError.notFound('Notification not found');
  res.json({ message: 'Notification deleted successfully', deletedId: result.rows[0].id });
};

// POST /api/notifications  (admin)
export const createNotification = async (req, res) => {
  const { user_id, type, title, message, data } = req.body;
  const user = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
  if (user.rows.length === 0) throw AppError.badRequest('Target user does not exist', 'INVALID_USER');
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [user_id, type, title, message, JSON.stringify({ ...(data || {}), sender_id: req.user.id })],
  );
  res.status(201).json({ message: 'Notification created successfully', notification: result.rows[0] });
};

/** Internal helper used by other modules. Never throws. */
export const createNotificationHelper = async (userId, type, title, message, data = null) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [userId, type, title, message, JSON.stringify(data || {})],
    );
  } catch (err) {
    logger.warn({ err: { message: err?.message }, type }, 'Create notification helper failed');
  }
};
