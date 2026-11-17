# APEX redesign: end-to-end QA report

- **Branch:** `feature/apex-redesign` (uncommitted working tree)
- **Date:** 2026-11-17
- **Tester:** Sompong (QA gate)
- **Stack under test (all real, no mocks):**
  - Throwaway PostgreSQL 16 from `embedded-postgres`, in a temp dir on a free port.
  - `npm run migrate` applied migrations 001–004; `npm run seed` created 3 users, 7 categories and 4 articles.
  - API: `node app.js` on :3911 with `NODE_ENV=development`, `UPLOAD_DIR` in a temp dir, `CORS_ORIGINS=http://localhost:4173,http://localhost:5173`, `APP_BASE_URL=http://localhost:4173` and `PUBLIC_API_URL=http://localhost:3911`.
  - Client: `vite build` with `VITE_API_URL=http://localhost:3911`, written to a temp outDir so `client/dist` was not touched, then served with `vite preview --port 4173`.
  - Browser: Chrome 157 (system install), driven headless with puppeteer-core. Lighthouse 12.
- **Extra test data:** 14 more published articles were created through the admin API (mixed makes and types, some with covers, some without a make, a "News" category), plus a 3-image gallery on the 720S. That gives 18+ published articles, so Load more and pagination are exercised.
- **Harness (re-runnable):**
  - Stack orchestrator: `qa/stack.mjs`. Control endpoint on :3912 with `/restart-server` (resets the in-memory rate limiters) and `/stop`.
  - Flow scripts: `qa/public.mjs`, `qa/auth.mjs`, `qa/member.mjs`, `qa/member2.mjs`, `qa/admin.mjs`, `qa/visual.mjs`.
  - Results: raw pass/fail plus console capture in `qa/results/*.json`; screenshots in `qa/screens/`; Lighthouse HTML and JSON in `qa/lighthouse/`.

## Summary

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 1 |
| Medium | 7 |
| Low | 10 |
| Info | 3 |

Security spot checks all passed:
- Role and auth checks return the right status (401/403).
- Article HTML is sanitized on the server.
- Public payloads contain no emails.
- `/api/debug` is gone and `/api/health` returns no DB info.
- CORS does not reflect unknown origins.

The serious problems are functional. **Comments never load on any article** (Critical), and the **Compare picker mostly offers cars that cannot be compared** (High).

---

## Bugs

### C1 · Critical: Comments never load on any article (client asks for limit=100, API max is 50)
- **Where:**
  - Every article page, in the "Join the conversation" panel.
  - Request: `GET /api/comments/article/:id?limit=100`.
- **File:** `client/src/api/comments.js:7` sends `params: { limit: 100 }`. `server/routes/comments/comments-main.js:12` uses the shared pagination schema, which caps `limit` at 50.
- **Steps:**
  1. Open `/articles/mclaren-720s-review`.
  2. Click "Join the conversation".
- **Expected:** The existing comments are listed.
- **Actual:**
  - The panel shows "Couldn't load comments" with the raw message "Invalid limit: Too big: expected number to be <=50".
  - The comment count is missing from the "Join the conversation (N)" button, because the count request fails the same way.
  - Posting a comment shows "Comment posted successfully!" but the comment never appears, because the list re-fetch fails.
  - Every article page logs a 400 console error. Lighthouse flags it under `errors-in-console`.
- **Screenshot:** `qa/screens/comment-posted.png`
- **Fix:** Use `limit: 50` and paginate, or raise the server cap for this endpoint.
- **Note:** The rest of the comment UI (reply, edit, delete) was tested by rewriting the request to `limit=50` in the test harness. It all works once the list loads.

### H1 · High: Compare picker offers articles that have no specs, so most choices fail
- **Where:** `/compare`, both "Car A" and "Car B" selects.
- **File:** `client/src/features/compare/ComparePage.jsx:70-75`. The code checks `articles.some((x) => x.specs)`, but list items never include `specs` (see API.md: "List items have the same fields except … specs"). So the check always falls back to "every non-news article".
- **Steps:**
  1. Open `/compare`.
  2. Open the Car A picker: 10 of 11 options in this dataset; 7 of them have no spec sheet.
  3. Pick e.g. "Porsche — QA Seed Story 1".
- **Expected:** The picker lists only cars that have a spec sheet.
- **Actual:** You get the "unavailable" state (400 `COMPARE_UNAVAILABLE`). In production most articles have no specs, so most picks fail.
- **Screenshot:** `qa/screens/compare-unavailable.png`
- **Fix:** Add a `has_specs` boolean to list items, or a `?has_specs=true` filter, or a dedicated endpoint for compare candidates.

