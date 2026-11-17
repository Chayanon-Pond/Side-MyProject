// Extra QA data on top of `npm run seed` (local QA stack only, never production):
// 14 more published articles (mixed makes/types, some covers, some without a make, a "News"
// category, a couple with spec sheets) plus a 3-image gallery on the 720S.
// Usage (stack + API running): node seed-extra.mjs
import fs from 'fs';
import { API } from './lib.mjs';

const login = await (await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
})).json();
const auth = { authorization: `Bearer ${login.token}` };
const json = async (path, opts = {}) => {
  const r = await fetch(API + path, { ...opts, headers: { ...auth, ...(opts.headers || {}) } });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${r.status} ${JSON.stringify(body)}`);
  return body;
};

const listCats = async () => {
  const cats = await json('/categories');
  return Array.isArray(cats) ? cats : cats.categories || cats.data || [];
};
let catList = await listCats();
if (!catList.find((c) => c.name === 'News')) {
  await json('/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'News' }) });
  catList = await listCats();
}
const news = catList.find((c) => c.name === 'News');
const supercars = catList.find((c) => c.slug === 'supercars');
const suvs = catList.find((c) => c.slug === 'performance-suvs') || supercars;

const cover = fs.readFileSync('fixtures/cover.jpg');
const STORIES = [
  { title: 'QA Seed Story 1', make: 'Porsche', type: 'review', cat: supercars, cover: true },
  { title: 'QA Seed Story 2', make: 'Porsche', type: 'news', cat: news },
  { title: 'QA Seed Story 3', make: 'Ferrari', type: 'news', cat: news, cover: true },
  { title: 'QA Seed Story 4', make: 'Toyota', type: 'feature', cat: supercars },
  { title: 'QA Seed Story 5', make: null, type: 'news', cat: news },
  { title: 'QA Seed Story 6', make: 'Mercedes-AMG', type: 'review', cat: supercars, specs: { power_hp: 630, torque_nm: 900, zero_to_100_s: 3.2, top_speed_kmh: 315, model: 'GT 63 S' } },
  { title: 'QA Seed Story 7', make: null, type: 'news', cat: news, cover: true },
  { title: 'QA Seed Story 8', make: 'Porsche', type: 'feature', cat: supercars },
  { title: 'QA Seed Story 9', make: 'Ferrari', type: 'review', cat: supercars, specs: { power_hp: 830, torque_nm: 800, zero_to_100_s: 2.9, top_speed_kmh: 340, model: '812 Competizione' } },
  { title: 'QA Seed Story 10', make: null, type: 'feature', cat: news },
  { title: 'QA Seed Story 11', make: 'Lamborghini', type: 'news', cat: suvs },
  { title: 'QA Seed Story 12', make: 'Toyota', type: 'review', cat: supercars, cover: true },
  { title: 'QA Seed Story 13', make: 'Porsche', type: 'review', cat: supercars },
  { title: 'QA Seed Story 14', make: 'BMW', type: 'news', cat: news },
];

const existing = new Set((await json('/articles?limit=50')).articles.map((a) => a.title));
const body = (n) => `<h2>Section one</h2><p>${'Words about cars and roads. '.repeat(40)}</p><h2>Section two</h2><p>Story ${n}.</p>`;
for (const s of STORIES) {
  if (existing.has(s.title)) continue;
  const fd = new FormData();
  fd.append('title', s.title);
  fd.append('content', body(s.title));
  fd.append('category_id', String(s.cat.id));
  fd.append('status', 'published');
  fd.append('dek', `${s.title}: a short dek for QA.`);
  fd.append('article_type', s.type);
  if (s.make) fd.append('make', s.make);
  if (s.specs) fd.append('specs', JSON.stringify(s.specs));
  if (s.cover) {
    fd.append('featured_image', new Blob([cover], { type: 'image/jpeg' }), 'cover.jpg');
    fd.append('featured_image_alt', `${s.title} cover`);
  }
  const r = await json('/articles', { method: 'POST', body: fd });
  console.log('+', r.article.id, s.title);
  await new Promise((res) => setTimeout(res, 30)); // distinct published_at ordering
}

// Gallery on the 720S.
const gallery = [];
for (const g of ['g1', 'g2', 'g3']) {
  const fd = new FormData();
  fd.append('image', new Blob([fs.readFileSync(`fixtures/${g}.png`)], { type: 'image/png' }), `${g}.png`);
  const up = await json('/uploads/image', { method: 'POST', body: fd });
  gallery.push({ url: up.url, caption: `Caption ${g}`, credit: 'QA', width: up.width, height: up.height });
}
const mc = await json('/articles/mclaren-720s-review');
await json(`/articles/${mc.data.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gallery }) });
console.log('gallery on 720S:', gallery.length);

// A comment by the demo reader on the 720S (the member flow checks it cannot edit/delete it).
const demo = await (await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'some@gmail.com', password: 'ppond333' }),
})).json();
const existingComments = (await json(`/comments/article/${mc.data.id}?limit=50`)).comments;
if (!existingComments.some((c) => c.user_username === demo.user?.username)) {
  await fetch(`${API}/comments/article/${mc.data.id}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${demo.token}` },
    body: JSON.stringify({ content: '<b>hi</b><script>x</script>' }),
  });
  console.log('demo reader comment on 720S');
}

// A reader comment on an article authored by admin@example.com, so that admin has a
// "New comment on your article" notification (admin flow: notifications page).
const story1 = (await json('/articles?limit=50')).articles.find((a) => a.title === 'QA Seed Story 1');
if (story1) {
  const onStory1 = (await json(`/comments/article/${story1.id}?limit=50`)).comments;
  if (!onStory1.some((c) => /QA notification trigger/.test(c.content))) {
    await fetch(`${API}/comments/article/${story1.id}`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${demo.token}` },
      body: JSON.stringify({ content: 'QA notification trigger: great Porsche review' }),
    });
    console.log('notification trigger comment on QA Seed Story 1');
  }
}
