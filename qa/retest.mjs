// Targeted re-test of every item in QA-REPORT.md after the fixes (local QA stack only).
// Usage: node retest.mjs   -> results/retest.json
import { launch, newPage, go, shot, check, saveResults, sleep, API, BASE, clickText } from './lib.mjs';

const waitApi = async () => {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${API}/health`)).ok) return; } catch { /* starting */ }
    await sleep(500);
  }
};
await waitApi();
const login = async (email, password) => (await fetch(`${API}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
})).json();
const admin = await login('admin@example.com', 'admin123');
const reader = await login('some@gmail.com', 'ppond333');
const authed = (t) => ({ authorization: `Bearer ${t}` });
const getJson = async (path, t) => (await fetch(API + path, { headers: t ? authed(t) : {} })).json();

const b = await launch();
const p = await newPage(b, { label: 'retest' });
const mc = (await getJson('/articles/mclaren-720s-review')).data;

// ---- C1: comments load (limit 50) + load more past 50 top-level comments
for (let i = 0; i < 52; i += 1) {
  await fetch(`${API}/comments/article/${mc.id}`, {
    method: 'POST', headers: { ...authed(reader.token), 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Retest bulk comment ${i}` }),
  });
  if (i === 18 || i === 37) { await fetch('http://127.0.0.1:3912/restart-server'); await waitApi(); } // comment limiter 20/min
}
const reqs = [];
p.on('request', (r) => { if (r.url().includes('/api/comments/article/')) reqs.push(r.url()); });
await go(p, '/articles/mclaren-720s-review');
const gate = await p.$eval('[aria-controls="comments"]', (x) => x.innerText).catch(() => '');
check('C1: "Join the conversation (N)" shows the count', /\(\d+\)/.test(gate), gate);
await p.click('[aria-controls="comments"]'); await sleep(1500);
const firstPage = await p.$$eval('#comments article[id^="comment-"]', (a) => a.length);
check('C1: comment list loads (no "Couldn\'t load comments")', firstPage > 0 && !(await p.evaluate(() => document.body.innerText.includes("Couldn't load comments"))), `${firstPage} rendered`);
check('C1: client asks limit=50 (never 100)', reqs.length > 0 && reqs.every((u) => !u.includes('limit=100')), reqs.join(' '));
const hasMore = await p.evaluate(() => [...document.querySelectorAll('#comments button')].some((x) => /load more comments/i.test(x.innerText)));
check('C1: "Load more comments" offered past 50', hasMore);
if (hasMore) {
  await clickText(p, 'Load more comments'); await sleep(1500);
  const after = await p.$$eval('#comments article[id^="comment-"]', (a) => a.length);
  check('C1: load more appends the next page', after > firstPage, `${firstPage} -> ${after}`);
}
await shot(p, 'retest-comments');

// ---- H1 / M3
const list = await getJson('/articles?limit=50');
check('H1: list items carry has_specs', list.articles.every((a) => typeof a.has_specs === 'boolean'));
const spec = await getJson('/articles?limit=50&has_specs=true');
check('H1: ?has_specs=true returns only spec sheets', spec.articles.length > 0 && spec.articles.every((a) => a.has_specs), `${spec.articles.length} of ${list.pagination.total}`);
const homeErrors = [];
const onResp = (r) => { if (r.status() >= 400) homeErrors.push(`${r.status()} ${r.url()}`); };
p.on('response', onResp);
await go(p, '/'); await sleep(1500);
p.off('response', onResp);
check('M3: home makes no 4xx request (no compare with spec-less ids)', homeErrors.length === 0, homeErrors.join(' '));
check('M3: Spec showdown shown (>= 2 spec\'d articles exist)', await p.evaluate(() => !!document.querySelector('#showdown-heading')));

// ---- M1 / L1 / L9
const kickers = await p.$$eval('.kicker', (k) => k.map((x) => x.innerText.trim()));
const dup = kickers.filter((k) => { const parts = k.split('·').map((s) => s.trim().toLowerCase()); return new Set(parts).size !== parts.length; });
check('M1: no repeated kicker parts on home', dup.length === 0, dup.join(', '));
const rail = await p.evaluate(() => {
  const r = document.querySelector('#makes-heading')?.closest('section');
  const card = r?.querySelector('a[href*="make="]');
  const shellHead = document.querySelector('#makes-heading');
  return card && shellHead ? { card: Math.round(card.getBoundingClientRect().left), head: Math.round(shellHead.getBoundingClientRect().left) } : null;
});
check('L9: "By make" first card aligned with the section heading', rail && Math.abs(rail.card - rail.head) <= 1, JSON.stringify(rail));
await go(p, '/articles');
const tabs = await p.$$eval('[role="tab"]', (t) => t.map((x) => x.innerText.trim()));
check('L1: list tabs read Reviews / News / Features', tabs.includes('News') && !tabs.some((t) => /Newss/.test(t)), tabs.join(' | '));

// ---- L10: fallback covers vary per article
await go(p, '/'); await sleep(800);
const covers = await p.$$eval('main img', (imgs) => imgs.map((i) => i.currentSrc || i.src).filter((s) => s.includes('/img/opt/')).map((s) => s.split('/').pop().replace(/-\d+\.webp$/, '')));
check('L10: bundled fallback photos vary (not one McLaren for all)', new Set(covers).size >= 3, [...new Set(covers)].join(', '));

// ---- M5 + bio
await fetch(`${API}/profile/update`, {
  method: 'PUT', headers: { ...authed(admin.token), 'content-type': 'application/json' },
  body: JSON.stringify({ full_name: admin.user.fullName, username: admin.user.username, bio: 'Retest bio: road-tests hypercars for APEX.' }),
});
const det = await getJson('/articles/mclaren-gts-launch');
check('M5: related = same make first', det.relatedArticles[0]?.make === 'McLaren', det.relatedArticles.map((a) => `${a.make}:${a.title}`).join(' | '));
check('M5: related items carry kicker/byline fields', det.relatedArticles.every((a) => 'make' in a && 'article_type' in a && 'author_name' in a && 'reading_time_min' in a && 'author_avatar_url' in a));
await go(p, '/articles/mclaren-gts-launch'); await sleep(1500);
const related = await p.evaluate(() => {
  const s = document.querySelector('#keep-reading')?.closest('section');
  return s ? { kicker: s.querySelector('.kicker')?.innerText, cards: [...s.querySelectorAll('a[href^="/articles/"] .kicker')].map((k) => k.innerText), text: s.innerText } : null;
});
check('M5: related cards show real kickers, not "STORY"', related && related.cards.every((k) => k && k !== 'STORY'), JSON.stringify(related?.cards));
check('M5: related bylines are not "APEX Staff"', related && !/APEX Staff/.test(related.text));
check('M5: "More <make>" heading only when every card is that make', related && (!/^MORE /i.test(related.kicker) || related.cards.every((k) => k.toLowerCase().startsWith('mclaren'))), related?.kicker);
const grid = await p.evaluate(() => document.body.innerText.includes('Retest bio: road-tests hypercars'));
// The GTS is authored by the seed admin (ADMIN_EMAIL), not admin@example.com: check an article by admin@example.com.
const qaArticle = (await getJson('/articles?limit=50')).articles.find((a) => a.author_username === admin.user.username);
await go(p, `/articles/${qaArticle.slug}`); await sleep(1500);
check('L4: author card shows the author\'s bio', await p.evaluate(() => document.body.innerText.includes('Retest bio: road-tests hypercars')), `checked ${qaArticle.slug}; gts page had bio=${grid}`);
check('L4: no invented placeholder bio', !(await p.evaluate(() => document.body.innerText.includes('Contributing editor at APEX'))));

// ---- M6: CLS on cold article load (desktop)
const cp = await b.newPage();
await cp.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
await cp.goto(`${BASE}/articles/mclaren-720s-review`, { waitUntil: 'networkidle0' }); await sleep(1500);
const cls = await cp.evaluate(() => window.__cls);
check('M6: article cold-load CLS < 0.05 (in-browser)', cls < 0.05, cls.toFixed(4));
await cp.close();

// ---- M7 / L2 / L6 / L8
await go(p, '/login');
const loginCard = await p.evaluate(() => document.querySelector('[aria-label="Demo access"]')?.innerText || '');
check('M7: /login demo card lists only the reader account', /Reader account/.test(loginCard) && !/chayanon/.test(loginCard) && !/\(alt\)/.test(loginCard), loginCard.replace(/\n/g, ' | '));
const logos = await p.$$eval('a[aria-label="APEX — home"]', (a) => a.filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
check('L8: one visible APEX logo on /login', logos === 1, String(logos));
await go(p, '/admin/login');
const adminCard = await p.evaluate(() => document.querySelector('[aria-label="Demo access"]')?.innerText || '');
check('M7: owner account labelled as an admin account (admin login card)', /Admin account \(owner\)/.test(adminCard) && /chayanon/.test(adminCard), adminCard.replace(/\n/g, ' | '));
await go(p, '/help');
const helpCard = await p.evaluate(() => document.querySelector('[aria-label="Demo access"]')?.innerText || '');
check('M7: help page labels match roles', /Admin account \(owner\)/.test(helpCard) && !/Reader account \(alt\)/.test(helpCard));
const ownerRole = (await login('chayanon.5723@gmail.com', 'ppond333')).user?.role;
check('M7: the account labelled admin really is admin', ownerRole === 'admin', ownerRole);
await go(p, '/');
const navNames = await p.evaluate(() => [...document.querySelectorAll('header button')].map((x) => ({ name: x.getAttribute('aria-label'), text: x.innerText.replace(/\s+/g, ' ').trim() })).filter((x) => x.text));
const mismatch = navNames.filter((x) => x.name && !x.name.toLowerCase().replace(/\s+/g, ' ').includes(x.text.toLowerCase()));
check('L6: navbar buttons\' accessible names contain their visible text', mismatch.length === 0, JSON.stringify(navNames));

// ---- L7
await go(p, '/compare');
const ids = spec.articles.slice(0, 2).map((a) => a.id);
await go(p, `/compare?ids=${ids[0]},${ids[1]}`); await sleep(1200);
await p.click('button[aria-label="Swap cars"]'); await sleep(800);
check('L7: swap keeps a literal comma in ?ids=', p.url().endsWith(`?ids=${ids[1]},${ids[0]}`), p.url());

// ---- L5
const gz = await fetch(`${API}/articles?limit=50`, { headers: { 'accept-encoding': 'gzip' } });
check('L5: API JSON is gzip-compressed', gz.headers.get('content-encoding') === 'gzip', gz.headers.get('content-encoding'));

// ---- L3 (client limit = 2000) — the counter on the form
await go(p, '/articles/mclaren-720s-review#comments'); await sleep(1500);
const counter = await p.evaluate(() => (document.querySelector('#comments')?.innerText.match(/\/(\d+) characters/) || [])[1]);
check('L3: comment form limit is 2000 (same as API)', counter === '2000', counter);

saveResults('retest');
await b.close();
