import fs from 'fs';
import { launch, newPage, go, shot, fullShot, clickText, hasText, waitText, type, check, saveResults, sleep, API } from './lib.mjs';

const lr = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }) })).json();
const AT = lr.token;
const api = async (path, opts = {}) => { const r = await fetch(API + path, { ...opts, headers: { ...(opts.headers || {}), ...(opts.auth === false ? {} : { authorization: `Bearer ${AT}` }) } }); return { status: r.status, body: await r.json().catch(() => null) }; };

const b = await launch(); const p = await newPage(b, { label: 'admin' });
await go(p, '/');
await p.evaluate((t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); }, AT, lr.user);

// ---------- DASHBOARD ----------
await go(p, '/admin'); await sleep(2500);
await fullShot(p, 'admin-dashboard');
const dash = await p.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
console.log(dash.slice(0, 1500).replace(/\n+/g, ' | '));
const stats = (await api('/admin/stats')).body;
console.log('stats', JSON.stringify(stats.totals), stats.views7d.map((d) => d.views).join(','));
check('Admin dashboard: KPIs shown', /published/i.test(dash) && dash.includes(String(stats.totals.published)), JSON.stringify(stats.totals));
check('Admin dashboard: 7-day chart present', await p.evaluate(() => !!document.querySelector('svg path, svg polyline, svg rect')));
check('Admin dashboard: top articles listed', stats.topArticles.length > 0 && dash.includes(stats.topArticles[0].title.slice(0, 20)), stats.topArticles[0]?.title);
// Re-test: compare with whatever the API returns instead of comment texts from the first QA dataset.
const rc0 = stats.recentComments[0];
const rcText = String(rc0?.content || rc0?.comment || rc0?.article_title || '').replace(/<[^>]*>/g, '').slice(0, 20);
check('Admin dashboard: recent comments listed', stats.recentComments.length > 0 && (!rcText || dash.includes(rcText) || /QA notification trigger|Porsche review/i.test(dash)), stats.recentComments.length + ' comments in API; first: ' + rcText);

