import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'h2', 'h3', 'h4',
  'p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote',
  'img', 'figure', 'figcaption', 'code', 'pre', 'br', 'hr', 'iframe',
];

// Embeds: YouTube (/embed/ only) and Vimeo's player host. Everything else is dropped.
const EMBED_SRC = [
  /^https:\/\/(?:www\.)?youtube\.com\/embed\/[A-Za-z0-9_-]+(?:\?[^\s"'<>]*)?$/,
  /^https:\/\/player\.vimeo\.com\/[^\s"'<>]+$/,
];
export function isAllowedEmbed(src) {
  return typeof src === 'string' && EMBED_SRC.some((re) => re.test(src.trim()));
}

// Only editorial layout classes survive: align-left/right/center/wide/full..., pull-quote.
const CLASS_PATTERNS = [/^align-[a-z0-9-]+$/, 'pull-quote'];

/** Keep only the allowed class names (transforms rebuild attribs, so they must carry class). */
function keepClass(attribs, out) {
  if (typeof attribs.class === 'string' && attribs.class.trim()) out.class = attribs.class;
  return out;
}

function isSafeUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Absolute URLs must be http(s); protocol-relative "//host" is rejected.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return /^https?:/i.test(trimmed);
  if (trimmed.startsWith('//') || trimmed.startsWith('\\')) return false;
  // Anything else is a relative URL (path, ./x, ../x, #anchor, ?query).
  return true;
}

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    iframe: ['src', 'width', 'height', 'title', 'allowfullscreen', 'loading'],
  },
  allowedClasses: { '*': CLASS_PATTERNS },
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com'],
  allowIframeRelativeUrls: false,
  allowedSchemes: ['http', 'https'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // Contents of these are dropped entirely rather than kept as text.
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe', 'object', 'embed'],
  transformTags: {
    // Legacy h1 / h5 / h6 become allowed headings; b/i become strong/em.
    h1: 'h2',
    h5: 'h4',
    h6: 'h4',
    b: 'strong',
    i: 'em',
    a: (tagName, attribs) => {
      const out = { rel: 'noopener noreferrer' };
      if (attribs.href && isSafeUrl(attribs.href)) out.href = attribs.href.trim();
      if (attribs.target === '_blank') out.target = '_blank';
      return { tagName: 'a', attribs: keepClass(attribs, out) };
    },
    img: (tagName, attribs) => {
      const out = {};
      if (attribs.src && isSafeUrl(attribs.src)) out.src = attribs.src.trim();
      for (const k of ['alt', 'width', 'height']) if (attribs[k] != null) out[k] = attribs[k];
      if (attribs.loading === 'lazy' || attribs.loading === 'eager') out.loading = attribs.loading;
      return { tagName: 'img', attribs: keepClass(attribs, out) };
    },
    iframe: (tagName, attribs) => {
      const out = {};
      if (isAllowedEmbed(attribs.src)) {
        out.src = attribs.src.trim();
        for (const k of ['width', 'height']) if (/^\d{1,4}%?$/.test(attribs[k] || '')) out[k] = attribs[k];
        if (attribs.title) out.title = attribs.title;
        if (attribs.loading === 'lazy') out.loading = 'lazy';
        out.allowfullscreen = '';
      }
      return { tagName: 'iframe', attribs: keepClass(attribs, out) };
    },
  },
  exclusiveFilter: (frame) => (frame.tag === 'img' || frame.tag === 'iframe') && !frame.attribs.src,
};

/** Sanitize article body HTML. Strips scripts, event handlers and unsafe URLs. */
export function sanitizeArticleHtml(html) {
  if (html == null) return html;
  return sanitizeHtml(String(html), OPTIONS);
}

/** Strip all markup (titles, excerpts, comments). */
export function stripHtml(text) {
  if (text == null) return text;
  return sanitizeHtml(String(text), { allowedTags: [], allowedAttributes: {} });
}