### M1 · Medium: Kicker shows "NEWS · NEWS" (the suspicious item from the brief is confirmed)
- **Where:** Home (Quick reads and More stories); the same component is used on the list and in Also today.
- **File:** `client/src/features/articles/ArticleCard.jsx:9`. The code builds `[article.make || article.category_name, TYPE_LABEL[type]]`.
  - When `make` is empty, the category name is used.
  - If the category is "News" and the type is `news`, the kicker reads "NEWS · NEWS".
  - The same logic also produces "NEWS · FEATURE" for a feature filed under the News category.
- **Steps:** Publish an article with no make, category "News" and type "news". Open `/`.
- **Expected:** One "NEWS" label, or the make/category plus a type that differs from it.
- **Actual:** "NEWS · NEWS", 3 times on the home page.
- **Screenshot:** `qa/screens/v-apex-light-home.png` (Quick reads row)
- **Fix:** Remove duplicates case-insensitively. Only use `category_name` when it differs from the type label.

### M2 · Medium: SEO title and description in the editor are thrown away
- **Where:** Admin editor, "Search appearance" section.
- **Files:**
  - `client/src/features/admin/editor/editorModel.js:97-98` sends `seo_title` and `seo_description`.
  - The server has no such columns or fields (nothing in `server/routes/articles` or `server/migrations`), so they are silently dropped.
  - The detail page uses `"<title> | APEX"` and the dek.
- **Steps:**
  1. Create an article with SEO title "QA SEO Title".
  2. Publish it.
  3. Call `GET /api/articles/:id`, then open the article page.
- **Expected:** `seo_title` is stored, and the page `<title>` uses it.
- **Actual:** `seo_title` is undefined, and `<title>` is "QA Full Article 90570 | APEX". The editor even shows a Google preview of a title that is never saved.
- **Fix:** Either add the columns plus API support, or remove the section from the editor.

### M3 · Medium: Home "Spec showdown" disappears (and logs a 400) when one of the two newest reviews has no specs
- **Where:** Home page; request `GET /api/compare?ids=20,19` → 400.
- **File:** `client/src/pages/HomePage.jsx:68` takes the first two `article_type === "review"` items with no check for specs. `features/home/SpecShowdown.jsx` returns `null` on the error.
- **Expected:** The showdown picks two reviews that have specs, or is hidden without an error.
- **Actual:** The section vanishes, leaves an empty band between "By make" and the newsletter, and logs a console error on every home load. In production, where few articles have specs, the showdown will rarely show at all.
- **Screenshot:** `qa/screens/v-apex-light-home.png`
- **Fix:** Same root cause as H1: the list endpoint needs a `has_specs` flag or filter.

### M4 · Medium: Autosave is only offered for restore when the body changed
- **Where:** `/admin/edit-article/:id`.
- **File:** `client/src/features/admin/editor/ArticleEditorPage.jsx:137`: `if (draft && draft.savedAt > updated && draft.values?.content !== v.content)`.
- **Steps:**
  1. Edit the title only.
  2. Wait for "Draft saved locally just now".
  3. Reload.
- **Expected:** The "You have a newer local draft… Restore it?" banner appears.
- **Actual:** The editor shows "No local changes" and the title edit is lost. The orphaned `apex-draft:<id>` key stays in localStorage. The same applies to dek, specs, gallery, tags and cover alt.
- **What works:**
  - With a body change, the banner appears.
  - Restore works.
  - "Save changes" returns PUT 200, keeps the gallery and specs, and clears the draft.
- **Fix:** Compare the whole serialised values object, not just `content`.

### M5 · Medium: "More McLaren" related block shows other makes, labelled "STORY" with the byline "APEX Staff"
- **Where:** The "Keep reading" section on the article detail page.
- **Files:**
  - `client/src/features/articles/detail/ArticleDetailPage.jsx:236` builds the heading `More ${article.make}`.
  - The server query in `server/routes/articles/articles-main.js:163` returns related articles by category, with only `id, title, slug, excerpt, featured_image_url, featured_image_alt, published_at`.
  - `client/src/api/normalize.js:27` falls back to "APEX Staff" for the author.
- **Steps:** Open `/articles/mclaren-720s-review`.
- **Expected:** McLaren stories, or a neutral heading, with the real kicker and author.
- **Actual:** "More McLaren" lists the Mercedes-AMG GT 63 and the Koenigsegg Jesko. Every card's kicker is "STORY" and every byline is "APEX Staff", though the real author is an admin user.
- **Screenshot:** `qa/screens/article-specsheet-viewport.png`
- **Fix:** Return `make, article_type, author_name, reading_time_min` for related items, and match on make before falling back to category. Or change the heading.

