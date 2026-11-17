import DOMPurify from "dompurify";

const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(s);

const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Mirrors the server allow-list: YouTube /embed/ and player.vimeo.com iframes, classes align-* and pull-quote.
const IFRAME_SRC = [/^https:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+/, /^https:\/\/player\.vimeo\.com\//];
const CLASS_OK = /^(align-(left|right|center|wide|full)|pull-quote)$/;

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName === "iframe") {
    const src = node.getAttribute?.("src") || "";
    if (!IFRAME_SRC.some((re) => re.test(src))) node.parentNode?.removeChild(node);
  }
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.hasAttribute?.("class")) {
    const kept = node
      .getAttribute("class")
      .split(/\s+/)
      .filter((c) => CLASS_OK.test(c));
    if (kept.length) node.setAttribute("class", kept.join(" "));
    else node.removeAttribute("class");
  }
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
  if (node.tagName === "IMG" && !node.getAttribute("loading")) node.setAttribute("loading", "lazy");
});

/** Sanitize arbitrary HTML. The ONLY way HTML may reach dangerouslySetInnerHTML. */
export const sanitizeHtml = (html = "") =>
  DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe", "figure", "figcaption"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "loading", "target"],
    FORBID_TAGS: ["style", "form", "input", "button"],
    FORBID_ATTR: ["style"],
  });

/**
 * Article body -> safe HTML. Content written in the plain textarea editor
 * (no tags) is turned into paragraphs/line breaks; HTML content is sanitized.
 */
export const articleHtml = (content = "") => {
  const text = String(content || "");
  if (!text.trim()) return "";
  if (looksLikeHtml(text)) return sanitizeHtml(text);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
  return sanitizeHtml(paragraphs);
};
