import { z } from '../../lib/validate.js';

export const ARTICLE_TYPES = ['review', 'news', 'feature'];
export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 160;
export const SPEC_KEYS = [
  'power_hp', 'torque_nm', 'zero_to_100_s', 'top_speed_kmh', 'weight_kg', 'price_usd',
  'drivetrain', 'engine', 'year', 'model',
];

/** Multipart sends everything as strings: parse JSON text for object/array fields. */
const jsonText = (schema) => z.preprocess((v) => {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (t === '' || t === 'null') return null;
  try {
    return JSON.parse(t);
  } catch {
    return v; // let the schema report a type error instead of a 500
  }
}, schema);

const nonNegative = z.coerce.number().finite().min(0).max(100_000_000);

/** All keys optional; numbers >= 0; unknown keys rejected so typos surface as 400s. */
export const specsObject = z.strictObject({
  power_hp: nonNegative.optional(),
  torque_nm: nonNegative.optional(),
  zero_to_100_s: nonNegative.optional(),
  top_speed_kmh: nonNegative.optional(),
  weight_kg: nonNegative.optional(),
  price_usd: nonNegative.optional(),
  drivetrain: z.string().trim().max(50).optional(),
  engine: z.string().trim().max(200).optional(),
  year: z.coerce.number().int().min(0).max(2100).optional(),
  model: z.string().trim().max(200).optional(),
});

/** null / {} clear the specs (stored as NULL). */
export const specsField = jsonText(specsObject.nullable())
  .transform((v) => (v && Object.keys(v).length > 0 ? v : null));

const imageUrl = z.string().trim().max(1000).refine(
  (u) => /^https?:\/\//i.test(u) || u.startsWith('/uploads/'),
  'must be an http(s) URL or an /uploads/ path',
);
const optText = (max) => z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(max).nullable().optional());
const optDim = z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().min(1).max(20000).nullable().optional());

export const galleryItem = z.object({
  url: imageUrl,
  caption: optText(500),
  credit: optText(200),
  width: optDim,
  height: optDim,
});

export const galleryField = jsonText(z.array(galleryItem).max(30).nullable())
  .transform((v) => v ?? []);

const boolField = z.preprocess((v) => {
  if (v === 'true' || v === '1' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'off') return false;
  return v;
}, z.boolean());

/** Empty string / null clears these nullable text columns. */
const clearableText = (max) => z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().trim().max(max).nullable(),
).transform((v) => (v ? v : null));

export const phase4Fields = {
  dek: clearableText(1000).optional(),
  make: clearableText(100).optional(),
  article_type: z.preprocess((v) => (v === '' ? undefined : v), z.enum(ARTICLE_TYPES).optional()),
  is_featured: boolField.optional(),
  specs: specsField.optional(),
  gallery: galleryField.optional(),
  // Search appearance (migration 005). Empty string clears back to the title/dek defaults.
  seo_title: clearableText(SEO_TITLE_MAX).optional(),
  seo_description: clearableText(SEO_DESCRIPTION_MAX).optional(),
};
