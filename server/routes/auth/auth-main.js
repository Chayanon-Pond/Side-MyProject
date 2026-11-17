import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { config } from '../../config/env.js';
import { authenticateToken, signToken } from '../../middleware/auth.js';
import { parseSingle, storeUploadedImage } from '../../middleware/upload.js';
import { deleteImage } from '../../lib/storage.js';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { validate, z, emptyToUndefined } from '../../lib/validate.js';
import { sendPasswordResetEmail } from '../../lib/mailer.js';
import logger from '../../lib/logger.js';

const router = Router();

const RESET_TOKEN_TTL_MINUTES = 30;

const email = z.string().trim().toLowerCase().email().max(255);
const password = z.string().min(6, 'must be at least 6 characters').max(128);
const username = z.string().trim().min(2).max(100);
const fullName = z.string().trim().min(1).max(255);

const registerSchema = z.object({ fullName, username, email, password });
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
const forgotSchema = z.object({ email: z.string().trim().toLowerCase().max(255) });
const resetWithTokenSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'invalid token format'),
  newPassword: password,
});
const profileSchema = z.object({
  full_name: fullName,
  username,
  email,
  bio: emptyToUndefined(z.string().trim().max(280, 'Bio is too long (max 280 characters)').optional()),
});

const publicUser = (u) => ({
  id: u.id,
  fullName: u.full_name,
  username: u.username,
  email: u.email,
  role: u.role,
});

let dummyHash;
async function burnCompare(pw) {
  // Equalize timing when the user does not exist.
  dummyHash ||= await bcrypt.hash('timing-equalizer', config.bcryptRounds);
  await bcrypt.compare(pw, dummyHash);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// POST /api/auth/register
router.post('/register', validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  const { fullName: full_name, username: uname, email: mail, password: pw } = req.body;

  const existing = await pool.query(
    'SELECT id FROM users WHERE lower(email) = $1 OR lower(username) = lower($2)',
    [mail, uname],
  );
  if (existing.rows.length > 0) {
    throw AppError.badRequest('User with this email or username already exists', 'USER_EXISTS');
  }

  const hash = await bcrypt.hash(pw, config.bcryptRounds);
  const result = await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'user')
     RETURNING id, full_name, username, email, role`,
    [full_name, uname, mail, hash],
  );
  const user = result.rows[0];
  logger.info({ userId: user.id }, 'User registered');

  res.status(201).json({ message: 'User registered successfully', user: publicUser(user), token: signToken(user) });
}));

// POST /api/auth/login
router.post('/login', validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { email: mail, password: pw } = req.body;
  const result = await pool.query(
    'SELECT id, full_name, username, email, password_hash, role FROM users WHERE lower(email) = $1',
    [mail],
  );
  const user = result.rows[0];
  if (!user) {
    await burnCompare(pw);
    throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }
  const ok = await bcrypt.compare(pw, user.password_hash);
  if (!ok) throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

  logger.info({ userId: user.id }, 'User logged in');
  res.json({ message: 'Login successful', user: publicUser(user), token: signToken(user) });
}));

// PUT /api/auth/profile  (multipart: full_name, username, email, bio, profile_image?)
router.put('/profile', authenticateToken, parseSingle('profile_image'), asyncHandler(async (req, res) => {
  const body = profileSchema.parse(req.body ?? {});
  const userId = req.user.id;

  const clash = await pool.query(
    'SELECT id FROM users WHERE (lower(email) = $1 OR lower(username) = lower($2)) AND id <> $3',
    [body.email, body.username, userId],
  );
  if (clash.rows.length > 0) throw AppError.badRequest('Email or username already exists', 'USER_EXISTS');

  const old = await pool.query('SELECT profile_image_url FROM users WHERE id = $1', [userId]);
  if (old.rows.length === 0) throw AppError.notFound('User not found');

  const newImageUrl = await storeUploadedImage(req.file, 'profiles');

  let updated;
  try {
    const params = [body.full_name, body.username, body.email, body.bio ?? null];
    let sql = 'UPDATE users SET full_name = $1, username = $2, email = $3, bio = $4, updated_at = CURRENT_TIMESTAMP';
    if (newImageUrl) {
      params.push(newImageUrl);
      sql += `, profile_image_url = $${params.length}`;
    }
    params.push(userId);
    sql += ` WHERE id = $${params.length}
      RETURNING id, full_name, username, email, bio, profile_image_url, role, created_at, updated_at`;
    updated = (await pool.query(sql, params)).rows[0];
  } catch (err) {
    if (newImageUrl) await deleteImage(newImageUrl);
    throw err;
  }

  if (newImageUrl && old.rows[0].profile_image_url) await deleteImage(old.rows[0].profile_image_url);

  res.json({ message: 'Profile updated successfully', user: updated });
}));

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) throw AppError.notFound('User not found');
  const { password_hash } = result.rows[0];

  if (!(await bcrypt.compare(currentPassword, password_hash))) {
    // 400 (not 401) so clients do not treat it as an expired session.
    throw AppError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');
  }
  if (await bcrypt.compare(newPassword, password_hash)) {
    throw AppError.badRequest('New password must be different from current password', 'SAME_PASSWORD');
  }
  const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user.id]);
  res.json({ message: 'Password updated successfully' });
}

// PUT /api/auth/reset-password  (logged-in password change)
router.put('/reset-password', authenticateToken, validate({ body: changePasswordSchema }), asyncHandler(changePassword));

// POST /api/auth/forgot-password  -> always 200 (no account enumeration)
router.post('/forgot-password', validate({ body: forgotSchema }), asyncHandler(async (req, res) => {
  const generic = { message: 'If an account exists for that email, a reset link has been sent.' };
  const parsed = email.safeParse(req.body.email);
  if (!parsed.success) return res.json(generic);

  const result = await pool.query('SELECT id, email FROM users WHERE lower(email) = $1', [parsed.data]);
  const user = result.rows[0];
  if (!user) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  await withTransaction(async (client) => {
    // Only the newest link stays valid.
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id],
    );
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${RESET_TOKEN_TTL_MINUTES} minutes')`,
      [user.id, sha256(token)],
    );
  });

  // Matches the client route /reset-password/:token
  const base = (process.env.PASSWORD_RESET_URL || `${config.appBaseUrl}/reset-password`).replace(/\/+$/, '');
  const link = `${base}/${token}`;
  try {
    await sendPasswordResetEmail(user.email, link);
  } catch (err) {
    logger.error({ err: { message: err?.message }, userId: user.id }, 'Failed to send reset email');
  }
  res.json(generic);
}));

// POST /api/auth/reset-password-token  { token, newPassword }
router.post('/reset-password-token', validate({ body: resetWithTokenSchema }), asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const hash = await bcrypt.hash(newPassword, config.bcryptRounds);

  const userId = await withTransaction(async (client) => {
    // Atomic single-use: only one request can flip used_at.
    const claimed = await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id`,
      [sha256(token)],
    );
    if (claimed.rows.length === 0) return null;
    const uid = claimed.rows[0].user_id;
    await client.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, uid]);
    return uid;
  });

  if (!userId) throw AppError.badRequest('Reset link is invalid or has expired', 'INVALID_RESET_TOKEN');
  logger.info({ userId }, 'Password reset via token');
  res.json({ message: 'Password has been reset. You can now log in.' });
}));

export { changePassword, changePasswordSchema };
export default router;
