import express from 'express';
import sharp from 'sharp';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { parseSingle, processImage } from '../../middleware/upload.js';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { saveImage, absoluteImageUrl } from '../../lib/storage.js';

const router = express.Router();

// POST /api/uploads/image  (admin, multipart field "image") -> 201 { url, width, height }
// Same magic-byte validation + WebP re-encode (<= 2000px wide) as article images.
router.post('/image', authenticateToken, requireRole('admin'), parseSingle('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.badRequest('No image uploaded (multipart field "image")', 'NO_FILE');
  const webp = await processImage(req.file.buffer);
  const { width, height } = await sharp(webp).metadata();
  const stored = await saveImage(webp, { folder: 'content', ext: 'webp' });
  res.status(201).json({ url: absoluteImageUrl(stored, req), width: width ?? null, height: height ?? null });
}));

export default router;
