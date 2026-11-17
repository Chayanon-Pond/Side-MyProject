/* DEV-only axios adapter that serves the Apex API contract from in-memory fixtures. */
import * as fx from "./fixtures";

const db = {
  articles: structuredClone(fx.articles),
  categories: structuredClone(fx.categories),
  users: structuredClone(fx.users),
  comments: structuredClone(fx.comments),
  notifications: structuredClone(fx.notifications),
  subscribers: new Set(),
  nextId: 100,
};

const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const fakeJwt = (user) =>
  `${b64url({ alg: "none", typ: "JWT" })}.${b64url({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 7 * 86400,
  })}.mock`;

/** Token + public user for a demo account (used by ?mockLogin=). */
export const mockSession = (email) => {
  const u = db.users.find((x) => x.email === email);
  return { token: fakeJwt(u), user: publicUser(u) };
};

const userFromToken = (headers) => {
  const auth = headers?.Authorization || headers?.authorization || "";
  const token = String(auth).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return db.users.find((u) => u.id === payload.sub) || null;
  } catch {
    return null;
  }
};

const publicUser = ({ password: _pw, ...u }) => u;

class MockError extends Error {
  constructor(status, error, code) {
    super(error);
    this.status = status;
    this.body = { error, code };
  }
}

const readBody = (data) => {
  if (!data) return {};
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const out = {};
    for (const [k, v] of data.entries()) out[k] = v;
    return out;
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
};

const parseMaybeJson = (v, fallback) => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

const byDateDesc = (a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);

const findArticle = (key) =>
  db.articles.find((a) => String(a.id) === String(key) || a.slug === String(key));

const listView = (a) => {
  const { content: _c, gallery: _g, ...rest } = a;
  return { ...rest, excerpt: a.dek };
};