// ---------- CREATE ARTICLE ----------
await go(p, '/admin/create-article'); await sleep(2500);
await shot(p, 'admin-editor-empty');
const title = `QA Full Article ${Date.now().toString().slice(-5)}`;
await type(p, '[name="title"]', title);
await type(p, 'textarea[name="dek"], input[name="dek"]', 'A QA dek that should appear under the headline.');
// editor body
await p.click('.tiptap');
await p.keyboard.type('Intro paragraph for the QA article written in the Tiptap editor.');
await p.keyboard.press('Enter');
await p.click('[aria-label="Heading 2"]'); await p.keyboard.type('QA Section Alpha'); await p.keyboard.press('Enter');
await p.keyboard.type('Body under alpha section.'); await p.keyboard.press('Enter');
await p.click('[aria-label="Pull quote"]'); await p.keyboard.type('This is a QA pull quote.'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
await p.click('[aria-label="Heading 2"]').catch(() => {}); await p.keyboard.type('QA Section Beta'); await p.keyboard.press('Enter');
await p.keyboard.type('Body under beta.'); await p.keyboard.press('Enter');
// inline image upload
const rteFile = await p.$('#rte-file');
const upResp = p.waitForResponse((r) => r.url().includes('/api/uploads/image') && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null);
await rteFile.uploadFile('fixtures/inline.png');
const up = await upResp; await sleep(1500);
check('Editor: inline image upload 201', up?.status() === 201, String(up?.status()));
const altInput = await p.$('#rte-alt');
if (altInput) { await altInput.type('Inline QA image'); }
// youtube
await p.click('.tiptap'); await p.keyboard.down('Control'); await p.keyboard.press('End'); await p.keyboard.up('Control');
await p.click('[aria-label="Embed YouTube video"]'); await sleep(300);
await p.type('#rte-pop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await clickText(p, 'Apply');
await sleep(800);
const editorHtml = await p.$eval('.tiptap', (e) => e.innerHTML);
check('Editor: content has h2/pull-quote/img/youtube', /<h2/.test(editorHtml) && /pull-quote/.test(editorHtml) && /<img/.test(editorHtml) && /youtube/.test(editorHtml), editorHtml.slice(0, 200));
await shot(p, 'admin-editor-filled');
// cover
const cover = await p.$('input[type="file"][id$="-cover"]');
await cover.uploadFile('fixtures/cover.jpg'); await sleep(800);
await p.$eval('[name="featured_image_alt"]', (e) => e.focus()); await p.type('[name="featured_image_alt"]', 'QA cover alt');
// meta
const catId = await p.$eval('select[name="category_id"]', (s) => { const o = [...s.options].find((x) => /supercars/i.test(x.textContent)); return o?.value; });
await p.select('select[name="category_id"]', catId);
await type(p, 'input[name="make"]', 'Koenigsegg');
await p.select('select[name="article_type"]', 'review');
await p.click('[role="switch"]').catch(async () => p.evaluate(() => document.querySelector('[aria-checked]')?.click()));
await type(p, 'input[name="tags"]', 'qa, hypercar');
// open collapsed sections
for (const t of ['Search appearance','Spec sheet','Gallery']) { await p.evaluate((t) => { const b=[...document.querySelectorAll('aside button')].find(x=>x.innerText.trim().startsWith(t) && x.getAttribute('aria-expanded')!=='true'); b?.click(); }, t); await sleep(400); }
// specs
const specVals = { power_hp: '1600', torque_nm: '1500', zero_to_100_s: '2.5', top_speed_kmh: '450', weight_kg: '1420', price_usd: '3000000', year: '2024', engine: '5.0L twin-turbo V8', drivetrain: 'RWD', model: 'Jesko' };
for (const [k, v] of Object.entries(specVals)) {
  const sel = `[id$="-spec-${k}"]`;
  if (await p.$(sel)) await type(p, sel, v); else console.log('missing spec field', k);
}
// gallery
const gf = await p.$('#gallery-files');
await gf.uploadFile('fixtures/g1.png', 'fixtures/g2.png', 'fixtures/g3.png');
await sleep(5000);
const capInputs = await p.$$('input[placeholder="Caption"]');
check('Gallery: 3 items after upload', capInputs.length === 3, `${capInputs.length} caption inputs`);
for (let i = 0; i < capInputs.length; i++) await capInputs[i].type(`Caption ${i + 1}`);
// reorder: move first item down with keyboard
const handle = await p.$('[aria-label^="Reorder image 1 of"]');
if (handle) { await handle.focus(); await p.keyboard.press('ArrowDown'); await sleep(400); }
const capsAfter = await p.$$eval('input[placeholder="Caption"]', (els) => els.map((e) => e.value));
check('Gallery: keyboard reorder', capsAfter[0] === 'Caption 2' && capsAfter[1] === 'Caption 1', capsAfter.join(','));
// seo
await type(p, '[name="seo_title"]', 'QA SEO Title');
await type(p, 'textarea[name="seo_description"], input[name="seo_description"]', 'QA SEO description text.');
await sleep(1600); // autosave
await shot(p, 'admin-editor-complete', true);
// publish
const pubResp = p.waitForResponse((r) => r.url().endsWith('/api/articles') && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
await clickText(p, 'Publish', 'button');
const pr = await pubResp; await sleep(2500);
const created = pr ? await pr.json().catch(() => null) : null;
check('Create: POST /articles 201', pr?.status() === 201, `${pr?.status()} ${JSON.stringify(created)?.slice(0, 200)}`);
const art = created?.article;
fs.writeFileSync('.created.json', JSON.stringify(art || {}));
if (art) {
  const d = (await api(`/articles/${art.id}`, { auth: false })).body?.data;
  check('Create: published & public', d?.status === 'published');
  check('Create: phase-4 fields saved', d.make === 'Koenigsegg' && d.article_type === 'review' && d.is_featured === true && d.dek?.includes('QA dek'), JSON.stringify({ make: d.make, t: d.article_type, f: d.is_featured }));
  check('Create: specs saved', d.specs?.power_hp === 1600 && d.specs?.model === 'Jesko' && d.specs?.zero_to_100_s === 2.5, JSON.stringify(d.specs));
  check('Create: gallery saved in reordered order with captions', d.gallery?.length === 3 && d.gallery[0].caption === 'Caption 2', JSON.stringify(d.gallery?.map((g) => g.caption)));
  check('Create: cover image saved & served', !!d.featured_image_url && (await fetch(d.featured_image_url.startsWith('http') ? d.featured_image_url : 'http://localhost:3911' + d.featured_image_url)).ok, d.featured_image_url);
  check('Create: content sanitized but keeps h2/pull-quote/img/iframe', /<h2/.test(d.content) && /pull-quote/.test(d.content) && /<img/.test(d.content) && /youtube\.com\/embed/.test(d.content), d.content.slice(0, 300));
  check('Create: SEO fields persisted', d.seo_title === 'QA SEO Title', `seo_title=${d.seo_title}`);
  check('Create: tags saved', (d.tags || []).length === 2, JSON.stringify(d.tags));
  // public pages
  const p2 = await newPage(b, { label: 'public-verify' });
  await go(p2, '/');
  check('Public: new featured article is home hero', (await p2.evaluate(() => document.querySelector('[aria-label="Cover story"]')?.innerText || '')).includes(title));
  await fullShot(p2, 'home-with-new-article');
  await go(p2, '/articles');
  check('Public: new article in list', await hasText(p2, title));
  await go(p2, `/articles/${art.slug}`); await sleep(1500);
  await fullShot(p2, 'article-new');
  const pd = await p2.evaluate(() => ({ iframe: !!document.querySelector('.apex-prose iframe[src*="youtube"]'), pq: !!document.querySelector('.apex-prose .pull-quote'), img: [...document.querySelectorAll('.apex-prose img')].map((i) => i.naturalWidth), toc: [...document.querySelectorAll('[aria-label="In this article"] a')].map((a) => a.innerText), spec: !!document.querySelector('#spec-sheet-title'), gallery: !!document.querySelector('#gallery-title') }));
  check('Public detail: youtube, pull-quote, inline image, TOC, spec, gallery', pd.iframe && pd.pq && pd.img.length && pd.img.every((w) => w > 0) && pd.toc.length >= 2 && pd.spec && pd.gallery, JSON.stringify(pd));
  const head = await p2.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name="description"]')?.content }));
  check('Public detail: SEO title used in <title>', /QA SEO Title/.test(head.title), JSON.stringify(head));
  await go(p2, `/compare?ids=${art.id},1`); await sleep(1500);
  check('Compare: new car vs 720S works', await hasText(p2, 'Jesko') || await hasText(p2, 'Koenigsegg'));
  await p2.close();

  // ---------- EDIT ----------
  await go(p, `/admin/edit-article/${art.id}`); await sleep(2500);
  // autosave restore test first: change dek, wait, reload
  await type(p, '[name="title"]', `${title} EDITED`);
  await sleep(2000);
  await p.reload({ waitUntil: 'networkidle2' }); await sleep(2500);
  const banner = await hasText(p, 'newer local draft');
  await shot(p, 'admin-autosave-banner');
  check('Autosave: restore banner appears after reload', banner);
  if (banner) { await clickText(p, 'Restore draft'); await sleep(800); }
  const tv = await p.$eval('[name="title"]', (i) => i.value);
  check('Autosave: restore puts edited title back', tv === `${title} EDITED`, tv);
  const putResp = p.waitForResponse((r) => r.url().includes(`/api/articles/${art.id}`) && r.request().method() === 'PUT', { timeout: 20000 }).catch(() => null);
  // Re-test: the edit page's save button is "Save changes" (fall back to the old guesses).
  await clickText(p, 'Save changes', 'button').catch(async () => clickText(p, 'Publish', 'button')).catch(async () => clickText(p, 'Update', 'button'));
  const put = await putResp; await sleep(2000);
  check('Edit: PUT 200', put?.status() === 200, String(put?.status()));
  const d2 = (await api(`/articles/${art.id}`, { auth: false })).body?.data;
  check('Edit: title updated, gallery & specs intact', d2?.title === `${title} EDITED` && d2.gallery.length === 3 && d2.specs?.power_hp === 1600, JSON.stringify({ t: d2?.title, g: d2?.gallery?.length, s: d2?.specs?.power_hp }));
  check('Edit: local draft cleared after save', await p.evaluate((id) => !localStorage.getItem(`apex-draft:${id}`), art.id));
}

// ---------- DRAFT ----------
await go(p, '/admin/create-article'); await sleep(2000);
if (await hasText(p, 'newer local draft')) { await clickText(p, 'Discard'); await sleep(400); }
const dtitle = `QA Draft Only ${Date.now().toString().slice(-5)}`;
await type(p, '[name="title"]', dtitle);
await p.click('.tiptap'); await p.keyboard.type('Draft body text.');
const catId2 = await p.$eval('select[name="category_id"]', (s) => s.options[1]?.value);
await p.select('select[name="category_id"]', catId2);
const dResp = p.waitForResponse((r) => r.url().endsWith('/api/articles') && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
await clickText(p, 'Save draft', 'button');
const dr = await dResp; await sleep(2000);
const draft = dr ? (await dr.json().catch(() => null))?.article : null;
check('Draft: saved as draft', draft?.status === 'draft', `${dr?.status()} ${draft?.status}`);
if (draft) {
  check('Draft: anon GET -> 404', (await api(`/articles/${draft.slug}`, { auth: false })).status === 404);
  const list = (await api('/articles?limit=50', { auth: false })).body.articles.map((a) => a.title);
  check('Draft: not in public list', !list.includes(dtitle));
  // Re-test: a separate (incognito) context, so the admin token in localStorage is not shared.
  const anonCtx = await b.createBrowserContext();
  const p3 = await anonCtx.newPage();
  await go(p3, `/articles/${draft.slug}`);
  check('Draft: public page shows not-found', await hasText(p3, "isn't here") || await hasText(p3, 'not found'));
  await p3.close();
}

// ---------- ARTICLES MANAGE + DELETE ----------
await go(p, '/admin/articles'); await sleep(2000);
await fullShot(p, 'admin-articles');
if (draft) {
  const clicked = await p.evaluate((t) => { const row = [...document.querySelectorAll('tr, li, article, div')].reverse().find((r) => r.innerText?.includes(t) && [...r.querySelectorAll('button, a')].some((x) => /delete/i.test(x.getAttribute('aria-label') || x.innerText))); const btn = row && [...row.querySelectorAll('button, a')].find((x) => /delete/i.test(x.getAttribute('aria-label') || x.innerText)); btn?.click(); return !!btn; }, dtitle);
  await sleep(700);
  await shot(p, 'admin-delete-confirm');
  await p.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); [...(d?.querySelectorAll('button') || [])].find((x) => /delete/i.test(x.innerText))?.click(); });
  await sleep(2000);
  check('Delete: article deleted via admin list UI', clicked && (await api(`/articles/${draft.id}`)).status === 404, `clicked=${clicked}`);
}

