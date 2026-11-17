import { stripHtml } from "../lib/format";

export const ARTICLE_TYPES = ["review", "news", "feature"];
export const TYPE_LABEL = { review: "Review", news: "News", feature: "Feature" };
/** Tab/heading plurals ("News" is already plural). */
export const TYPE_PLURAL = { review: "Reviews", news: "News", feature: "Features" };

const words = (html) => {
  const t = stripHtml(html || "");
  return t ? t.split(/\s+/).length : 0;
};

/**
 * One shape for article objects, whatever the API version.
 * New fields (dek, make, article_type, is_featured, reading_time_min, author_avatar_url)
 * fall back to older ones (excerpt, category_name, author_avatar …) so the UI works on today's prod API.
 */
export const normalizeArticle = (a) => {
  if (!a || typeof a !== "object") return a;
  const type = ARTICLE_TYPES.includes(a.article_type) ? a.article_type : null;
  const n = words(a.content);
  return {
    ...a,
    dek: (a.dek || a.excerpt || "").trim(),
    make: a.make || null,
    article_type: type,
    is_featured: Boolean(a.is_featured),
    reading_time_min: Number(a.reading_time_min) || (n ? Math.max(1, Math.round(n / 230)) : null),
    author_name: a.author_name || a.author_username || "APEX Staff",
    author_avatar_url: a.author_avatar_url || a.author_avatar || a.author_profile_image_url || null,
    specs: a.specs && typeof a.specs === "object" ? a.specs : null,
    // List items carry `has_specs` (no specs object); detail payloads carry both.
    has_specs: typeof a.has_specs === "boolean" ? a.has_specs : Boolean(a.specs && typeof a.specs === "object"),
    author_bio: (a.author_bio || "").trim() || null,
    seo_title: (a.seo_title || "").trim() || null,
    seo_description: (a.seo_description || "").trim() || null,
    gallery: Array.isArray(a.gallery) ? a.gallery.filter((g) => g && g.url) : [],
  };
};

/**
 * Kicker parts: make (else category) and the type label, with case-insensitive duplicates
 * and empty values removed, so a "News" category on a news story reads "NEWS", not "NEWS · NEWS".
 */
export const kickerParts = (a) => {
  const seen = new Set();
  const out = [];
  for (const raw of [a?.make || a?.category_name, TYPE_LABEL[a?.article_type]]) {
    const text = typeof raw === "string" ? raw.trim() : "";
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
};

/** Kicker text for cards: unique parts joined, else "Story". */
export const kickerOf = (a) => kickerParts(a).join(" · ") || "Story";
