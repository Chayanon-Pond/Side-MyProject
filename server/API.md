# Side MyProject API

Base URL: `https://<api-host>/api` (local: `http://localhost:3001/api`). JSON unless noted.

## Conventions

**Auth.** `Authorization: Bearer <jwt>` (HS256, 24h). Tokens come from `/auth/login` and `/auth/register`.
The role (`user` | `admin`) is read from the token.

| Situation | Status |
|---|---|
| No token, or an invalid/expired/forged token on a protected route | **401** (`code`: `NO_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`) |
| Valid token, wrong role | **403** (`code: FORBIDDEN_ROLE`) |
| Valid token, not the owner (editing someone else's comment) | 403 (`NOT_OWNER`) |

**Errors.** Every error has the same shape. `error` is a top-level string, so existing `error.response.data.error` readers keep working.
```json
{ "error": "Human readable message", "code": "MACHINE_CODE", "details": [ { "path": "id", "message": "..." } ] }
```
`details` appears only on validation errors (`code: VALIDATION_ERROR`, status 400). Bad ids, enums, limits and lengths return 400, never 500.
Unexpected errors return `500 { "error": "Internal server error", "code": "INTERNAL_ERROR" }`. Messages never include SQL or stack traces.

**Pagination.** Queries take `limit` (1–50) and `offset` (≥0). Responses include:
`pagination: { total, limit, offset, pages, totalPages, currentPage }`. `totalPages` equals `pages`; it is added for the admin dashboard.

**Rate limits (per IP).** Global: 300/min. `POST /auth/login` and `POST /auth/register`: 10 per 15 min.
`POST /auth/forgot-password` and `POST /auth/reset-password-token`: 5 per 15 min. `POST /comments/article/:id`: 20/min.
`GET /search`: 60/min. `POST /newsletter`: 5 per hour.
Over the limit returns `429 { error, code: "RATE_LIMITED" }` with `RateLimit-*` headers.

**Compression.** Responses over 1 KB are gzip/deflate-compressed when the client sends `Accept-Encoding` (`compression` middleware).

**CORS.** Allowed origins are the `CORS_ORIGINS` list, plus Vercel previews that match `^https://side-my-project[-a-z0-9]*\.vercel\.app$`.
In development the default is `http://localhost:5173`.

---

## Probes

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/health` | – | `200 {"status":"ok"}`. Liveness only. Never touches the DB. This is the Railway healthcheck. |
| GET | `/api/ready` | – | `200 {"status":"ok"}`, or `503 {"status":"error"}` if the DB ping fails. No error text. |

`/api/debug/*` has been removed.

## Discovery – `/api` (public)

| Method | Path | Notes |
|---|---|---|
| GET | `/makes` | `[{ make, count }]` over **published** articles that have a make, sorted by count desc, then name. |
| GET | `/search` | Query: `q?` (≤200), `make?`, `type?(review\|news\|feature)`, `limit?` (1–20, default 8). Returns `{ results:[{id, slug, title, dek, make, article_type, featured_image_url, published_at, reading_time_min}], facets:{ makes:[{make,count}], types:[{type,count}] } }`. Published only. Same full-text rules as `q` on the list endpoint. Ranked by relevance when `q` is given, else newest first. Each facet applies every filter except its own: `makes` ignores `make`, `types` ignores `type`. An empty `q` is allowed. **Rate limit 60/min.** |
| GET | `/compare?ids=1,2[,3]` | 2 or 3 distinct ids. Returns `{ cars:[{ article_id, slug, title, make, featured_image_url, specs }] }` in the requested order. If any id is not a published article with specs: `400 COMPARE_UNAVAILABLE`, and `details` names the ids. A wrong id count or format returns `400 VALIDATION_ERROR`. |

## Newsletter – `/api/newsletter`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | – | `{ email }` → `201 { ok: true }` for a new subscriber, `200 { ok: true }` if already subscribed (case-insensitive). An invalid email returns 400. **Rate limit 5/hour per IP.** `confirmed` is stored as `false`; no confirmation email is sent yet. |

## Uploads – `/api/uploads`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/image` | **admin** | multipart field `image` (jpeg/png/webp by magic bytes, ≤5MB). Re-encoded to WebP, max 2000px wide. Returns `201 { url, width, height }`. `url` is **absolute**: Cloudinary https, or `PUBLIC_API_URL` (or the request origin) + `/uploads/content/...`. Used by the rich-text editor and the gallery. A missing file returns `400 NO_FILE`; a non-image returns `400 INVALID_IMAGE`. Images uploaded but never saved into an article are not cleaned up automatically. |

## Admin – `/api/admin`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/stats` | **admin** | `{ totals:{ published, drafts, comments, views }, views7d:[{ date:'YYYY-MM-DD', views }], topArticles:[{ id, slug, title, views }], recentComments:[{ id, article_id, article_title, user_name, content, created_at }] }`. See the notes below. |

- `totals.views` is the sum of `view_count`.
- `views7d` always has 7 entries, oldest first, ending today (DB date), zero-filled. It reads `article_views_daily`.
- `topArticles` is the top 5 by `view_count`, any status.
- `recentComments` is the latest 8; `content` is cut to 140 characters.

Daily views: `POST /api/articles/:id/view` now also increments `article_views_daily(article_id, CURRENT_DATE)`. This happens after the per-IP dedupe, in the same transaction as `view_count`. Daily history starts when migration 004 is deployed; older views exist only in `view_count`.

## Auth – `/api/auth`

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/register` | – | `{ fullName, username, email, password(6-128) }` | `201 { message, user:{id,fullName,username,email,role}, token }` |
| POST | `/login` | – | `{ email, password }` | `200 { message, user:{...}, token }`. Bad credentials return `401 INVALID_CREDENTIALS`. |
| PUT | `/profile` | user | **multipart**: `full_name, username, email, bio?, profile_image?` (jpeg/png/webp ≤5MB) | `200 { message, user:{id,full_name,username,email,bio,profile_image_url,role,created_at,updated_at} }`. `bio` is at most 280 characters (shown on the article author card); an empty `bio` clears it. |
| PUT | `/reset-password` | user | `{ currentPassword, newPassword(6-128) }` | `200 { message }`. A wrong current password returns **400** `WRONG_PASSWORD`. |
| POST | `/forgot-password` | – | `{ email }` | **Always** `200 { message }`, whether or not the account exists. |
| POST | `/reset-password-token` | – | `{ token(64 hex), newPassword }` | `200 { message }`. An invalid, expired or already-used token returns `400 INVALID_RESET_TOKEN`. |

How forgot-password works:
- The server makes a 32-byte random token. Only its SHA-256 hash is stored, in `password_reset_tokens`.
- The token expires after 30 minutes and can be used once. Requesting a new link invalidates older ones.
- The link sent is `${PASSWORD_RESET_URL or APP_BASE_URL + "/reset-password"}/<token>`. This matches the client route `/reset-password/:token`.
- Without SMTP configured, no email is sent. Outside production, the link is logged at info level, without the email address.

Emails are matched case-insensitively and stored lowercased on register and profile update.

## Profile – `/api/profile`

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| GET | `/` | user | – | `{ id, full_name, username, email, bio, profile_image_url, role, created_at, updated_at }` |
| PUT | `/update` | user | `{ full_name, username, bio? (≤280), profile_image_url? (https:// or /uploads/) }` | `{ message, user }` |
| PUT | `/reset-password` | user | same as `PUT /auth/reset-password` | `{ message }` |

These endpoints used to return 500 because they referenced the non-existent columns `profile_image` and `password`. They are fixed.

## Articles – `/api/articles`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | optional | Query: `search?, status?(draft\|published\|archived\|all), category_id?, author_id?, featured?(true\|false), make?, type?(review\|news\|feature), has_specs?(true\|false), q?, sort?(newest\|latest\|oldest\|popular\|title), limit?(≤50, default 10), offset?`. See "List filters" below. **Non-admins always get `published`, whatever `status` they send.** Empty-string params are ignored. Returns `{ articles:[...], pagination }`. |
| GET | `/:idOrSlug` | optional | Returns `{ data: article, relatedArticles:[{id,title,slug,excerpt,dek,featured_image_url,featured_image_alt,published_at,created_at,make,article_type,reading_time_min,has_specs,category_name,category_slug,author_name,author_username,author_avatar_url}] }` (up to 3: same make first, newest first, then the same category). Drafts and archived articles return 404 unless the caller is an admin. |
| POST | `/:idOrSlug/view` | – | `{ message: "View count updated" \| "Already viewed" }`. Counted once per (article, IP) per hour. |
| POST | `/` | **admin** | multipart (or JSON): `title, content, category_id, slug?, excerpt?, status?(default draft), featured_image_alt?, tags?("a, b" or array), featured_image?, dek?, make?, article_type?(default feature), is_featured?, specs?, gallery?, seo_title?(≤70), seo_description?(≤160)` → `201 { message, article }`. An empty `seo_*` value clears it (the page then uses the title and dek). |
| PUT | `/:id` | **admin** | multipart or JSON; every field optional, plus `remove_image=true`. `gallery` replaces all images. Returns `{ message, article }`. |
| DELETE | `/:id` | **admin** | `{ message, deletedId }` |

The article object (detail) has these fields: `id, title, slug, excerpt, content, author_id, category_id, featured_image_url, featured_image_alt, status, view_count, published_at, created_at, updated_at, category_name, category_slug, author_name, author_username, author_avatar, tags[], dek, make, article_type, is_featured, reading_time_min, author_avatar_url, specs, gallery[]`.
**No email fields.** List items have the same fields except `content`, `tags`, `author_avatar`, `author_bio`, `seo_title`, `seo_description`, `specs` and `gallery`. Every list item (and the detail) carries `has_specs` (boolean): use it, or `?has_specs=true`, to pick compare candidates. The detail also returns `seo_title` (≤70), `seo_description` (≤160) and `author_bio` (the author's profile bio, ≤280).

Phase-4 fields:
- `dek` (string|null): standfirst under the headline. `make` (string|null): e.g. `"McLaren"`.
- `article_type`: `review` | `news` | `feature` (default `feature`). `is_featured` (boolean).
- `reading_time_min` (int ≥ 1): words in the HTML-stripped content / 220, rounded up. Stored in a column and kept in sync by a DB trigger.
- `author_avatar_url` (string|null): the author's `profile_image_url` as an **absolute** URL. `/uploads/...` gets `PUBLIC_API_URL` prepended, or the request origin when that is unset.
- `specs` (detail only, object|null): any of `power_hp, torque_nm, zero_to_100_s, top_speed_kmh, weight_kg, price_usd, year` (numbers) and `drivetrain, engine, model` (strings). Missing keys are absent.
- `gallery` (detail only): `[{ url, caption, credit, width, height }]` ordered by position; missing values are `null`.

List filters (`GET /api/articles`):
- `featured=true` returns only featured articles (`false` only non-featured). Several articles can be featured; pick the newest (`sort=latest`).
- `make` is an exact, case-insensitive make. `type` is `review|news|feature`.
- `q` is full-text search over title + dek + content + make, using `websearch_to_tsquery('simple', q)`, so quotes and `-word` work. If `q` has no searchable words (e.g. `"!!"`), it falls back to a title `ILIKE`. The older `search` param (ILIKE on title/content) still works.
- `sort`: `newest` (default, created_at desc), `latest` (published_at desc), `oldest`, `popular` (view_count desc), `title`.

Writing Phase-4 fields (admin create/update):
- With multipart, send `specs` and `gallery` as **JSON strings** and `is_featured` as `"true"`/`"false"`. With JSON bodies send them natively.
- `specs`: numbers must be ≥ 0 and `year` an integer. Unknown keys return 400. `null` or `{}` clears specs.
- `gallery`: max 30 items. `url` must be `http(s)://` or `/uploads/...`; `caption` ≤ 500, `credit` ≤ 200, `width`/`height` optional positive ints. Sending `gallery` replaces **all** images, in the same transaction as the article update. `[]` removes all; omitting it leaves the gallery unchanged.
- `dek`/`make`: an empty string or `null` clears them. Setting `is_featured=true` does **not** unset other featured articles.

Notes on writes:
- `content` is sanitized on create and update with `sanitize-html`. Allowed tags: `h2 h3 h4 p a strong em ul ol li blockquote img figure figcaption code pre br hr iframe`.
  - `a` keeps `href`, `target` and `rel`, and `rel` is always set to `noopener noreferrer`.
  - `img` keeps `src`, `alt`, `width`, `height` and `loading` (`lazy`/`eager`).
  - `iframe` is kept **only** when `src` is `https://(www.)youtube.com/embed/<id>[?...]` or `https://player.vimeo.com/...`. It keeps `src`, `width`, `height`, `title` and `loading=lazy`, and always gets `allowfullscreen`. Any other iframe is removed with its contents.
  - `class` is allowed on any allowed tag, but only `align-*` values (e.g. `align-left`, `align-wide`) and `pull-quote` survive. Other class names are dropped.
  - Only http, https and relative URLs are kept. Scripts, `on*` handlers, `style` and `javascript:`/`data:` URLs are removed.
  - `h1` becomes `h2`, `b` becomes `strong` and `i` becomes `em`.
- `slug` defaults to a slugified `title`. A duplicate slug returns `400 SLUG_TAKEN`. An unknown category returns `400 INVALID_CATEGORY`.
- Images are checked by magic bytes (jpeg/png/webp only, ≤5MB), then re-encoded to WebP (max width 2000px, quality 80, metadata stripped). See "Image storage" below.
- When an article becomes `published`, every other user gets an `article_published` notification. This is one `INSERT … SELECT`.

## Categories – `/api/categories`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | – | Bare array `[{ id, name, slug, description }]` |
| POST | `/` | **admin** | `{ name, description? }` → `201 { id, name, slug, description, created_at, updated_at }`. A duplicate returns `400 CATEGORY_EXISTS`. |
| PUT | `/:id` | **admin** | `{ name?, description? }` → the updated category. Renaming also changes the slug. |
| DELETE | `/:id` | **admin** | `{ message, deletedId }`. Returns **409 `CATEGORY_IN_USE`** while any article uses the category. |

## Comments – `/api/comments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/article/:articleId` | – | `limit` (≤50, default 20) and `offset`, applied to **top-level** comments (newest first); every approved reply of a returned comment is nested in `replies`. Returns `{ comments:[{id,content,parent_id,status,created_at,updated_at,user_id,user_name,user_username,user_avatar,replies:[...]}], total_comments, pagination }`. `pagination.total` counts top-level comments; `total_comments` counts all approved comments including replies. **No `user_email`.** |
| POST | `/article/:articleId` | user | `{ content(1-2000), parent_id? }` → `201 { message, comment }`. The article must be published. The author and the parent comment's owner are notified. |
| PUT | `/:commentId` | owner | `{ content }` → `{ message, comment }` |
| DELETE | `/:commentId` | owner or admin | `{ message }`. Replies are deleted with it (cascade). |

## Notifications – `/api/notifications`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | user | `filter?(all\|unread\|read), limit?(≤50, default 50), offset?` → `{ notifications:[{id,type,title,message,data,is_read,created_at,updated_at,sender_name,sender_avatar,action}], unreadCount, total }` |
| PUT | `/:id/read` | user (own) | `{ message, notification }` |
| PUT | `/mark-all-read` | user | `{ message }` |
| DELETE | `/:id` | user (own) | `{ message, deletedId }`. Someone else's id returns 404. |
| POST | `/` | **admin** | `{ user_id, type(comment\|like\|article_published\|mention\|system), title, message, data? }` → `201 { message, notification }` |

`GET /notifications/test` has been removed.

---

## Changes for the frontend

1. **401 vs 403.** An expired or invalid token now returns **401**. It used to return 403.
   - On any 401 from an authenticated call: clear the stored token and redirect to login.
   - Treat 403 as "not allowed", not as logged out. You get it when a member calls an admin endpoint.
   - The wrong *current* password on `/auth/reset-password` and `/profile/reset-password` returns **400**, not 401. Do not log the user out for it.
2. **Admin-only writes.** Creating, updating and deleting articles needs an admin token. So do writing categories and `POST /notifications`. Members now get 403. Previously any logged-in user could do these.
3. **Drafts are private.** Anonymous and member requests always get published articles, even with `?status=all`. The admin dashboard must send the admin token. It already does.
4. **Pagination.** Use `pagination.totalPages`; `pages` is still sent. Keep `limit` ≤ 50. A larger limit returns 400.
5. **Emails removed.** `author_email` is gone from the article payload and `user_email` from comments. New avatar fields: `author_avatar` and `user_avatar`.
6. **New endpoints to wire up:**
   - "Forgot password?" page: `POST /api/auth/forgot-password { email }`. Always show the same success message.
   - Reset page at **`/reset-password/:token`**. Emailed links point here by default. Change the base with `PASSWORD_RESET_URL`. The page calls `POST /api/auth/reset-password-token { token, newPassword }`.
   - `DELETE /api/notifications/:id`. The admin notification page already calls it, and it used to 404.
   - `PUT /api/categories/:id` and `DELETE /api/categories/:id`. The category-management page already calls them. Show the 409 message when a category is still in use.
7. **Error shape.** Keep reading `error.response.data.error` (a string). `error.response.data.code` is now available for branching.
8. **Image URLs.** `featured_image_url` and `profile_image_url` can now be an absolute `https://res.cloudinary.com/...` URL. Only prefix the API base URL when the value starts with `/uploads/`.
9. **Rate limits.** Handle 429 on login and register: "Too many attempts, try again later".
10. **Article HTML.** It is now sanitized on the server. The client can still sanitize as defence in depth, but must allow the tags listed above.
11. **Status.** `archived` is a valid article status. A dashboard filter can offer it.

---

## Image storage

Before this change, the server saved uploads with multer `diskStorage` into `server/uploads`. That is the container's local filesystem.
Railway's filesystem is **ephemeral**: every deploy or restart starts from a fresh image. So every uploaded image disappeared after each deploy.
The `uploads/` folder was never committed to git, which confirms the files only ever existed on the container.

The upload code is now in `lib/storage.js`. There are **two supported options**. With neither, uploads are lost on every deploy, and the server logs one WARN at boot in production.

- **(A) Recommended: Cloudinary.** Set `CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>`. Images go to `side-myproject/{articles,profiles}`, and the DB stores the `https://res.cloudinary.com/...` URL.
- **(B) Railway Volume.**
  1. Railway → API service → *Volumes* → add a volume mounted at e.g. `/data/uploads`.
  2. Set `UPLOAD_DIR=/data/uploads`.

  Files are served from `/uploads/...`. A volume is tied to one service instance.

Replaced and deleted images are removed from whichever backend holds them. This is best effort.

## Image storage migration

This moves the images that still exist on the currently running Railway container to Cloudinary, and rewrites the DB to point at the new URLs.
It covers `articles.featured_image_url`, `users.profile_image_url`, and `<img src>`/`<a href>` values inside `articles.content`.
Run it **before** the next deploy. Files already lost to earlier deploys return 404; the script reports them and skips them, and those images need re-uploading.

1. Create a Cloudinary account and copy the **API environment variable** (`cloudinary://...`).
2. From your machine, in `server/`, run `npm install`.
3. Get the production `DATABASE_URL`: Railway → Postgres → *Connect* → **public** URL.
4. Do a dry run. It changes nothing; it prints every planned rewrite and every missing file:
   ```bash
   cd server
   DATABASE_URL="postgresql://...public-url..." \
   SOURCE_BASE_URL="https://side-myproject-production.up.railway.app" \
   CLOUDINARY_URL="cloudinary://..." \
   NODE_ENV=production \
   node scripts/migrate-uploads-to-cloudinary.js
   ```
   On Windows PowerShell, set each variable first with `$env:DATABASE_URL="..."` (and the same for the others), then run the `node` line.
5. Review the output, then apply. This uploads to Cloudinary and rewrites the DB in **one transaction**:
   ```bash
   node scripts/migrate-uploads-to-cloudinary.js --apply
   ```
   (with the same env vars). The script is safe to re-run:
   - Cloudinary ids are derived from the file path.
   - Rows are only rewritten if they still hold the old value.
   - Already-absolute non-`/uploads` URLs are never touched.
6. Set `CLOUDINARY_URL` on the Railway API service. Then deploy.

## Database migrations and seeds

- `npm run migrate` applies `migrations/NNN_*.sql` in order. Each file runs in its own transaction and is recorded in `schema_migrations`, under a Postgres advisory lock. Railway runs it as `preDeployCommand`.
  - `001_baseline.sql` reproduces the existing schema. It is fully idempotent and changes nothing on the current prod DB.
  - `002_improvements.sql`:
    - allows `archived` status
    - adds composite indexes on comments, notifications and articles
    - adds a unique index on `lower(email)`, skipped with a NOTICE if case-insensitive duplicates exist
    - converts `notifications.data` from json to jsonb where needed
  - `003_password_reset_tokens.sql` creates the forgot-password table.
  - `004_phase4_editorial.sql` is additive:
    - `articles` gets `dek`, `make`, `article_type` (CHECK review/news/feature, default feature), `is_featured` (default false), `specs` JSONB (CHECK object), `reading_time_min` and `search_vector` tsvector.
    - A plpgsql trigger (`BEFORE INSERT OR UPDATE OF title, dek, content, make`) keeps `search_vector` and `reading_time_min` in sync. The vector uses the `simple` config, with title/make weighted A, dek B and content C. Existing rows are backfilled **without** bumping `updated_at`.
    - Indexes: GIN on `search_vector`, plus `(make)`, `(article_type)` and `(is_featured, published_at DESC)`.
    - New tables `article_images`, `article_views_daily` and `newsletter_subscribers`. The subscriber email is TEXT with a unique index on `lower(email)`, so no `citext` extension is needed.
  - `005_seo_and_bio.sql` is additive: nullable `articles.seo_title` (CHECK ≤70 chars) and `articles.seo_description` (CHECK ≤160), `users.bio` ensured (`ADD COLUMN IF NOT EXISTS`; the API limits it to 280 chars, existing longer bios are kept), and a partial index for `has_specs=true` lists (`published_at DESC WHERE specs IS NOT NULL AND status = 'published'`).
- `npm run seed` is for dev and demo only. It refuses `NODE_ENV=production` unless `--allow-production` is passed.
  - It creates the demo accounts **only if missing** and never changes an existing user or password:
    - `ADMIN_EMAIL`/`ADMIN_PASSWORD` (admin), default `chayanon.5723@gmail.com` / `ppond333`
    - `DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD` (admin), default `admin@example.com` / `admin123`
    - `DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD` (user), default `some@gmail.com` / `ppond333`
  - It adds 7 categories, including Supercars and Performance SUVs.
  - It adds 4 sample car articles (McLaren 720S, McLaren GTS, Lamborghini Urus, Mercedes-AMG GT 63 S 4-Door) **by slug, only if missing**, with dek/make/type/specs.
  - For sample slugs that already exist, it only fills NULL `dek`/`make`/`specs`.
  - It marks the 720S featured only if no article is featured yet.
  - Spec figures are published manufacturer launch figures. They are approximate and for the demo only.
- The server no longer runs any DDL or seed logic at boot.

## Tests

- `npm test` runs fast unit and route tests on pg-mem; no Postgres is needed. pg-mem cannot run plpgsql, tsvector or the stats SQL, so those are covered by `npm run test:pg`.
- `npm run test:pg` boots a throwaway **real PostgreSQL 16** from the `embedded-postgres` dev dependency (no Docker). It runs in a temp dir on a free localhost port and is deleted afterwards. It never reads `.env` or `DATABASE_URL`. It:
  - runs all migrations twice, re-executes every migration file raw to prove idempotency, and runs the seed twice;
  - builds the **old production schema** from legacy SQL snapshotted from git history (`tests-pg/fixtures/legacy`, from `Dev` @ 1075bdc, plus the old boot DDL from `app.js`), inserts sample rows, runs the migrations, and asserts every pre-existing row and column is unchanged (including `updated_at`) and that `notifications.data` json → jsonb conversion works;
  - runs supertest integration tests: auth, forgot/reset token, admin article CRUD with Phase-4 fields, comments, category delete 409, and every Phase-4 endpoint including rate limits.
- The Postgres binaries ship inside the npm package. Boot takes about 10 s on Windows.

---

## Phase 4 changes for frontend

Nothing existing was removed or renamed; all changes are additive.

1. **New article fields** on list items and detail: `dek`, `make`, `article_type` (`review|news|feature`), `is_featured`, `reading_time_min` and `author_avatar_url`. `author_avatar_url` is absolute or `null`; prefer it over `author_avatar`. Detail also has `specs` (object or `null`) and `gallery` (array, possibly empty).
2. **Homepage hero:** `GET /api/articles?featured=true&sort=latest&limit=1`. More than one article may be featured; take the first.
3. **Filters:** e.g. `GET /api/articles?make=McLaren&type=review&sort=popular`. Get the make chips from `GET /api/makes`.
4. **Search:** use `GET /api/search?q=...&make=&type=&limit=8` for the search overlay or autocomplete (results + facets). It allows 60 requests/min per IP, so debounce typing (about 250 ms) and handle 429 quietly. For a full results page with pagination, use `GET /api/articles?q=...`.
5. **Compare:** `GET /api/compare?ids=12,15[,18]`. Only articles with specs can be compared. A `400 COMPARE_UNAVAILABLE` means one of them has no specs or is not published. Show the "compare" action only when `specs` is non-null.
6. **Specs table:** render only the keys present. Units: `power_hp` hp, `torque_nm` Nm, `zero_to_100_s` s, `top_speed_kmh` km/h, `weight_kg` kg, `price_usd` USD.
7. **Newsletter form:** `POST /api/newsletter { email }`. Treat both 201 and 200 as success; the body is `{ ok: true }` either way, so show the same message. 400 means an invalid email. 429 means too many attempts (5/hour/IP).
8. **Admin editor:**
   - Image button and gallery upload: `POST /api/uploads/image` (multipart field `image`) returns `{ url, width, height }`. Insert `url` as-is; it is absolute.
   - Save with the extra fields `dek, make, article_type, is_featured, specs, gallery`. With `FormData`, send `specs` and `gallery` as `JSON.stringify(...)` and `is_featured` as `"true"`/`"false"`.
   - `gallery` is replace-all: always send the full ordered list. Array order is display order.
   - Allowed rich-text extras: `<figure>`, `<figcaption>`, `<img loading>`, YouTube `/embed/` and `player.vimeo.com` iframes, and the classes `align-*` and `pull-quote`. The server strips everything else, so the editor preview should allow the same set.
9. **Admin dashboard:** `GET /api/admin/stats` returns totals, a 7-day views series ready for a chart, the top 5 articles and the 8 latest comments.
10. **Env:** set `PUBLIC_API_URL` on the API service if image URLs must use a specific public host. Otherwise the request host is used.
