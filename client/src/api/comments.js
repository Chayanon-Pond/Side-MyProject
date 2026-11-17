import { api } from "../lib/apiClient";
import { normalizePagination } from "./articles";

/** The API caps `limit` at 50; pages are over top-level comments (replies come with their parent). */
export const COMMENTS_PAGE_SIZE = 50;

/**
 * GET /comments/article/:id -> { comments (nested, with replies), pagination, totalComments }
 * `totalComments` counts replies too; `pagination.total` counts top-level comments.
 */
export const listComments = async (articleId, { offset = 0, limit = COMMENTS_PAGE_SIZE, signal } = {}) => {
  const { data } = await api.get(`/comments/article/${articleId}`, {
    params: { limit, offset },
    signal,
  });
  const comments = Array.isArray(data?.comments) ? data.comments : [];
  const pagination = normalizePagination(data?.pagination, limit);
  const totalComments = Number.isFinite(Number(data?.total_comments)) ? Number(data.total_comments) : countComments(comments);
  return { comments, pagination, totalComments, hasMore: offset + comments.length < pagination.total };
};

export const createComment = async (articleId, content, parentId) => {
  const body = { content };
  if (parentId) body.parent_id = parentId;
  const { data } = await api.post(`/comments/article/${articleId}`, body);
  return data;
};

export const updateComment = async (commentId, content) => {
  const { data } = await api.put(`/comments/${commentId}`, { content });
  return data;
};

export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`);

/** Total number of comments including nested replies. */
export const countComments = (comments = []) =>
  comments.reduce((sum, c) => sum + 1 + countComments(c.replies || []), 0);
