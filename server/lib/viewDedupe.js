/**
 * Bounded in-memory dedupe for article view counting: one counted view per
 * (article, ip) per TTL window. A Map keeps insertion order, so the oldest entry is
 * evicted first once `maxEntries` is reached. No timers, no unbounded growth.
 *
 * Note: per-process; with several replicas a viewer may be counted once per replica.
 */
export class ViewDedupe {
  constructor({ ttlMs = 60 * 60 * 1000, maxEntries = 10_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.map = new Map();
  }

  /** Returns true if this view should be counted (and records it). */
  shouldCount(articleId, ip) {
    const key = `${articleId}|${ip}`;
    const t = this.now();
    const seen = this.map.get(key);
    if (seen !== undefined && t - seen < this.ttlMs) return false;
    if (seen !== undefined) this.map.delete(key);
    this.map.set(key, t);
    while (this.map.size > this.maxEntries) {
      this.map.delete(this.map.keys().next().value);
    }
    return true;
  }

  get size() {
    return this.map.size;
  }
}

export const viewDedupe = new ViewDedupe();