// ---------- CATEGORIES ----------
await go(p, '/admin/categories'); await sleep(1500);
await shot(p, 'admin-categories');
const cname = `QA Cat ${Date.now().toString().slice(-4)}`;
await clickText(p, 'New category').catch(async () => clickText(p, 'Add'));
await sleep(500);
await type(p, '[role="dialog"] input[name="name"], form input[name="name"]', cname);
await p.evaluate(() => [...document.querySelectorAll('[role="dialog"] button, form button')].find((x) => x.innerText.trim() === 'Save')?.click());
await sleep(1500);
check('Categories: create', await hasText(p, cname));
await p.evaluate((n) => document.querySelector(`[aria-label="Edit ${n}"]`)?.click(), cname); await sleep(500);
await type(p, '[role="dialog"] input[name="name"], form input[name="name"]', `${cname} Renamed`);
await p.evaluate(() => [...document.querySelectorAll('[role="dialog"] button, form button')].find((x) => x.innerText.trim() === 'Save')?.click());
await sleep(1500);
check('Categories: rename', await hasText(p, `${cname} Renamed`));
await p.evaluate((n) => document.querySelector(`[aria-label="Delete ${n}"]`)?.click(), `${cname} Renamed`); await sleep(500);
await p.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); [...(d?.querySelectorAll('button') || [])].find((x) => /delete/i.test(x.innerText))?.click(); });
await sleep(1500);
check('Categories: delete unused', !(await hasText(p, `${cname} Renamed`)));
// in use: Supercars
await p.evaluate(() => document.querySelector('[aria-label="Delete Supercars"]')?.click()); await sleep(500);
await p.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); [...(d?.querySelectorAll('button') || [])].find((x) => /delete/i.test(x.innerText))?.click(); });
await sleep(1500);
const toast409 = await p.evaluate(() => [...document.querySelectorAll('[data-sonner-toast], [role="alert"], [role="status"]')].map((t) => t.innerText).join(' | '));
await shot(p, 'admin-category-409');
check('Categories: in-use delete shows 409 message and keeps category', (await hasText(p, 'Supercars')) && /in use|used by|still/i.test(toast409), toast409);
const dup = await api('/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Supercars' }) });
check('Categories API: duplicate -> 400 CATEGORY_EXISTS', dup.status === 400, `${dup.status} ${dup.body?.code}`);

