import { api } from "../lib/apiClient";
import { listArticles } from "./articles";

const isMissingEndpoint = (err) => err?.status === 404 || err?.code === "NON_JSON_RESPONSE";

/**
 * GET /admin/stats. Until the endpoint ships we derive what we can from the article list
 * (views7d is then empty and the sparkline shows a quiet "no data" state).
 */
export const getAdminStats = async ({ signal } = {}) => {
  try {
    const { data } = await api.get("/admin/stats", { signal });
    return {
      totals: data?.totals || {},
      views7d: Array.isArray(data?.views7d) ? data.views7d : [],
      topArticles: Array.isArray(data?.topArticles) ? data.topArticles : [],
      recentComments: Array.isArray(data?.recentComments) ? data.recentComments : [],
      derived: false,
    };
  } catch (err) {
    if (!isMissingEndpoint(err)) throw err;
    const { articles } = await listArticles({ limit: 50, status: "all" }, { signal });
    return {
      totals: {
        published: articles.filter((a) => a.status === "published").length,
        drafts: articles.filter((a) => a.status === "draft").length,
        comments: null,
        views: articles.reduce((s, a) => s + (Number(a.view_count) || 0), 0),
      },
      views7d: [],
      topArticles: [...articles]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5)
        .map((a) => ({ id: a.id, slug: a.slug, title: a.title, views: a.view_count || 0 })),
      recentComments: [],
      derived: true,
    };
  }
};

/** POST /uploads/image (multipart `image`) -> {url,width,height} */
export const uploadImage = async (file, { onProgress } = {}) => {
  const fd = new FormData();
  fd.append("image", file);
  const { data } = await api.post("/uploads/image", fd, {
    onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0),
  });
  return data;
};