### M6 · Medium: Article page has a large layout shift on cold load (desktop CLS 0.287)
- **Where:** `/articles/:slug`, measured with Lighthouse desktop. The shifting element is `main#main > article > header.relative > div.shell` (the hero text block).
- **File:** `client/src/features/articles/detail/ArticleHero.jsx`. The hero header block shifts when the article loads in.
- **Expected:** CLS < 0.1.
- **Actual:** CLS 0.287 on desktop, the main reason the performance score is 81. On mobile Lighthouse measured 0, so the shift depends on the layout.
- **Fix:** Reserve the final height. Render the skeleton headline and dek at the same size, or use a min-height on the header.

### M7 · Medium: Public login demo card labels an admin account as "Reader account (alt)"
- **Where:** `/login`, Demo access card.
- **File:** `client/src/components/ui/demoAccounts.js:3`. `DEMO_READER_ALT` is `chayanon.5723@gmail.com / ppond333`, but `npm run seed` creates that user as **admin** (`ADMIN_EMAIL`). Confirmed: `POST /api/auth/login` returns `role: "admin"`.
- **Expected:** The reader buttons log in as a reader.
- **Actual:**
  - The "reader" button gives anyone a full admin session, which can create and delete articles.
  - It also publishes the owner's personal email address.
- **Context:** The boss decided demo credentials are shown on purpose, so this is about the label and the account choice, not the policy.
- **Fix:** Point the alt reader at a real `user`-role account, or drop it.

### L1 · Low: List tab reads "Newss"
- `client/src/features/articles/ArticlesListPage.jsx:130` uses `TYPE_LABEL[t] + "s"`, which turns "News" into "Newss".
- **Screenshot:** `qa/screens/articles-list.png`
- **Fix:** Use an explicit plural map.

### L2 · Low: Forgot-password copy says the link "expires in one hour"; the server TTL is 30 minutes
- `client/src/features/auth/ForgotPasswordPage.jsx:58`, compared with `RESET_TOKEN_TTL_MINUTES = 30` in `server/routes/auth`.

### L3 · Low: Comment length limit is 1000 in the client and 2000 in the API
- `client/src/features/comments/CommentForm.jsx:5` (`MAX_COMMENT_LENGTH = 1000`), while API.md says `content(1-2000)`. Align one with the other.

### L4 · Low: Member profile page has no Bio field
- The API supports `bio`, and the admin profile (`/admin/profile`) has a Bio textarea. The member `/profile` page (`client/src/features/profile/ProfilePage.jsx`) only has name, username and email.

### L5 · Low: API responses are not compressed
- No `compression` middleware in `server/app.js`. Lighthouse reports "Enable text compression" on `/api/articles/:slug`.
- Small today; it grows with list payloads. Railway does not gzip for you.

### L6 · Low (a11y): Accessible name does not match the visible label
- Lighthouse `label-content-name-mismatch` flags two navbar buttons (`client/src/layouts/Navbar.jsx`):
  - Search: `aria-label="Search (Ctrl+K)"` with visible text "Search Ctrl K".
  - Theme toggle: `aria-label="Switch to light theme"`.
- Voice-control users cannot activate them by their visible label.
- **Fix:** Start each aria-label with the visible text.

### L7 · Low: Compare swap writes an encoded comma (`?ids=3%2C1`)
- `ComparePage.jsx:102` passes `{ ids: "3,1" }` to `setParams`, which percent-encodes the comma.
- It works, but the shared URL is ugly and does not match the documented `?ids=a,b`.

### L8 · Low: Auth pages show two APEX logos
- `/login`, `/register`, `/forgot-password` and `/reset-password/:token` show the global navbar wordmark and the split layout's own wordmark, about 50 px apart.
- **Screenshot:** `qa/screens/reset-after.png`

### L9 · Low: The home "By make" rail is not aligned with the page grid
- The first card starts flush at the viewport's left edge instead of at the `.shell` gutter. The last card is clipped at the right edge on desktop 1440.
- **Screenshot:** `qa/screens/v-apex-light-home.png`, around y=1100–1150 at the displayed size.

### L10 · Low: Articles without a cover all show the same McLaren stock photo
- Any article with no `featured_image_url`, including the Ferrari, Toyota and AMG ones, shows the bundled `/img/*.jpg` McLaren shots.
- The 720S hero fallback has the alt text "Orange McLaren 720S on a mountain road".
- A neutral placeholder would be less misleading for other makes.

