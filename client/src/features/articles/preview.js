/** Data the detail page can render instantly (and morph the image into its hero). */
export const previewOf = (a) => ({
  id: a.id,
  slug: a.slug,
  title: a.title,
  dek: a.dek,
  make: a.make,
  article_type: a.article_type,
  category_name: a.category_name,
  featured_image_url: a.featured_image_url,
  featured_image_alt: a.featured_image_alt,
  published_at: a.published_at,
  reading_time_min: a.reading_time_min,
  author_name: a.author_name,
  author_avatar_url: a.author_avatar_url,
});
