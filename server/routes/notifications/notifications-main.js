import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification
} from './notifications-handlers.js';

const notificationsRouter = express.Router();

// All routes require authentication
notificationsRouter.use(authenticateToken);

// GET routes
notificationsRouter.get('/', getNotifications);

// PUT routes
notificationsRouter.put('/:id/read', markNotificationAsRead);
notificationsRouter.put('/mark-all-read', markAllNotificationsAsRead);

// POST routes
notificationsRouter.post('/', createNotification);

// DELETE routes
notificationsRouter.delete('/:id', deleteNotification);

export default notificationsRouter;