### Info
- **I1 · Demo "Use this":** it only fills the form; the user still clicks "Sign in". The brief expected fill and log in. This is OK if intentional.
- **I2 · Register:** it does not log the user in. It redirects to `/login` with an "Account created" toast, although the API returns a token. This is a design choice.
- **I3 · Comment storage:** comments are stored raw (`<b>hi</b><script>…</script>`) and rendered as text by React. Verified safe: no script ran and no `<img onerror>` was injected. If comments are ever rendered as HTML, they must be sanitized first.

---

## Pass/fail checklist

✅ pass · ❌ fail (bug ref) · ⚠️ pass with caveat

### Public
| Flow | Result |
|---|---|
| Home hero = featured article (720S, later the new featured Jesko) | ✅ |
| Home sections render with real API data (Also today, Latest/lead, Most read, 3-up, Quick reads, By make, Newsletter, More stories) | ✅ |
| Home duplicate-kicker check | ❌ M1 |
| Home Spec showdown | ❌ M3 |
| Home Load more (15 → 18 unique stories, button hides when done) | ✅ |
| /articles type tab → `?type=` | ✅ |
| /articles make chip → `&make=` | ✅ |
| /articles sort → `&sort=` (options: latest, popular) | ✅ |
| /articles search → `?q=` (debounced), finds Urus | ✅ |
| /articles deep link restores filters | ✅ |
| /articles empty state | ✅ |
| /articles pagination `?page=2` | ✅ |
| /articles tab labels | ❌ L1 |
| Detail: title, dek, byline, reading time | ✅ |
| Detail: TOC lists h2s; click scrolls and sets the hash | ✅ |
| Detail: spec sheet (count-up animates when in view) | ✅ |
| Detail: gallery lightbox opens (01/03 + caption + credit), ArrowRight advances, Escape closes | ✅ |
| Detail: share copy-link (clipboard holds the canonical URL, icon becomes "Link copied") | ✅ |
| Detail: related articles render | ⚠️ M5 |
| Detail: comments gate ("Join the conversation", sign-in prompt for anonymous users) | ⚠️ renders, but the list fails (C1) |
| Unknown slug → "This story isn't here" | ✅ |
| Legacy `/detail/1` redirect | ✅ |
| ⌘K / Ctrl+K opens search; results + facets; ArrowDown + Enter navigates | ✅ |
| "/" opens search | ✅ |
| /compare with two spec'd cars (720S vs Urus): bars, winners, "takes 4 of 6", swap | ✅ (⚠️ L7) |
| /compare picker | ❌ H1 |
| /compare with a no-spec car → friendly "unavailable" message | ✅ |
| Newsletter signup → "You're on the list" (API 201) | ✅ |
| Newsletter second signup → same UI (API 200, case-insensitive) | ✅ |
| Newsletter invalid email → 400 | ✅ |
| 404 page | ✅ |
| Theme toggle switches and persists across reload (`apex-theme`) | ✅ |
| Mobile 375: no horizontal overflow on home/list/article/compare/login | ✅ |
| Mobile 375: menu opens; link navigates and closes the menu | ✅ |

### Auth
| Flow | Result |
|---|---|
| Register new user | ✅ (I2) |
| Login | ✅ |
| Logout | ✅ |
| Wrong password → "Invalid email or password" | ✅ |
| Rate limit → "Too many attempts, try again later" (shared 10/15 min login+register bucket) | ✅ |
| Forgot password → generic "Check your inbox" | ✅ (copy ❌ L2) |
| Reset link logged by the server without the email, pointing at `http://localhost:4173/reset-password/<token>` | ✅ |
| /reset-password/:token → "Password updated" → redirect to sign in | ✅ |
| Login with the new password | ✅ |
| Token reuse → "Reset link is invalid or has expired" | ✅ |
| Demo "Use this" on /login fills the form; Sign in works | ✅ (I1) |
| Demo "Use this" on /admin/login fills the form; Sign in works | ✅ (I1) |
| Demo alt reader account | ❌ M7 |
| Member on /admin/login → "Access denied. Admin privileges required." | ✅ |

### Member
| Flow | Result |
|---|---|
| Comment list loads | ❌ C1 |
| Post comment (HTML is rendered as text, no XSS) | ✅ |
| Reply | ✅ |
| Edit own comment (persists after reload) | ✅ |
| Delete own reply / comment (confirm modal) | ✅ |
| No Edit/Delete buttons on others' comments | ✅ |
| API DELETE/PUT on another user's comment → 403 | ✅ |
| Profile update: name + avatar upload (stored as `/uploads/profiles/*.webp`, served 200 image/webp, shown in the navbar after reload, `GET /api/profile` reflects it) | ✅ |
| Change password: wrong current password → "Current password is incorrect", user stays logged in | ✅ |
| Change password: correct → confirm modal → new password works | ✅ |
| Member /notifications page | ✅ |

