import express from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { validate, z, numericString, paginationQuery } from '../../lib/validate.js';
import {
  NOTIFICATION_TYPES,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
} from './notifications-handlers.js';

const router = express.Router();

const idParams = z.object({ id: numericString('id') });
const listQuery = z.object({
  filter: z.enum(['all', 'unread', 'read']).default('all'),
  ...paginationQuery,
  limit: paginationQuery.limit.default(50),
});
const createBody = z.object({
  user_id: z.coerce.number().int().positive().max(2147483647),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).optional(),
});

router.get('/', authenticateToken, validate({ query: listQuery }), asyncHandler(getNotifications));
router.put('/mark-all-read', authenticateToken, asyncHandler(markAllNotificationsAsRead));
router.put('/:id/read', authenticateToken, validate({ params: idParams }), asyncHandler(markNotificationAsRead));
router.delete('/:id', authenticateToken, validate({ params: idParams }), asyncHandler(deleteNotification));
router.post('/', authenticateToken, requireRole('admin'), validate({ body: createBody }), asyncHandler(createNotification));

export default router;
