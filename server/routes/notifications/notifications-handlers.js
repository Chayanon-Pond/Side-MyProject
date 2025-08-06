import connectionPool from '../../utils/database.js';

// Get notifications for the authenticated user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Changed from req.user.userId
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
        u.profile_image_url as sender_avatar
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
          action = notification.title;
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

// Mark a specific notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Changed from req.user.userId

    const result = await connectionPool.query(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read for the user
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id; // Changed from req.user.userId

    await connectionPool.query(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Changed from req.user.userId

    const result = await connectionPool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Create a new notification (for system use)
export const createNotification = async (req, res) => {
  try {
    const { user_id, type, title, message, data } = req.body;

    // Validate required fields
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ 
        error: 'user_id, type, title, and message are required' 
      });
    }

    // Validate type
    const validTypes = ['comment', 'like', 'article_published', 'mention', 'system'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid notification type' 
      });
    }

    const result = await connectionPool.query(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [user_id, type, title, message, data ? JSON.stringify(data) : null]
    );

    res.status(201).json({
      message: 'Notification created successfully',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

// Helper function to create notifications (can be used by other parts of the app)
export const createNotificationHelper = async (userId, type, title, message, data = null) => {
  try {
    await connectionPool.query(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );
  } catch (error) {
    console.error('Create notification helper error:', error);
  }
};