### Admin
| Flow | Result |
|---|---|
| Dashboard KPIs (published/drafts/comments/views) match `/api/admin/stats` | ✅ |
| 7-day views chart (with a table fallback for screen readers) | ✅ |
| Top articles | ✅ |
| Recent comments | ✅ |
| Create article: title, dek, Tiptap H2, pull-quote, inline image upload (201), YouTube embed | ✅ |
| Create article: cover image, make, type, featured, category, tags | ✅ |
| Create article: all 10 spec fields | ✅ |
| Gallery: 3 uploads, captions, keyboard reorder (order saved) | ✅ |
| Create article: SEO fields | ❌ M2 |
| Publish → 201; appears as home hero, in the list and on the detail page (youtube iframe, pull-quote, inline image, TOC, spec sheet, gallery) | ✅ |
| Server sanitization of a `<script>`/`onerror`/`javascript:`/evil iframe/`style`/`svg onload`/`data:` probe (h1→h2, YouTube iframe kept, `pull-quote` class kept, others stripped) | ✅ |
| Edit article → PUT 200; gallery and specs intact; local draft cleared | ✅ |
| Autosave restore banner (body change) | ✅ |
| Autosave restore banner (title-only change) | ❌ M4 |
| Draft not public: API 404 for anonymous users, absent from list and search, public page shows not-found | ✅ |
| Delete article from the /admin/articles list (confirm modal) | ✅ |
| Categories: create, rename, delete unused | ✅ |
| Categories: delete in use → 409 "This category is still used by articles…", category kept | ✅ |
| Categories: duplicate → 400 `CATEGORY_EXISTS` | ✅ |
| Notifications page lists "New comment on your article" | ✅ |
| Notifications: mark one read, mark all read; sidebar badge clears | ✅ |
| /admin/profile and /admin/reset-password load | ✅ |

### Security spot checks (curl against the real API)
| Check | Result |
|---|---|
| Member `POST /api/articles` → 403 `FORBIDDEN_ROLE` | ✅ |
| Member `POST /categories`, `GET /admin/stats`, `POST /uploads/image` → 403 | ✅ |
| Anonymous `POST /api/articles` → 401 `NO_TOKEN`; forged token → 401 `INVALID_TOKEN` | ✅ |
| `<script>`, `onerror`, `javascript:`, `style`, `svg`, `data:` and non-YouTube iframes stripped from content | ✅ |
| No `*email*` fields in `/articles`, `/articles/:id`, `/comments/article/:id`, `/categories`, `/makes`, `/search`, `/compare` | ✅ |
| `/api/health` = `{"status":"ok"}`; `/api/ready` has no DB info | ✅ |
| `/api/debug` and `/api/debug/articles` → 404 | ✅ |
| `?status=all` as anonymous → published only | ✅ |
| Validation: `limit=999` → 400, bad id → 400, unknown → 404, `compare?ids=1` → 400 | ✅ |
| Non-image upload → 400 `INVALID_IMAGE` | ✅ |
| CORS: evil origin gets no ACAO; `localhost:4173` allowed; helmet headers present, no `x-powered-by` | ✅ |
| Views deduped per IP per hour | ✅ |

### Visual
Checked in both themes (`v-apex-dark-*`, `v-apex-light-*`) on home, list, two articles, compare, login, register, about, help, contact and 404:

- No broken images anywhere.
- In-browser CLS on load was under 0.02 everywhere. Lighthouse's cold-load article CLS is in M6.
- No overlapping elements found. The hero headline sits over the car image by design; a gradient keeps it readable.
- An automated contrast scan flagged only white navbar and byline text over the hero photo. These are false positives: the scan cannot see the image behind them, and visual review shows they are readable.
- Layout nits: M3 (empty band), L8, L9, L10.

### Console (per page; everything else was clean)
| Page | Message |
|---|---|
| `/` | 400 `GET /api/compare?ids=20,19` (M3) |
| every `/articles/:slug` | 400 `GET /api/comments/article/:id?limit=100` (C1) |
| `/compare?ids=1,6` | 400 (expected `COMPARE_UNAVAILABLE`, handled in the UI) |
| `/login` | 401 / 429 (expected: wrong password and rate-limit tests) |
| `/admin/categories` | 409 (expected: in-use delete test) |
| `/reset-password/:token` | 400 (expected: token reuse test) |

