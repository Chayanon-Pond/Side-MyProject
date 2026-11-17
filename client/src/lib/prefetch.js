/**
 * Responses the inline boot script in index.html started fetching before the app bundle loaded
 * (home cover + latest list, or the article on /articles/:slug). Each entry can be taken once,
 * only within a few seconds of page load; anything else goes through the normal API client.
 */
const MAX_AGE_MS = 15000;

export const takePrefetched = (key) => {
  if (typeof window === "undefined") return null;
  const store = window.__APEX_PREFETCH__;
  const entry = store && store[key];
  if (!entry) return null;
  delete store[key];
  if (Date.now() - entry.at > MAX_AGE_MS) return null;
  return entry.promise.catch(() => null);
};
