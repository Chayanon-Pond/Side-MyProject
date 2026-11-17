import { api } from "../lib/apiClient";
import { normalizeArticle } from "./normalize";
import { takePrefetched } from "../lib/prefetch";

/** Normalise server pagination ({pages} legacy, {totalPages} new) into one shape. */
export const normalizePagination = (p = {}, fallbackLimit = 10) => {
  const limit = Number(p.limit) || fallbackLimit;
  const total = Number(p.total) || 0;
  const totalPages =
    Number(p.totalPages) || Number(p.pages) || Math.max(1, Math.ceil(total / limit));
  const offset = Number(p.offset) || 0;
  const currentPage = Number(p.currentPage) || Math.floor(offset / limit) + 1;
  return { total, limit, offset, totalPages: Math.max(1, totalPages), currentPage };
};

/**
 * GET /articles
 * @param {{page?:number, limit?:number, offset?:number, search?:string, categoryId?:string|number,
 *          status?:string, sort?:'latest'|'popular', featured?:boolean, make?:string, type?:string,
 *          hasSpecs?:boolean}} params
 */
export const listArticles = async (
  { page = 1, limit = 10, offset, search, categoryId, status, sort, featured, make, type, hasSpecs } = {},
  { signal } = {}
) => {
  const params = { limit, offset: offset ?? (Math.max(1, page) - 1) * limit };
  if (search && search.trim()) {
    params.q = search.trim();
    params.search = search.trim(); // legacy name
  }
  if (categoryId) params.category_id = categoryId;
  if (status) params.status = status;
  if (sort) params.sort = sort;
  if (featured) params.featured = true;
  if (make) params.make = make;
  if (type) params.type = type;
  if (hasSpecs) params.has_specs = true;
  // Same key format as the boot script in index.html (axios keeps insertion order).
  const early = await takePrefetched(`/articles?${new URLSearchParams(params)}`);
  const data = early || (await api.get("/articles", { params, signal })).data;
  return {
    articles: (Array.isArray(data?.articles) ? data.articles : []).map(normalizeArticle),
    pagination: normalizePagination(data?.pagination, limit),
  };
};

/** GET /articles/:slugOrId -> { article, relatedArticles } */
export const getArticle = async (slugOrId, { signal } = {}) => {
  const path = `/articles/${encodeURIComponent(slugOrId)}`;
  const early = await takePrefetched(path);
  const data = early || (await api.get(path, { signal })).data;
  return {
    article: data?.data ? normalizeArticle(data.data) : null,
    relatedArticles: (Array.isArray(data?.relatedArticles) ? data.relatedArticles : []).map(normalizeArticle),
  };
};

export const incrementArticleView = (id) => api.post(`/articles/${id}/view`);

/** Admin only. `body` is FormData (multipart, may contain featured_image). */
export const createArticle = async (body) => {
  const { data } = await api.post("/articles", body);
  return data;
};

export const updateArticle = async (id, body) => {
  const { data } = await api.put(`/articles/${id}`, body);
  return data;
};

export const deleteArticle = (id) => api.delete(`/articles/${id}`);
