import multer from 'multer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '../lib/errors.js';
import { saveImage } from '../lib/storage.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_WIDTH = 2000;

// Files are kept in memory only long enough to validate + re-encode; nothing touches
// disk unless the local storage adapter is in use.
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 30 },
});

/** multer single-file parser that forwards errors to the central handler. */
export function parseSingle(field) {
  const mw = memoryUpload.single(field);
  return (req, res, next) => mw(req, res, (err) => next(err || undefined));
}

/**
 * Validate by magic bytes (never trust the extension/mimetype header), then re-encode to
 * WebP (max 2000px wide, quality 80). Strips EXIF/metadata as a side effect.
 */
export async function processImage(buffer) {
  if (!buffer || buffer.length === 0) throw AppError.badRequest('Empty file', 'INVALID_IMAGE');
  if (buffer.length > MAX_UPLOAD_BYTES) throw AppError.badRequest('File too large (max 5MB)', 'UPLOAD_TOO_LARGE');
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_MIME.has(type.mime)) {
    throw AppError.badRequest('Only JPEG, PNG or WebP images are allowed', 'INVALID_IMAGE');
  }
  try {
    return await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw AppError.badRequest('Image could not be processed', 'INVALID_IMAGE');
  }
}

/** Validate + re-encode + persist req.file. Returns the stored URL or null if no file. */
export async function storeUploadedImage(file, folder) {
  if (!file) return null;
  const webp = await processImage(file.buffer);
  return saveImage(webp, { folder, ext: 'webp' });
}
