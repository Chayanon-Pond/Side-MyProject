import { assetUrl } from "../../../lib/assets";

let keySeq = 0;
/** Gallery rows need a stable local key for drag-to-reorder. */
export const withKeys = (items = []) => items.map((g) => ({ ...g, _key: g._key || `g${Date.now().toString(36)}${++keySeq}` }));

export const SPEC_FIELDS = [
  { name: "model", label: "Model", type: "text", placeholder: "750S Coupé" },
  { name: "year", label: "Year", type: "number", placeholder: "2026" },
  { name: "engine", label: "Engine", type: "text", placeholder: "4.0L twin-turbo V8" },
  { name: "drivetrain", label: "Drivetrain", type: "text", placeholder: "RWD" },
  { name: "power_hp", label: "Power", unit: "hp", type: "number" },
  { name: "torque_nm", label: "Torque", unit: "Nm", type: "number" },
  { name: "zero_to_100_s", label: "0–100 km/h", unit: "s", type: "number", step: "0.1" },
  { name: "top_speed_kmh", label: "Top speed", unit: "km/h", type: "number" },
  { name: "weight_kg", label: "Weight", unit: "kg", type: "number" },
  { name: "price_usd", label: "Price", unit: "USD", type: "number" },
];

const EMPTY_SPECS = Object.fromEntries(SPEC_FIELDS.map((f) => [f.name, ""]));

export const EMPTY_VALUES = {
  title: "",
  dek: "",
  content: "",
  status: "draft",
  slug: "",
  slugTouched: false,
  category_id: "",
  make: "",
  article_type: "review",
  is_featured: false,
  featured_image_alt: "",
  seo_title: "",
  seo_description: "",
  tags: "",
  specs: EMPTY_SPECS,
  gallery: [],
};

export const slugify = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export const fromArticle = (a) => ({
  ...EMPTY_VALUES,
  title: a.title || "",
  dek: a.dek || a.excerpt || "",
  content: a.content || "",
  status: ["published", "draft", "archived"].includes(a.status) ? a.status : "draft",
  slug: a.slug || "",
  slugTouched: Boolean(a.slug),
  category_id: a.category_id ? String(a.category_id) : "",
  make: a.make || "",
  article_type: a.article_type || "review",
  is_featured: Boolean(a.is_featured),
  featured_image_alt: a.featured_image_alt || "",
  seo_title: a.seo_title || "",
  seo_description: a.seo_description || "",
  tags: Array.isArray(a.tags) ? a.tags.filter(Boolean).join(", ") : a.tags || "",
  specs: { ...EMPTY_SPECS, ...Object.fromEntries(Object.entries(a.specs || {}).map(([k, v]) => [k, v ?? ""])) },
  gallery: withKeys(a.gallery || []),
  coverUrl: a.featured_image_url ? assetUrl(a.featured_image_url) : null,
});

const specsPayload = (specs) => {
  const out = {};
  SPEC_FIELDS.forEach(({ name, type }) => {
    const raw = specs?.[name];
    if (raw === "" || raw === null || raw === undefined) out[name] = null;
    else if (type === "number") out[name] = Number.isFinite(Number(raw)) ? Number(raw) : null;
    else out[name] = String(raw).trim() || null;
  });
  return Object.values(out).some((v) => v !== null) ? out : null;
};

/** Multipart body for POST/PUT /articles (new contract fields included; old API ignores them). */
export const toFormData = (values, coverFile, status) => {
  const fd = new FormData();
  fd.append("title", values.title.trim());
  fd.append("content", values.content);
  fd.append("category_id", values.category_id);
  fd.append("excerpt", values.dek.trim());
  fd.append("dek", values.dek.trim());
  fd.append("featured_image_alt", values.featured_image_alt.trim());
  fd.append("tags", values.tags || "");
  fd.append("status", status || values.status || "draft");
  fd.append("make", values.make.trim());
  fd.append("article_type", values.article_type);
  fd.append("is_featured", String(Boolean(values.is_featured)));
  if (values.slug) fd.append("slug", values.slug);
  fd.append("seo_title", values.seo_title.trim());
  fd.append("seo_description", values.seo_description.trim());
  fd.append("specs", JSON.stringify(specsPayload(values.specs)));
  fd.append(
    "gallery",
    JSON.stringify(
      (values.gallery || []).map(({ url, caption, credit, width, height }) => ({
        url,
        caption: caption || null,
        credit: credit || null,
        width: width || null,
        height: height || null,
      }))
    )
  );
  if (coverFile) fd.append("featured_image", coverFile);
  return fd;
};

// ---- local autosave -------------------------------------------------------

/** Stable, comparable projection of the editor values (no blob URLs, no local drag keys). */
const snapshot = (values = {}) => {
  const out = {};
  for (const key of Object.keys(EMPTY_VALUES)) {
    if (key === "slugTouched") continue;
    const v = values[key];
    if (key === "specs") {
      out.specs = Object.fromEntries(SPEC_FIELDS.map(({ name }) => [name, String(v?.[name] ?? "").trim()]));
    } else if (key === "gallery") {
      out.gallery = (Array.isArray(v) ? v : []).map(({ url, caption, credit, width, height }) => ({
        url: url || "",
        caption: caption || "",
        credit: credit || "",
        width: width || null,
        height: height || null,
      }));
    } else if (typeof EMPTY_VALUES[key] === "boolean") {
      out[key] = Boolean(v);
    } else {
      out[key] = String(v ?? "").trim();
    }
  }
  return JSON.stringify(out);
};

/** True when a saved local draft differs from `current` in ANY field (title, dek, body, specs, gallery, meta…). */
export const draftDiffers = (draftValues, current = EMPTY_VALUES) =>
  Boolean(draftValues) && snapshot({ ...EMPTY_VALUES, ...draftValues }) !== snapshot(current);
const draftKey = (id) => `apex-draft:${id || "new"}`;

export const readDraft = (id) => {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeDraft = (id, values) => {
  try {
    // eslint-disable-next-line no-unused-vars -- blob preview URLs are not persisted
    const { coverUrl, ...rest } = values;
    const savedAt = Date.now();
    localStorage.setItem(draftKey(id), JSON.stringify({ savedAt, values: rest }));
    return savedAt;
  } catch {
    return null;
  }
};

export const clearDraft = (id) => {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    // ignore
  }
};
