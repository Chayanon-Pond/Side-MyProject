#!/usr/bin/env node
/**
 * One-off: move images that live on the old ephemeral /uploads disk to Cloudinary and
 * rewrite the DB to the new https URLs.
 *
 *   DATABASE_URL=...  SOURCE_BASE_URL=https://<old-api-host>  CLOUDINARY_URL=cloudinary://...
 *   node scripts/migrate-uploads-to-cloudinary.js            # DRY RUN (default): prints the plan
 *   node scripts/migrate-uploads-to-cloudinary.js --apply    # uploads + rewrites DB in one transaction
 *
 * Scans: articles.featured_image_url, users.profile_image_url, and <img src> / <a href>
 * values inside articles.content that point at /uploads/...
 * Already-absolute URLs that are not /uploads/ on SOURCE_BASE_URL are left alone.
 * Missing / 404 files are logged and skipped (their DB value stays unchanged).
 * Re-runnable: Cloudinary public_ids are derived from the original path.
 */
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { v2 as cloudinary } from 'cloudinary';
import { getPool, closePool } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { CLOUDINARY_ROOT_FOLDER } from '../lib/storage.js';

const APPLY = process.argv.includes('--apply');
const SOURCE_BASE_URL = (process.env.SOURCE_BASE_URL || '').replace(/\/+$/, '');
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

/** Return the "/uploads/..." path for a value we should migrate, else null. */
export function uploadsPath(value, sourceBase = SOURCE_BASE_URL) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim();
  if (v.startsWith('/uploads/')) return v.split(/[?#]/)[0];
  if (v.startsWith('uploads/')) return `/${v.split(/[?#]/)[0]}`;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const src = sourceBase ? new URL(sourceBase) : null;
      if (src && u.host === src.host && u.pathname.startsWith('/uploads/')) return u.pathname;
    } catch {
      return null;
    }
  }
  return null; // absolute non-uploads URL (Cloudinary, Unsplash, ...) -> skip
}

/** All distinct src/href values inside HTML that point at /uploads/. */
export function contentUploadRefs(html, sourceBase = SOURCE_BASE_URL) {
  const out = new Set();
  const re = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi;
  let m;
  while ((m = re.exec(html || ''))) {
    if (uploadsPath(m[2], sourceBase)) out.add(m[2]);
  }
  return [...out];
}

function folderFor(p, fallback) {
  if (p.startsWith('/uploads/profiles/')) return 'profiles';
  if (p.startsWith('/uploads/articles/')) return 'articles';
  return fallback;
}

function publicIdFor(p) {
  return path.posix.basename(p).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
}

async function download(p) {
  const url = `${SOURCE_BASE_URL}${encodeURI(decodeURI(p))}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  const type = await fileTypeFromBuffer(buf);
  if (!type || !ALLOWED.has(type.mime)) return { error: `not an image (${type?.mime || 'unknown'})` };
  return { buf };
}

async function exists(p) {
  try {
    const res = await fetch(`${SOURCE_BASE_URL}${encodeURI(decodeURI(p))}`, { method: 'HEAD' });
    return res.ok ? null : `HTTP ${res.status}`;
  } catch (err) {
    return err.message;
  }
}

function uploadToCloudinary(buf, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${CLOUDINARY_ROOT_FOLDER}/${folder}`, public_id: publicId, overwrite: false, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url)),
    );
    stream.end(buf);
  });
}

