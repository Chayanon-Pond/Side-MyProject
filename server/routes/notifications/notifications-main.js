import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  createNotification 
} from './notifications-handlers.js';

const notificationsRouter = express.Router();

// Health/test
notificationsRouter.get('/test', (req, res) => {
  res.json({ message: 'Notifications endpoint working', timestamp: new Date().toISOString() });
});

// List notifications for current user
notificationsRouter.get('/', authenticateToken, getNotifications);

// Mark single as read
notificationsRouter.put('/:id/read', authenticateToken, markNotificationAsRead);

// Mark all as read
notificationsRouter.put('/mark-all-read', authenticateToken, markAllNotificationsAsRead);

// Create (system/admin usage)
notificationsRouter.post('/', authenticateToken, createNotification);

export default notificationsRouter;
