import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  resetPassword
} from './profileHandlers.js';

const router = express.Router();

// Routes
router.get('/', authenticateToken, getProfile);
router.put('/update', authenticateToken, updateProfile);
router.put('/reset-password', authenticateToken, resetPassword);

export default router;
