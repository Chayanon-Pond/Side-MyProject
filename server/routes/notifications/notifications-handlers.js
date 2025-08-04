import connectionPool from '../../utils/database.js';

// Get notifications for the authenticated user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        id,
        type,
        title,
        message,
        data,
        is_read,
        created_at,
        updated_at
      FROM notifications 
      WHERE user_id = $1
    `;

    const params = [userId];
    let paramCount = 1;

    // Apply filter
    if (filter === 'unread') {
      query += ` AND is_read = false`;
    } else if (filter === 'read') {
      query += ` AND is_read = true`;
    }

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC`;
    
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

    res.json({
      data: result.rows,
      unread_count: parseInt(unreadCountResult.rows[0].unread_count),
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

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
    const userId = req.user.userId;

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
    const userId = req.user.userId;

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
