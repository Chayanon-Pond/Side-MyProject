import express from 'express';
import pool from '../../db/pool.js';
import { authenticateToken } from '../../middleware/auth.js';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { validate, z, emptyToUndefined } from '../../lib/validate.js';
import { changePassword, changePasswordSchema } from '../auth/auth-main.js';

const router = express.Router();

const USER_COLUMNS = 'id, full_name, username, email, bio, profile_image_url, role, created_at, updated_at';

// GET /api/profile
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
  if (result.rows.length === 0) throw AppError.notFound('User not found');
  res.json(result.rows[0]);
}));

const updateSchema = z.object({
  full_name: z.string().trim().min(1).max(255),
  username: z.string().trim().min(2).max(100),
  bio: emptyToUndefined(z.string().trim().max(280, 'Bio is too long (max 280 characters)').optional()),
  // Only image URLs produced by our own upload flow / https URLs are accepted.
  profile_image_url: emptyToUndefined(
    z.string().max(500).regex(/^(https:\/\/|\/uploads\/)/, 'must be an https or /uploads/ URL').optional(),
  ),
});

// PUT /api/profile/update  (JSON; use PUT /api/auth/profile for image upload)
router.put('/update', authenticateToken, validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const { full_name, username, bio, profile_image_url } = req.body;
  const taken = await pool.query('SELECT id FROM users WHERE lower(username) = lower($1) AND id <> $2', [username, req.user.id]);
  if (taken.rows.length > 0) throw AppError.badRequest('Username is already taken', 'USERNAME_TAKEN');

  const result = await pool.query(
    `UPDATE users
       SET full_name = $1, username = $2,
           bio = COALESCE($3, bio),
           profile_image_url = COALESCE($4, profile_image_url),
           updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING ${USER_COLUMNS}`,
    [full_name, username, bio ?? null, profile_image_url ?? null, req.user.id],
  );
  if (result.rows.length === 0) throw AppError.notFound('User not found');
  res.json({ message: 'Profile updated successfully', user: result.rows[0] });
}));

// PUT /api/profile/reset-password  (same as PUT /api/auth/reset-password)
router.put('/reset-password', authenticateToken, validate({ body: changePasswordSchema }), asyncHandler(changePassword));

export default router;