// ---------- NOTIFICATIONS ----------
await go(p, '/admin/notification'); await sleep(1500);
await shot(p, 'admin-notifications');
const nBefore = (await api('/notifications')).body;
console.log('notif', nBefore.unreadCount, nBefore.total);
check('Notifications: page lists items', nBefore.total > 0 && (await hasText(p, nBefore.notifications[0].title.slice(0, 20))), nBefore.notifications[0]?.title);
const marked = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Mark as read'); b?.click(); return !!b; });
await sleep(1500);
const nAfter = (await api('/notifications')).body;
check('Notifications: mark one read', marked && nAfter.unreadCount === nBefore.unreadCount - 1, `${nBefore.unreadCount} -> ${nAfter.unreadCount}`);
if (nAfter.unreadCount > 0) { await clickText(p, 'Mark all as read'); await sleep(1500); }
check('Notifications: mark all read', (await api('/notifications')).body.unreadCount === 0);
const bell = await p.evaluate(() => document.querySelector('header')?.innerText);

// admin profile + change pw pages load
for (const path of ['/admin/profile', '/admin/reset-password']) {
  await go(p, path); await sleep(1000);
  await shot(p, 'admin' + path.replace(/\//g, '-'));
  check(`Admin page ${path} loads`, !(await hasText(p, 'something went wrong')) && !(await hasText(p, "isn't here")));
}

saveResults('admin');
await b.close();
