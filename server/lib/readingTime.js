/** Mirrors article_reading_time() in migration 004: words / 220, rounded up, minimum 1. */
export const WORDS_PER_MINUTE = 220;

export function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ');
}

export function readingTimeMin(html) {
  const words = plainText(html).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
