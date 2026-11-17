/**
 * Image storage adapter.
 *
 * - CLOUDINARY_URL set  -> images go to Cloudinary (folder "side-myproject/<sub>"), the
 *   returned value is the https secure_url. Survives every deploy. RECOMMENDED.
 * - otherwise           -> images are written to UPLOAD_DIR (default server/uploads) and
 *   served at /uploads/<sub>/<file>. On Railway the container filesystem is ephemeral:
 *   anything written there is wiped on every deploy/restart UNLESS a Railway Volume is
 *   mounted at UPLOAD_DIR. This is exactly why admin-uploaded images used to vanish.
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CLOUDINARY_ROOT_FOLDER = 'side-myproject';
export const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

export function getUploadDir() {
  return config.uploadDir ? path.resolve(config.uploadDir) : DEFAULT_UPLOAD_DIR;
}

export function usingCloudinary() {
  return !!process.env.CLOUDINARY_URL;
}

/**
 * Returns a warning string when uploads will not survive a redeploy, else null.
 * Production only: neither CLOUDINARY_URL nor UPLOAD_DIR (volume) configured.
 */
export function persistenceWarning() {
  if (!config.isProduction) return null;
  if (usingCloudinary()) return null;
  if (process.env.UPLOAD_DIR) return null;
  return 'Image uploads are stored on the container filesystem and WILL BE LOST on every deploy. Set CLOUDINARY_URL (recommended) or mount a Railway Volume and set UPLOAD_DIR to its mount path.';
}

function randomName() {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

async function saveCloudinary(buffer, sub) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${CLOUDINARY_ROOT_FOLDER}/${sub}`,
        public_id: randomName(),
        resource_type: 'image',
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url)),
    );
    stream.end(buffer);
  });
}

async function saveLocal(buffer, sub, ext) {
  const dir = path.join(getUploadDir(), sub);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomName()}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${sub}/${filename}`;
}

/**
 * Persist an already-validated image buffer.
 * @param {Buffer} buffer
 * @param {{ folder: 'articles'|'profiles', ext?: string }} opts
 * @returns {Promise<string>} public URL (absolute https for Cloudinary, /uploads/... for local)
 */
export async function saveImage(buffer, { folder, ext = 'webp' }) {
  if (!['articles', 'profiles', 'content'].includes(folder)) throw new Error('Invalid storage folder');
  return usingCloudinary() ? saveCloudinary(buffer, folder) : saveLocal(buffer, folder, ext);
}

/** Extract a Cloudinary public_id from a delivery URL we created; null if not ours. */
export function cloudinaryPublicId(url) {
  const m = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(side-myproject\/.+?)\.[a-z0-9]+$/i.exec(url || '');
  return m ? m[1] : null;
}

/** Resolve a /uploads/... URL to a path inside the upload dir; null if outside/invalid. */
export function localPathFromUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return null;
  const rel = decodeURIComponent(url.slice('/uploads/'.length));
  const root = getUploadDir();
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep)) return null;
  return full;
}

/**
 * Absolute URL for a stored image: https URLs (Cloudinary, external) pass through,
 * /uploads/... gets PUBLIC_API_URL (or the request origin) prepended, anything else -> null.
 * @param {string|null} url
 * @param {import('express').Request} [req]
 */
export function absoluteImageUrl(url, req) {
  if (!url || typeof url !== 'string') return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith('/uploads/')) return null;
  const base = config.publicApiUrl || (req ? `${req.protocol}://${req.get('host')}` : '');
  return base ? `${base}${url}` : url;
}

/** Best-effort delete of an image we stored. Never throws. */
export async function deleteImage(url) {
  if (!url) return;
  try {
    const publicId = cloudinaryPublicId(url);
    if (publicId) {
      if (usingCloudinary()) await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      return;
    }
    const local = localPathFromUrl(url);
    if (local) await fs.unlink(local);
  } catch (err) {
    if (err?.code !== 'ENOENT') logger.warn({ err: { message: err?.message } }, 'Failed to delete stored image');
  }
}