const applyArticleFields = (target, body) => {
  const fields = ["title", "content", "excerpt", "dek", "featured_image_alt", "status", "make", "article_type", "seo_title", "seo_description", "slug"];
  fields.forEach((f) => {
    if (body[f] !== undefined) target[f] = body[f];
  });
  if (body.excerpt !== undefined && body.dek === undefined) target.dek = body.excerpt;
  if (body.category_id !== undefined) {
    target.category_id = Number(body.category_id);
    target.category_name = db.categories.find((c) => c.id === Number(body.category_id))?.name || null;
  }
  if (body.is_featured !== undefined) target.is_featured = body.is_featured === true || body.is_featured === "true";
  if (body.specs !== undefined) target.specs = parseMaybeJson(body.specs, null);
  if (body.gallery !== undefined) target.gallery = parseMaybeJson(body.gallery, []);
  if (body.tags !== undefined)
    target.tags = String(body.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  if (body.featured_image instanceof Blob) target.featured_image_url = URL.createObjectURL(body.featured_image);
  if (body.featured_image_url) target.featured_image_url = body.featured_image_url;
  if (target.status === "published" && !target.published_at) target.published_at = new Date().toISOString();
  target.reading_time_min = Math.max(1, Math.round(String(target.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).length / 230));
};

const routes = [
  // ---------------- articles ----------------
  ["get", /^\/articles$/, ({ params, user }) => {
    const p = params || {};
    const wantAll = user?.role === "admin" && (p.status === "all" || p.status === "draft" || p.status === "archived");
    let rows = db.articles.filter((a) =>
      wantAll ? (p.status === "all" ? true : a.status === p.status) : a.status === "published"
    );
    const q = (p.q || p.search || "").toLowerCase();
    if (q) rows = rows.filter((a) => `${a.title} ${a.dek} ${a.make || ""}`.toLowerCase().includes(q));
    if (p.make) rows = rows.filter((a) => (a.make || "").toLowerCase() === String(p.make).toLowerCase());
    if (p.type) rows = rows.filter((a) => a.article_type === p.type);
    if (p.category_id) rows = rows.filter((a) => String(a.category_id) === String(p.category_id));
    if (String(p.featured) === "true") rows = rows.filter((a) => a.is_featured);
    rows = [...rows].sort(p.sort === "popular" ? (a, b) => b.view_count - a.view_count : byDateDesc);
    const limit = Math.min(50, Number(p.limit) || 10);
    const offset = Number(p.offset) || 0;
    const total = rows.length;
    return {
      articles: rows.slice(offset, offset + limit).map(listView),
      pagination: { total, limit, offset, totalPages: Math.max(1, Math.ceil(total / limit)), currentPage: Math.floor(offset / limit) + 1 },
    };
  }],
  ["get", /^\/articles\/([^/]+)$/, ({ match, user }) => {
    const a = findArticle(decodeURIComponent(match[1]));
    if (!a || (a.status !== "published" && user?.role !== "admin")) throw new MockError(404, "Article not found", "NOT_FOUND");
    const related = db.articles
      .filter((x) => x.id !== a.id && x.status === "published" && (x.make === a.make || x.article_type === a.article_type))
      .sort(byDateDesc)
      .slice(0, 3)
      .map(listView);
    return { data: { ...a, excerpt: a.dek }, relatedArticles: related };
  }],
  ["post", /^\/articles\/(\d+)\/view$/, ({ match }) => {
    const a = findArticle(match[1]);
    if (a) a.view_count += 1;
    return { ok: true };
  }],
  ["post", /^\/articles$/, ({ body, requireAdmin }) => {
    requireAdmin();
    const id = db.nextId++;
    const a = { id, slug: `draft-${id}`, view_count: 0, created_at: new Date().toISOString(), author_name: "Avery Admin", gallery: [], specs: null };
    applyArticleFields(a, body);
    if (body.title && a.slug.startsWith("draft-")) a.slug = String(body.slug || body.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    db.articles.unshift(a);
    return { message: "Article created", data: a };
  }],
  ["put", /^\/articles\/(\d+)$/, ({ match, body, requireAdmin }) => {
    requireAdmin();
    const a = findArticle(match[1]);
    if (!a) throw new MockError(404, "Article not found");
    applyArticleFields(a, body);
    return { message: "Article updated", data: a };
  }],
  ["delete", /^\/articles\/(\d+)$/, ({ match, requireAdmin }) => {
    requireAdmin();
    db.articles = db.articles.filter((a) => String(a.id) !== match[1]);
    return { ok: true };
  }],

  // ---------------- discovery ----------------
  ["get", /^\/makes$/, () => {
    const counts = new Map();
    db.articles.filter((a) => a.status === "published" && a.make).forEach((a) => counts.set(a.make, (counts.get(a.make) || 0) + 1));
    return [...counts].map(([make, count]) => ({ make, count })).sort((a, b) => b.count - a.count);
  }],
  ["get", /^\/search$/, ({ params }) => {
    const q = String(params?.q || "").toLowerCase().trim();
    let rows = db.articles.filter((a) => a.status === "published");
    if (q) rows = rows.filter((a) => `${a.title} ${a.dek} ${a.make || ""} ${(a.tags || []).join(" ")}`.toLowerCase().includes(q));
    const facetBase = rows;
    if (params?.make) rows = rows.filter((a) => a.make === params.make);
    if (params?.type) rows = rows.filter((a) => a.article_type === params.type);
    const count = (key) => {
      const m = new Map();
      facetBase.forEach((a) => a[key] && m.set(a[key], (m.get(a[key]) || 0) + 1));
      return [...m];
    };
    return {
      results: rows.sort(byDateDesc).slice(0, Number(params?.limit) || 8).map(({ id, slug, title, dek, make, article_type, featured_image_url, published_at, reading_time_min }) => ({ id, slug, title, dek, make, article_type, featured_image_url, published_at, reading_time_min })),
      facets: {
        makes: count("make").map(([make, c]) => ({ make, count: c })),
        types: count("article_type").map(([type, c]) => ({ type, count: c })),
      },
    };
  }],
  ["get", /^\/compare$/, ({ params }) => {
    const ids = String(params?.ids || "").split(",").filter(Boolean);
    if (ids.some((i) => !findArticle(i)?.specs)) throw new MockError(400, "One of these cars has no spec sheet", "COMPARE_UNAVAILABLE");
    return {
      cars: ids
        .map(findArticle)
        .filter(Boolean)
        .map((a) => ({ article_id: a.id, slug: a.slug, title: a.title, make: a.make, featured_image_url: a.featured_image_url, specs: a.specs })),
    };
  }],
  ["post", /^\/newsletter$/, ({ body }) => {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MockError(400, "Please enter a valid email", "VALIDATION");
    if (email.startsWith("ratelimit")) throw new MockError(429, "Too many requests", "RATE_LIMITED");
    db.subscribers.add(email);
    return { ok: true };
  }],

  // ---------------- categories ----------------
  ["get", /^\/categories$/, () => db.categories],
  ["post", /^\/categories$/, ({ body, requireAdmin }) => {
    requireAdmin();
    const c = { id: db.nextId++, name: body.name, description: body.description || "", article_count: 0 };
    db.categories.push(c);
    return c;
  }],
  ["put", /^\/categories\/(\d+)$/, ({ match, body, requireAdmin }) => {
    requireAdmin();
    const c = db.categories.find((x) => String(x.id) === match[1]);
    if (!c) throw new MockError(404, "Category not found");
    Object.assign(c, { name: body.name ?? c.name, description: body.description ?? c.description });
    return c;
  }],
  ["delete", /^\/categories\/(\d+)$/, ({ match, requireAdmin }) => {
    requireAdmin();
    if (db.articles.some((a) => String(a.category_id) === match[1])) throw new MockError(409, "Category is in use", "CONFLICT");
    db.categories = db.categories.filter((c) => String(c.id) !== match[1]);
    return { ok: true };
  }],

  // ---------------- comments ----------------
  ["get", /^\/comments\/article\/(\d+)$/, ({ match }) => {
    const rows = db.comments.filter((c) => String(c.article_id) === match[1]);
    return { comments: rows, pagination: { total: rows.length, limit: 100, offset: 0, totalPages: 1 } };
  }],
  ["post", /^\/comments\/article\/(\d+)$/, ({ match, body, requireUser }) => {
    const user = requireUser();
    const c = { id: db.nextId++, article_id: Number(match[1]), user_id: user.id, user_name: user.full_name, content: body.content, created_at: new Date().toISOString(), replies: [] };
    if (body.parent_id) {
      const walk = (list) => list.forEach((x) => (x.id === Number(body.parent_id) ? x.replies.push(c) : walk(x.replies || [])));
      walk(db.comments);
    } else db.comments.push(c);
    return c;
  }],
  ["put", /^\/comments\/(\d+)$/, ({ match, body, requireUser }) => {
    requireUser();
    const walk = (list) => list.forEach((x) => (x.id === Number(match[1]) ? (x.content = body.content) : walk(x.replies || [])));
    walk(db.comments);
    return { ok: true };
  }],
  ["delete", /^\/comments\/(\d+)$/, ({ match, requireUser }) => {
    requireUser();
    const prune = (list) => list.filter((x) => x.id !== Number(match[1])).map((x) => ({ ...x, replies: prune(x.replies || []) }));
    db.comments = prune(db.comments);
    return { ok: true };
  }],

  // ---------------- auth / profile ----------------
  ["post", /^\/auth\/login$/, ({ body }) => {
    const u = db.users.find((x) => x.email === String(body.email || "").toLowerCase());
    if (!u || u.password !== body.password) throw new MockError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    return { token: fakeJwt(u), user: { ...publicUser(u), fullName: u.full_name } };
  }],
  ["post", /^\/auth\/register$/, ({ body }) => {
    if (db.users.some((u) => u.email === body.email)) throw new MockError(409, "Email already registered", "CONFLICT");
    const u = { id: db.nextId++, email: body.email, password: body.password, role: "user", full_name: body.fullName, username: body.username, profile_image_url: null };
    db.users.push(u);
    return { token: fakeJwt(u), user: publicUser(u) };
  }],
  ["post", /^\/auth\/forgot-password$/, () => ({ message: "If that email exists, a reset link is on its way." })],
  ["post", /^\/auth\/reset-password-token$/, () => ({ message: "Password updated" })],
  ["put", /^\/auth\/reset-password$/, ({ requireUser }) => {
    requireUser();
    return { message: "Password updated" };
  }],
  ["put", /^\/auth\/profile$/, ({ body, requireUser }) => {
    const u = requireUser();
    Object.assign(u, { full_name: body.full_name, username: body.username, email: body.email, bio: body.bio });
    if (body.profile_image instanceof Blob) u.profile_image_url = URL.createObjectURL(body.profile_image);
    return { user: publicUser(u) };
  }],

  // ---------------- notifications ----------------
  ["get", /^\/notifications$/, ({ requireUser }) => {
    requireUser();
    return { notifications: db.notifications, unreadCount: db.notifications.filter((n) => !n.is_read).length };
  }],
  ["put", /^\/notifications\/mark-all-read$/, () => {
    db.notifications.forEach((n) => (n.is_read = true));
    return { ok: true };
  }],
  ["put", /^\/notifications\/(\d+)\/read$/, ({ match }) => {
    const n = db.notifications.find((x) => String(x.id) === match[1]);
    if (n) n.is_read = true;
    return { ok: true };
  }],
  ["delete", /^\/notifications\/(\d+)$/, ({ match }) => {
    db.notifications = db.notifications.filter((x) => String(x.id) !== match[1]);
    return { ok: true };
  }],

  // ---------------- admin ----------------
  ["get", /^\/admin\/stats$/, ({ requireAdmin }) => {
    requireAdmin();
    const flat = [];
    const walk = (list) => list.forEach((c) => (flat.push(c), walk(c.replies || [])));
    walk(db.comments);
    return {
      totals: {
        published: db.articles.filter((a) => a.status === "published").length,
        drafts: db.articles.filter((a) => a.status === "draft").length,
        comments: flat.length,
        views: db.articles.reduce((s, a) => s + a.view_count, 0),
      },
      views7d: fx.views7d,
      topArticles: [...db.articles].sort((a, b) => b.view_count - a.view_count).slice(0, 5).map(({ id, slug, title, view_count }) => ({ id, slug, title, views: view_count })),
      recentComments: flat
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map((c) => ({ id: c.id, article_id: c.article_id, article_title: findArticle(c.article_id)?.title, user_name: c.user_name, content: c.content, created_at: c.created_at })),
    };
  }],
  ["post", /^\/uploads\/image$/, async ({ body, requireAdmin }) => {
    requireAdmin();
    const file = body.image;
    if (!(file instanceof Blob)) throw new MockError(400, "No image");
    const url = URL.createObjectURL(file);
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: null, height: null });
      img.src = url;
    });
    return { url, ...dims };
  }],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mockAdapter(config) {
  const method = (config.method || "get").toLowerCase();
  const path = String(config.url || "").replace(/^https?:\/\/[^/]+/, "").replace(/^\/api/, "").split("?")[0];
  const user = userFromToken(config.headers);
  const ctx = {
    params: config.params,
    body: readBody(config.data),
    user,
    requireUser: () => {
      if (!user) throw new MockError(401, "Authentication required", "UNAUTHORIZED");
      return user;
    },
    requireAdmin: () => {
      if (!user) throw new MockError(401, "Authentication required", "UNAUTHORIZED");
      if (user.role !== "admin") throw new MockError(403, "Admin only", "FORBIDDEN");
      return user;
    },
  };
  await sleep(220 + Math.random() * 260);

  const base = { config, headers: { "content-type": "application/json" }, request: {} };
  for (const [m, re, handler] of routes) {
    const match = m === method && re.exec(path);
    if (!match) continue;
    try {
      const data = await handler({ ...ctx, match });
      return { ...base, data: structuredClone(data), status: method === "post" ? 201 : 200, statusText: "OK" };
    } catch (err) {
      const status = err.status || 500;
      const error = new Error(err.message);
      error.config = config;
      error.response = { ...base, status, data: err.body || { error: err.message }, statusText: "Error" };
      error.isAxiosError = true;
      throw error;
    }
  }
  const error = new Error("Not found");
  error.config = config;
  error.response = { ...base, status: 404, data: { error: `Mock: no route for ${method.toUpperCase()} ${path}` } };
  error.isAxiosError = true;
  throw error;
}
