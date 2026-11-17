import { useEffect } from "react";

const SITE_NAME = "APEX";
const DEFAULT_TITLE = "APEX — Performance cars, read closely";
const DEFAULT_DESCRIPTION =
  "APEX is an independent magazine about performance cars: long-form reviews, sharp news and spec-sheet comparisons.";

const setMeta = (selector, attr, value) => {
  const el = document.head.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
};

/**
 * Set the page <title> and description (and their OG/Twitter mirrors) for the current route.
 * Pass a falsy title to use the site default. With `{ exact: true }` the title is used as is
 * (an editor-written SEO title already carries any branding it wants).
 */
export function useDocumentTitle(title, description, { exact = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? (exact ? title : `${title} | ${SITE_NAME}`) : DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", desc);
  }, [title, description, exact]);
}

export default useDocumentTitle;