No uncaught JS exceptions (`pageerror`) and no React warnings were recorded on any page.

---

## Lighthouse (vite preview + local API, Chrome headless; reports in `qa/lighthouse/`)

| Page | Device | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Home | Desktop | **96** | 100 | 96 | 100 | 0.9 s | 1.1 s | 10 ms | 0.007 |
| Home | Mobile | **76** | 100 | 96 | 100 | 2.2 s | 5.3 s | 150 ms | 0.036 |
| Article (720S) | Desktop | **81** | 100 | 96 | 100 | 0.9 s | 1.2 s | 0 ms | **0.287** |
| Article (720S) | Mobile | **66** | 100 | 96 | 100 | 4.1 s | 5.4 s | 240 ms | 0 |

Top opportunities:
1. **Preload the LCP image.** It is the hero `<img fetchpriority="high">`, discovered late because it renders after JS runs. Savings: about 910 ms on the article (mobile), 250 ms on the article (desktop).
2. **Reduce unused JS**, about 55–58 KiB. The main chunk is 155 kB gzipped.
3. **Fix the article hero layout shift** (M6).
4. **Serve next-gen images** (16 KiB) and **size images properly** (24 KiB on mobile home). The bundled `/img/*.jpg` fallbacks are JPEGs.
5. **Text compression** on API JSON (L5). `vite preview` does not compress either; Vercel will in production.
6. **Best practices 96**: lost on `errors-in-console` (C1/M3).
7. **Accessibility 100**: the score ignores the non-scored `label-content-name-mismatch` (L6).

Mobile numbers use simulated slow 4G and 4× CPU throttling against an unminified local API with no CDN. Treat them as relative, not absolute.

---

## Environment teardown
- API server, embedded Postgres and `vite preview` were stopped.
- The temp Postgres data dir, the temp upload dir and the temp client build dir were deleted.
- Local token files (`.at`, `.mt`, `.qauser.json`, `.created.json`) were removed.
- Production was never contacted.
- Files that remain under `qa/`:
  - scripts: `*.mjs`, `package.json`, `node_modules` (already covered by `.gitignore`)
  - `fixtures/`, `screens/`, `lighthouse/`, `results/`, `logs/`
  - this report

---

## Re-test after fixes (2026-11-17, Edit)

Same kind of stack as above: a fresh throwaway embedded PostgreSQL 16, `npm run migrate` (now **001–005**), `npm run seed`,
API on :3911, client built with `VITE_API_URL=http://localhost:3911` into a temp outDir and served by `vite preview --port 4173`.
Production was never contacted. The extra test data is now scripted in `qa/seed-extra.mjs` (14 published stories, a "News"
category, 2 of the QA stories with spec sheets, a 3-image gallery on the 720S, a demo-reader comment, and a comment that
notifies admin@example.com). New: `qa/retest.mjs` (one check per item below) and `qa/lighthouse.mjs` (3 runs per page and device,
median kept).

**Results:** `retest.mjs` 30/30 · `public.mjs` 47/47 (46/47 on the last run after the admin flow made its new article the featured cover, as in the first run) · `auth.mjs` 15/16 · `member2.mjs` 5/5 · `admin.mjs` 43/43 · `visual.mjs` 44/44.
`member.mjs` 29/32: its three remaining FAILs are harness steps that `member2.mjs` covers (editing by typing into a textarea the
helper cannot find, and changing the password without clicking the confirm modal); `member2.mjs` passes both. The one `auth.mjs`
FAIL is I1 (by design).
Server `npm test` 62/62 (7 new regression tests in `tests/qafixes.test.js`), `npm run test:pg` 27/27 (4 new, real PG).
Client `npm run lint` 0 problems, `npm run build` OK, main JS 142.5 kB gz (budget 160; was 155).

Harness changes made for the re-test (none of them hides a product failure):
- `member.mjs` / `member2.mjs`: removed the `limit=100 → 50` request rewrite (C1 is fixed in the app); the "other user's comment"
  is looked up via the API instead of assuming id 1; the new password is only saved when the change really worked.
- `public.mjs`: the sort check selects `popular` (the options are latest/popular; "oldest" never existed); the compare check uses
  the API's `has_specs` as ground truth; the newsletter check waits for the POST, not the CORS preflight; the collapsed comments
  panel is opened before it is read.
- `admin.mjs`: the edit step clicks "Save changes"; the anonymous draft check runs in a separate browser context (the old one
  shared the admin token); the recent-comments check compares with the API instead of the first run's comment texts.
