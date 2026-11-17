/** The one place that turns a notification into an in-app link. */
export const notificationLink = (n) => {
  if (!n) return null;
  if (n.link) return n.link;
  const d = n.data || {};
  if (!d.article_id) return null;
  const base = `/articles/${d.article_id}`;
  if (n.type === "comment") {
    return d.comment_id ? `${base}?comment=${d.comment_id}#comments` : `${base}#comments`;
  }
  return base;
};
