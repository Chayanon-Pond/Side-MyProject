const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const LONG_DATE = { year: "numeric", month: "long", day: "numeric" };
// toLocaleDateString builds a new Intl.DateTimeFormat on every call (slow on lists of cards);
// one cached formatter per options shape is reused instead.
const formatters = new Map();
const formatterFor = (options) => {
  const key = JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", options);
    formatters.set(key, f);
  }
  return f;
};

/** "January 5, 2026" (or a custom Intl format). Empty string for missing/invalid dates. */
export const formatDate = (value, options = LONG_DATE) => {
  const d = toDate(value);
  return d ? formatterFor(options).format(d) : "";
};

export const formatShortDate = (value) =>
  formatDate(value, { year: "numeric", month: "short", day: "numeric" });

const plural = (n, unit) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

/** Relative time. Never says "0 minutes ago" – anything under a minute is "just now". */
export const timeAgo = (value) => {
  const d = toDate(value);
  if (!d) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return plural(days, "day");
  return formatDate(d);
};

/** Strip HTML tags and collapse whitespace. */
export const stripHtml = (html = "") =>
  String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Article excerpt: the stored excerpt, else a trimmed plain-text slice of the content. Never "undefined...". */
export const excerptOf = (article, max = 200) => {
  if (!article) return "";
  if (article.excerpt && article.excerpt.trim()) return article.excerpt.trim();
  const text = stripHtml(article.content || "");
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

export const displayName = (user) =>
  user?.full_name || user?.fullName || user?.name || user?.username || "";