- `visual.mjs`: uses the newest "QA Full Article" slug instead of a hard-coded one.
- Note: the first run's raw `results/*.json` and screenshots were overwritten by this re-run (same file names).

### Bug status

| # | Item | Status | Fix | Evidence |
|---|---|---|---|---|
| C1 | Comments never load | **FIXED** | Client pages at 50 (`COMMENTS_PAGE_SIZE`) with "Load more comments"; server pages over top-level comments with replies nested and returns `total_comments`; the gate count uses `total_comments` | retest: list loads 50, load more 50 → 72, gate "(72)", no `limit=100` request; member flows post/reply/edit/delete without the workaround; no 400 in any console |
| H1 | Compare picker offers spec-less cars | **FIXED** | `has_specs` on list and detail items + `?has_specs=true\|false` filter; the picker requests `has_specs=true` | retest + public: picker has 0 spec-less options; API `has_specs=true` → 8/8 spec'd |
| M1 | "NEWS · NEWS" kicker | **FIXED** | `kickerParts()` (normalize.js): unique, non-empty, case-insensitive; used by cards, cover and search | public + retest: no repeated kicker parts on home |
| M2 | SEO title/description dropped | **FIXED** | Migration 005 (`seo_title` ≤70, `seo_description` ≤160, CHECKs), zod on create/update, returned in detail; the article page uses them for `<title>`/meta; editor limit 70 | admin: "SEO fields persisted", `<title>` = "QA SEO Title", description = SEO description; pg-mem + real-PG tests |
| M3 | Spec showdown vanishes + 400 | **FIXED** | Home fetches the 2 newest `has_specs=true` stories; the band is hidden when fewer than 2; compare is never called with spec-less ids | retest: no 4xx on home, showdown rendered; console clean on `/` |
| M4 | Autosave restore only for body | **FIXED** | `draftDiffers()` compares every field (title, dek, body, specs, gallery, meta, SEO, tags); stale or identical drafts are removed | admin: title-only edit → banner → restore → "Save changes" PUT 200, gallery/specs intact, draft cleared |
| M5 | Related block wrong make/kicker/byline | **FIXED** | `findRelated()`: same make first, then category; items carry make/article_type/author_name/author_avatar_url/reading_time_min; "More <make>" only when every card is that make, else "Up next" | retest: GTS page → 720S first; kickers "MCLAREN · REVIEW", no "APEX Staff"; heading "Up next" when mixed |
| M6 | Article CLS 0.287 (desktop) | **FIXED** | Archivo `display=optional` (never swapped in late), metric-matched fallbacks for Inter/Newsreader, CSS entrance animations | Lighthouse article desktop CLS 0.002; in-browser cold load 0.0013 |
| M7 | Admin labelled "Reader account (alt)" | **FIXED** | Relabelled "Admin account (owner)"; offered only on admin login and Help (credentials stay visible, owner decision); /login shows only the reader | retest: /login card = reader only; admin card and Help show "Admin account (owner)"; that account logs in as `admin` |
| L1 | "Newss" | **FIXED** | `TYPE_PLURAL` map | tabs "All / Reviews / News / Features" |
| L2 | Forgot-password says one hour | **FIXED** | Copy says 30 minutes | auth: "It expires in 30 minutes." |
| L3 | Comment limit 1000 vs 2000 | **FIXED** | Client `MAX_COMMENT_LENGTH = 2000` | retest counter "/2000"; API test 2000 ok / 2001 → 400 |
| L4 | No bio on member profile | **FIXED** | Bio textarea on `/profile`; bio is now loaded from `GET /profile` on both profile pages, so saving no longer wipes it; API limit 280; the article author card shows the real bio, placeholder removed | retest: author card shows the saved bio, no placeholder text; API tests 281 → 400 |
| L5 | No API compression | **FIXED** | `compression` middleware (>1 KB) | `content-encoding: gzip`; Lighthouse `uses-text-compression` passes |
| L6 | Accessible name ≠ visible label | **FIXED** | Search `aria-label="Search Ctrl K"` (⌘K on Mac) + `aria-keyshortcuts`; the theme toggle name starts with its visible label | retest; Lighthouse `label-content-name-mismatch` passes |
| L7 | Compare URL `%2C` | **FIXED** | Query string built by hand | swap → `?ids=19,21` |
| L8 | Two logos on auth pages | **FIXED** | The split layout shows its wordmark only in the standalone (admin) variant | retest: 1 visible logo on /login; `screens/reset-after.png` |
| L9 | "By make" rail misaligned | **FIXED** | `.rail` padding + matching `scroll-padding` = shell gutter (snap no longer pulls the first card flush) | retest: first card left = heading left (105 px) |
| L10 | Same McLaren photo for every cover-less story | **FIXED** | `coverOf()` picks a bundled photo by make, else by a hash of the id; stand-in photos get `alt=""` | retest: 6 different fallback photos on home |
| I1 | Demo "Use this" only fills | Unchanged (design) | – | the one auth FAIL line is this expectation |
| I2 | Register does not log in | Unchanged (design) | – | – |
| I3 | Comments stored raw | Unchanged (safe) | Rendered as text | member: no script ran, no injected img |

