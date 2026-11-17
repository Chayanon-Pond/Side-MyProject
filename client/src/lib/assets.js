import { API_ORIGIN } from "./apiClient";

export const FALLBACK_IMAGE = "/img/mc_homepage.jpg";
export const DEFAULT_AVATAR = "/img/default-avatar.svg";

// Paths served by the client itself (public/), never by the API server.
const LOCAL_PREFIXES = ["/img/", "/favicon", "/og-"];

/**
 * Resolve an asset path coming from the API.
 * - absolute (http/https, protocol-relative), data: and blob: URLs are returned untouched
 * - client-local public assets (/img/...) are returned untouched
 * - server paths (/uploads/...) are prefixed with the API origin in production
 */
export const assetUrl = (path, fallback = "") => {
  if (!path || typeof path !== "string") return fallback;
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (LOCAL_PREFIXES.some((p) => normalized.startsWith(p))) return normalized;
  return `${API_ORIGIN}${normalized}`;
};

export const avatarUrl = (path) => assetUrl(path, DEFAULT_AVATAR);

/**
 * onError handler for <img>: swap to a fallback exactly once.
 * We null out the DOM onerror AND mark the node so a broken fallback can never loop.
 */
export const imgFallback = (fallback = FALLBACK_IMAGE) => (e) => {
  const img = e.currentTarget;
  img.onerror = null;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "1";
  img.src = fallback;
};
