import { api } from "../lib/apiClient";
import { listArticles, getArticle } from "./articles";
import { normalizeArticle } from "./normalize";

const isMissingEndpoint = (err) => err?.status === 404 || err?.code === "NON_JSON_RESPONSE";

/** GET /makes -> [{make,count}]. Falls back to grouping recent articles while the endpoint is not deployed. */
export const listMakes = async ({ signal } = {}) => {
  try {
    const { data } = await api.get("/makes", { signal });
    const rows = Array.isArray(data) ? data : Array.isArray(data?.makes) ? data.makes : [];
    return rows.filter((r) => r && r.make).map((r) => ({ make: r.make, count: Number(r.count) || 0 }));
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    const { articles } = await listArticles({ limit: 50 }, { signal });
    const counts = new Map();
    articles.forEach((a) => a.make && counts.set(a.make, (counts.get(a.make) || 0) + 1));
    return [...counts].map(([make, count]) => ({ make, count })).sort((a, b) => b.count - a.count);
  }
};

/** GET /search -> { results, facets }. Falls back to /articles?q=. */
export const searchArticles = async ({ q, make, type, limit = 8 } = {}, { signal } = {}) => {
  try {
    const params = { q, limit };
    if (make) params.make = make;
    if (type) params.type = type;
    const { data } = await api.get("/search", { params, signal });
    return {
      results: (Array.isArray(data?.results) ? data.results : []).map(normalizeArticle),
      facets: { makes: data?.facets?.makes || [], types: data?.facets?.types || [] },
    };
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    const { articles } = await listArticles({ search: q, make, type, limit }, { signal });
    return { results: articles, facets: { makes: [], types: [] } };
  }
};

/** GET /compare?ids=a,b -> [{article_id,slug,title,make,featured_image_url,specs}] */
export const compareCars = async (ids = [], { signal } = {}) => {
  const clean = ids.filter(Boolean).slice(0, 2);
  if (!clean.length) return [];
  try {
    const { data } = await api.get("/compare", { params: { ids: clean.join(",") }, signal });
    return Array.isArray(data?.cars) ? data.cars : [];
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    const rows = await Promise.all(clean.map((id) => getArticle(id, { signal }).catch(() => null)));
    return rows
      .filter((r) => r?.article)
      .map(({ article: a }) => ({
        article_id: a.id,
        slug: a.slug,
        title: a.title,
        make: a.make,
        featured_image_url: a.featured_image_url,
        specs: a.specs,
      }));
  }
};

/** POST /newsletter {email} -> {ok:true}. 429 = rate limited. */
export const subscribeNewsletter = async (email) => {
  const { data } = await api.post("/newsletter", { email });
  return data;
};