Also fixed while re-testing:
- Hero headlines lost their word spaces (the space sat inside each word's inline-block and collapsed: "McLaren720SReview"). The space
  now sits between the word boxes (`MaskedHeadline.jsx`).
- After a successful password reset the page still showed "Link expired? Request a new one"; it is now shown only with the form.

### Performance work (item 11)
- A boot script in `index.html` (above every stylesheet) starts the landing route's API request(s), preloads the cover with the same
  srcset/sizes as the hero, and paints the photo early in `#boot-hero`; the app reuses those responses (`lib/prefetch.js`). The entry
  chunk is downloaded at once (modulepreload) but evaluated after that photo has painted (max 1.2 s). Article route chunks are
  modulepreloaded on a cold article load.
- Bundled JPEG fallbacks → responsive WebP (240–1920 w) in `public/img/opt` (`client/scripts/optimize-images.mjs`); the originals are
  kept for existing links.
- sonner is lazy (`lib/toast.js` + `ToasterHost`); daisyUI is limited to its base layer (CSS 19.5 → 14 kB gz); Inter/Newsreader/Mono
  load after `load` with metric-matched fallbacks; hero/intro/headline animations are CSS; motion's `useScroll` was replaced by a
  scroll-only listener (`hooks/useScrollProgress.js`, Navbar), which removed ~0.4 s of forced layout under 4× CPU; the first render
  and the below-the-fold sections use `startTransition`; `Intl.DateTimeFormat` is cached.
- Main JS 155 → 142.5 kB gz. Lighthouse still lists ~50 KiB of "unused JS" in the main chunk (react-dom / react-router / motion code
  not needed for the first view). The remaining big removable piece is axios (~13 kB gz); it was not replaced because upload progress
  and the mock adapter depend on it.
- Trade-off to know: with `display=optional`, a first visit on a slow connection shows the hero headline in the fallback face
  (Inter/system) instead of Archivo; Archivo is used from the cache on later pages and visits.

### Lighthouse after fixes (vite preview + local API, Chrome headless, median of 3; reports in `qa/lighthouse/`)

| Page | Device | Perf (before → after) | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | 3 runs |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | Desktop | 96 → **98** | 100 | 100 | 100 | 0.5 s | 0.5 s | 0 ms | 0.003 | 98 / 98 / 98 |
| Home | Mobile | 76 → **90** | 100 | 100 | 100 | 1.9 s | 2.0 s | 300 ms | 0 | 86 / 90 / 92 |
| Article (720S) | Desktop | 81 → **99** | 100 | 100 | 100 | 0.5 s | 0.5 s | 0 ms | 0.002 | 99 / 99 / 100 |
| Article (720S) | Mobile | 66 → **84** | 100 | 100 | 100 | 2.1 s | 2.4 s | 430 ms | 0 | 82 / 84 / 84 |

Earlier batches during the work gave home mobile medians of 93–96 and article mobile 82–86; the spread comes almost entirely from
TBT. Targets: home mobile ≥ 90 **met**; article mobile ≥ 85 **not reliably met** (median 84 in the final batch). LCP (2.4 s, was 5.4 s),
CLS (0) and FCP are in the green; what is left is TBT from evaluating the ~430 kB main bundle plus style/layout of the article under
4× CPU. Next steps if needed: replace axios with a small fetch client, make the motion `m` components on the article lazy, and trim
Tailwind/daisyUI base CSS further.

Best practices 96 → 100 (no console errors: C1/M3 gone). `uses-text-compression`, `modern-image-formats` and
`label-content-name-mismatch` pass. `uses-responsive-images` still flags ~40 KiB: card images uploaded through `/uploads` are a
single 2000 px WebP with no srcset (Cloudinary uploads get srcset; local disk uploads would need server-side variants).

### Environment teardown (re-test)
- API, embedded Postgres (temp dir deleted by `stack.mjs /stop`) and `vite preview` stopped; temp client build deleted; `.qauser.json` removed.
- `client/dist` was rebuilt by the required `npm run build` (no `VITE_API_URL`, as before).