async function main() {
  if (!SOURCE_BASE_URL) fail('SOURCE_BASE_URL is required (the old API origin that still serves /uploads).');
  if (APPLY && !process.env.CLOUDINARY_URL) fail('CLOUDINARY_URL is required with --apply.');
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to execute)'}`);
  console.log(`Source: ${SOURCE_BASE_URL}`);

  const db = getPool();
  const articles = (await db.query('SELECT id, featured_image_url, content FROM articles ORDER BY id')).rows;
  const users = (await db.query('SELECT id, profile_image_url FROM users ORDER BY id')).rows;

  // Collect distinct source paths with their target folder.
  const sources = new Map(); // uploadsPath -> folder
  const plan = { featured: [], profile: [], content: [] };
  for (const a of articles) {
    const p = uploadsPath(a.featured_image_url);
    if (p) {
      sources.set(p, folderFor(p, 'articles'));
      plan.featured.push({ id: a.id, old: a.featured_image_url, path: p });
    }
    for (const ref of contentUploadRefs(a.content)) {
      const rp = uploadsPath(ref);
      sources.set(rp, sources.get(rp) || folderFor(rp, 'content'));
      plan.content.push({ id: a.id, old: ref, path: rp });
    }
  }
  for (const u of users) {
    const p = uploadsPath(u.profile_image_url);
    if (p) {
      sources.set(p, folderFor(p, 'profiles'));
      plan.profile.push({ id: u.id, old: u.profile_image_url, path: p });
    }
  }

  console.log(`Found ${sources.size} distinct file(s): ${plan.featured.length} featured, ${plan.profile.length} profile, ${plan.content.length} in-content reference(s).`);

  // Resolve each source to a new URL (apply) or check reachability (dry run).
  const newUrl = new Map();
  const skipped = [];
  for (const [p, folder] of sources) {
    if (!APPLY) {
      const err = await exists(p);
      if (err) skipped.push({ path: p, reason: err });
      else newUrl.set(p, `<cloudinary:${CLOUDINARY_ROOT_FOLDER}/${folder}/${publicIdFor(p)}>`);
      continue;
    }
    try {
      const { buf, error } = await download(p);
      if (error) {
        skipped.push({ path: p, reason: error });
        continue;
      }
      newUrl.set(p, await uploadToCloudinary(buf, folder, publicIdFor(p)));
      console.log(`  uploaded ${p}`);
    } catch (err) {
      skipped.push({ path: p, reason: err.message });
    }
  }

  const show = (label, rows, key) => {
    for (const r of rows) {
      const target = newUrl.get(r.path);
      console.log(`  [${label} ${key}=${r.id}] ${r.old} -> ${target || 'SKIP (unavailable)'}`);
    }
  };
  console.log('\nPlanned changes:');
  show('article.featured_image_url', plan.featured, 'id');
  show('user.profile_image_url', plan.profile, 'id');
  show('article.content', plan.content, 'id');
  if (skipped.length) {
    console.log('\nSkipped (missing / not an image / error):');
    for (const s of skipped) console.log(`  ${s.path}: ${s.reason}`);
  }

  if (!APPLY) {
    console.log('\nDry run only. Nothing was uploaded or written.');
    return;
  }

  const stats = await withTransaction(async (client) => {
    const s = { featured: 0, profile: 0, content: 0 };
    for (const r of plan.featured) {
      const url = newUrl.get(r.path);
      if (!url) continue;
      const res = await client.query(
        'UPDATE articles SET featured_image_url = $1 WHERE id = $2 AND featured_image_url = $3',
        [url, r.id, r.old],
      );
      s.featured += res.rowCount;
    }
    for (const r of plan.profile) {
      const url = newUrl.get(r.path);
      if (!url) continue;
      const res = await client.query(
        'UPDATE users SET profile_image_url = $1 WHERE id = $2 AND profile_image_url = $3',
        [url, r.id, r.old],
      );
      s.profile += res.rowCount;
    }
    const contentIds = [...new Set(plan.content.map((r) => r.id))];
    for (const id of contentIds) {
      const row = (await client.query('SELECT content FROM articles WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!row) continue;
      let html = row.content;
      for (const r of plan.content.filter((x) => x.id === id)) {
        const url = newUrl.get(r.path);
        if (url) html = html.split(r.old).join(url);
      }
      if (html !== row.content) {
        await client.query('UPDATE articles SET content = $1 WHERE id = $2', [html, id]);
        s.content += 1;
      }
    }
    return s;
  });
  console.log(`\nCommitted: ${stats.featured} featured image(s), ${stats.profile} profile image(s), ${stats.content} article body(ies) rewritten.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'migrate-uploads-to-cloudinary.js'));
if (isMain) {
  main()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('FAILED (no DB changes were committed if this happened before "Committed"):', err.message);
      await closePool().catch(() => {});
      process.exit(1);
    });
}
