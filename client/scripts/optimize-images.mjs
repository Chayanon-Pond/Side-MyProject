#!/usr/bin/env node
/**
 * Build responsive WebP variants of the bundled photos in public/img.
 *
 *   node scripts/optimize-images.mjs
 *
 * Writes public/img/opt/<name>-<width>.webp and src/lib/localImages.json (the width list per photo,
 * used by lib/image.js for srcset and inlined into index.html's boot script by vite.config.js). The original JPEGs stay in place because stored
 * featured_image_url values and old links may still point at /img/<name>.jpg.
 * sharp is borrowed from the server package (it is already a server dependency).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(root, '../server/package.json'));
const sharp = require('sharp');

const SRC = path.join(root, 'public/img');
const OUT = path.join(SRC, 'opt');
const WIDTHS = [240, 480, 768, 1080, 1440, 1920];

await fs.mkdir(OUT, { recursive: true });
const manifest = {};
for (const file of (await fs.readdir(SRC)).filter((f) => /\.jpe?g$/i.test(f)).sort()) {
  const name = file.replace(/\.jpe?g$/i, '');
  const input = path.join(SRC, file);
  const meta = await sharp(input).metadata();
  const widths = WIDTHS.filter((w) => w < meta.width);
  if (!widths.includes(Math.min(meta.width, 1920))) widths.push(Math.min(meta.width, 1920));
  for (const w of widths) {
    await sharp(input).resize({ width: w }).webp({ quality: 72, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.webp`));
  }
  manifest[name] = { widths, ratio: +(meta.width / meta.height).toFixed(4) };
  console.log(`${file}: ${widths.join(', ')}`);
}

await fs.writeFile(path.join(root, 'src/lib/localImages.json'), `${JSON.stringify(manifest, null, 2)}\n`);
