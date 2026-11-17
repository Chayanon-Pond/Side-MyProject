import { assetUrl, FALLBACK_IMAGE } from "./assets";
import LOCAL_IMAGES from "./localImages.json";

const CLOUDINARY_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/i;
const LOCAL_RE = /^\/img\/([a-z0-9_-]+)\.jpe?g$/i;
export const DEFAULT_WIDTHS = [480, 768, 1080, 1440, 1920];

export const isCloudinary = (url = "") => CLOUDINARY_RE.test(url);

/** Insert a Cloudinary transformation (f_auto,q_auto,w_…) after /upload/. Non-Cloudinary URLs pass through. */
export const cloudinaryUrl = (url, width) => {
  const m = CLOUDINARY_RE.exec(url || "");
  if (!m) return url;
  // Drop an existing leading transformation segment (contains "_" + "," and no ".") so we never stack them.
  const rest = m[2].replace(/^([a-z]{1,3}_[^/]*,?)+\//i, "");
  return `${m[1]}f_auto,q_auto,c_limit,w_${width}/${rest}`;
};

/** Bundled photo (/img/<name>.jpg) with pre-built WebP widths (scripts/optimize-images.mjs), or null. */
const localVariants = (url) => {
  const m = LOCAL_RE.exec(url || "");
  const entry = m && LOCAL_IMAGES[m[1]];
  return entry ? { name: m[1], widths: entry.widths } : null;
};

/**
 * { src, srcSet } for an API image path.
 * - Cloudinary: f_auto/q_auto transforms at each width.
 * - Bundled /img/*.jpg: the pre-built WebP variants (the JPEG stays available for old links).
 * - Anything else (e.g. /uploads/*.webp, already resized on upload): as is.
 */
export const responsiveImage = (path, { widths = DEFAULT_WIDTHS, fallback = FALLBACK_IMAGE, base = 1080 } = {}) => {
  const url = assetUrl(path, fallback);
  const local = localVariants(url);
  if (local) {
    const pick = local.widths.find((w) => w >= base) || local.widths[local.widths.length - 1];
    return {
      src: `/img/opt/${local.name}-${pick}.webp`,
      srcSet: local.widths.map((w) => `/img/opt/${local.name}-${w}.webp ${w}w`).join(", "),
    };
  }
  if (!isCloudinary(url)) return { src: url, srcSet: undefined };
  return {
    src: cloudinaryUrl(url, base),
    srcSet: widths.map((w) => `${cloudinaryUrl(url, w)} ${w}w`).join(", "),
  };
};

// ---- per-article fallback covers ---------------------------------------------------------

/** Bundled photos by make, so a story without a cover at least shows the right kind of car. */
const BY_MAKE = {
  mclaren: ["redmc", "gtsmc", "mc_engin", "mc_homepage"],
  lamborghini: ["urus", "aventador"],
  "mercedes-amg": ["amg"],
  mercedes: ["amg"],
  amg: ["amg"],
  bmw: ["bmw"],
};
const ALL_PHOTOS = Object.keys(LOCAL_IMAGES);

/** Small deterministic string hash (FNV-1a); the same article always gets the same photo. */
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** Fallback cover for an article without featured_image_url: same make first, else any photo, by id hash. */
export const fallbackImageFor = (article) => {
  const key = String(article?.id ?? article?.article_id ?? article?.slug ?? article?.title ?? "");
  const make = String(article?.make || "").trim().toLowerCase();
  const pool = (BY_MAKE[make] || []).filter((n) => LOCAL_IMAGES[n]);
  const choices = pool.length ? pool : ALL_PHOTOS;
  if (!choices.length) return FALLBACK_IMAGE;
  return `/img/${choices[hash(key) % choices.length]}.jpg`;
};

/**
 * The image to show for an article: its own cover, else a deterministic bundled photo.
 * A stand-in photo gets an empty alt, because the stored alt text describes a cover that does not exist.
 */
export const coverOf = (article) => {
  const own = article?.featured_image_url || null;
  const fallback = fallbackImageFor(article);
  return own
    ? { path: own, alt: article?.featured_image_alt || "", fallback, isFallback: false }
    : { path: fallback, alt: "", fallback, isFallback: true };
};
