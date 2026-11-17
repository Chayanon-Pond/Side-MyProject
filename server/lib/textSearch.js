/**
 * Full-text search clause over articles.search_vector (migration 004).
 *
 * websearch_to_tsquery('simple', q) accepts free user text ("mclaren -spider", quoted phrases)
 * and never throws on syntax. When it yields an empty query (only stop-words/punctuation, e.g.
 * "!!" or "-"), we fall back to ILIKE on the title. That check is a tiny separate query so the
 * main query keeps a plain `search_vector @@ tsquery` predicate the GIN index can use.
 *
 * @param {{ query: Function }} db
 * @param {string} q   user text (already trimmed / length-limited by zod)
 * @param {number} firstParam index of the first $n placeholder this clause may use
 * @returns {Promise<{ sql: string, params: any[], rankSql: string | null }>}
 */
export async function buildTextSearch(db, q, firstParam) {
  const r = await db.query("SELECT numnode(websearch_to_tsquery('simple', $1)) AS n", [q]);
  const p = `$${firstParam}`;
  if (Number(r.rows[0]?.n) > 0) {
    return {
      sql: `a.search_vector @@ websearch_to_tsquery('simple', ${p})`,
      params: [q],
      rankSql: `ts_rank(a.search_vector, websearch_to_tsquery('simple', ${p}))`,
    };
  }
  return { sql: `a.title ILIKE ${p}`, params: [`%${escapeLike(q)}%`], rankSql: null };
}

/** Escape LIKE wildcards so user text matches literally. */
export function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (c) => `\\${c}`);
}
