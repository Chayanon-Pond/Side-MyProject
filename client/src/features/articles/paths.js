/** Canonical URL of an article page. */
export const articlePath = (article) =>
  `/articles/${encodeURIComponent(article?.slug || article?.id || article?.article_id)}`;

export const typePath = (type) => `/articles?type=${encodeURIComponent(type)}`;
export const makePath = (make) => `/articles?make=${encodeURIComponent(make)}`;
export const comparePath = (ids = []) => `/compare?ids=${ids.filter(Boolean).join(",")}`;
