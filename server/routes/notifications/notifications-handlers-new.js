import connectionPool from '../../utils/database.js';

// Get notifications for the authenticated user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.created_at,
        n.updated_at,
        u.full_name as sender_name,
        u.profile_image as sender_avatar,
        n.link
      FROM notifications n
      LEFT JOIN users u ON (n.data::json->>'sender_id')::int = u.id
      WHERE n.user_id = $1
    `;

    const params = [userId];
    let paramCount = 1;

    // Apply filter
    if (filter === 'unread') {
      query += ` AND n.is_read = false`;
    } else if (filter === 'read') {
      query += ` AND n.is_read = true`;
    }

    // Add ordering and pagination
    query += ` ORDER BY n.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await connectionPool.query(query, params);

    // Get unread count
    const unreadCountResult = await connectionPool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    // Process notifications to add action text
    const notifications = result.rows.map(notification => {
      let action = '';
      switch (notification.type) {
        case 'comment':
          action = 'commented on the article you have commented on.';
          break;
        case 'article_published':
          action = 'published new article.';
          break;
        case 'like':
          action = 'liked your comment.';
          break;
        default:
          action = notification.title || 'sent you a notification.';
      }
      
      return {
        ...notification,
        action
      };
    });

    res.json({
      notifications,
      unreadCount: parseInt(unreadCountResult.rows[0].unread_count),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    await connectionPool.query(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await connectionPool.query(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new notification
export const createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, data, link } = req.body;

    const result = await connectionPool.query(
      `INSERT INTO notifications (user_id, type, title, message, data, link, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, type, title, message, JSON.stringify(data || {}), link]
    );

    res.status(201).json({
      message: 'Notification created successfully',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    await connectionPool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
