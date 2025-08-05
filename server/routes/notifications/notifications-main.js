import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import connectionPool from '../../utils/database.js';

const notificationsRouter = express.Router();

// Simple test endpoint without authentication
notificationsRouter.get('/test', async (req, res) => {
  try {
    res.json({ 
      message: 'Notifications endpoint working',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple notifications endpoint with minimal query
notificationsRouter.get('/', authenticateToken, async (req, res) => {
  try {
    // Simple query to test notifications table
    const result = await connectionPool.query(
      'SELECT id, type, title, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    
    res.json({
      success: true,
      notifications: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      details: error.message 
    });
  }
});

export default notificationsRouter;
