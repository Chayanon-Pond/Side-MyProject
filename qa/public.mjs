import { launch, newPage, go, shot, clickText, hasText, waitText, check, saveResults, brokenImages, sleep, BASE } from './lib.mjs';

const browser = await launch();
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
const page = await newPage(browser, { label: 'home' });

// ---------- HOME ----------
await go(page, '/');
await shot(page, 'home-dark-desktop', true);
const home = await page.evaluate(() => {
  const cover = document.querySelector('[aria-label="Cover story"]');
  const also = document.querySelector('#also-today')?.closest('section');
  return {
    coverText: cover?.innerText?.slice(0, 300) || null,
    alsoKickers: also ? [...also.querySelectorAll('.kicker')].map((k) => k.innerText) : [],
    sections: [...document.querySelectorAll('h2')].map((h) => h.innerText),
    loadMore: !![...document.querySelectorAll('button')].find((b) => /load more/i.test(b.innerText)),
    cards: document.querySelectorAll('article, a[href^="/articles/"]').length,
  };
});
console.log(JSON.stringify(home, null, 1));
check('Home: hero is featured article (720S)', /720S/.test(home.coverText || ''), (home.coverText || '').replace(/\n/g, ' | ').slice(0, 120));
check('Home: Also today kickers have no duplicates', !home.alsoKickers.some((k) => { const p = k.split('·').map((s) => s.trim().toLowerCase()); return p.length > 1 && p[0] === p[1]; }), home.alsoKickers.join(' / '));
const allKickers = await page.$$eval('.kicker', (ks) => ks.map((k) => k.innerText));
const dupK = allKickers.filter((k) => { const p = k.split('·').map((s) => s.trim().toLowerCase()); return p.length > 1 && p[0] === p[1]; });
check('Home: no duplicate kickers anywhere (e.g. NEWS · NEWS)', dupK.length === 0, dupK.join(', '));
check('Home: Load more button present (18 published > 14)', home.loadMore);
check('Home: no broken images', (await brokenImages(page)).length === 0, (await brokenImages(page)).join(' '));
if (home.loadMore) {
  const before = await page.$$eval('a[href^="/articles/"]', (a) => new Set(a.map((x) => x.getAttribute('href'))).size);
  await clickText(page, 'Load more');
  await sleep(1500);
  const after = await page.$$eval('a[href^="/articles/"]', (a) => new Set(a.map((x) => x.getAttribute('href'))).size);
  const stillBtn = await page.evaluate(() => !![...document.querySelectorAll('button')].find((b) => /load more/i.test(b.innerText)));
  check('Home: Load more adds stories and hides when done', after > before && !stillBtn, `unique article links ${before} -> ${after}, button still visible=${stillBtn}`);
  await shot(page, 'home-after-loadmore', true);
}

// ---------- ARTICLES LIST ----------
await go(page, '/articles');
await shot(page, 'articles-list', true);
const listCount = async () => page.$$eval('main a[href^="/articles/"]', (a) => new Set(a.map((x) => x.getAttribute('href'))).size);
const n0 = await listCount();
await clickText(page, 'Reviews', '[role="tab"], button');
await sleep(1200);
check('List: type tab syncs URL', page.url().includes('type=review'), page.url());
await clickText(page, 'Porsche', 'button.chip');
await sleep(1200);
check('List: make chip syncs URL', /make=Porsche/.test(page.url()), page.url());
const nP = await listCount();
const titles = await page.$$eval('main h3, main h2', (h) => h.map((x) => x.innerText));
check('List: type+make filter results', nP >= 1 && nP < n0, `all=${n0} porsche-review=${nP}`);
// Sort options are latest / popular (re-test: the old check selected a non-existent "oldest").
await page.select('main select', 'popular').catch(() => {});
await sleep(1000);
check('List: sort syncs URL', /sort=popular/.test(page.url()), page.url());
await go(page, '/articles');
await page.type('input[placeholder="Search stories"]', 'Urus');
await sleep(1500);
check('List: search syncs URL q=', /q=Urus/.test(page.url()), page.url());
check('List: search finds Urus', await hasText(page, 'Lamborghini Urus'));
// reload URL directly -> state restored
await go(page, '/articles?type=news&make=Ferrari&sort=popular');
const restored = await page.evaluate(() => ({ sel: document.querySelector('main select')?.value, pressed: [...document.querySelectorAll('button.chip[aria-pressed="true"]')].map((b) => b.innerText) }));
check('List: deep link restores filters', restored.sel === 'popular' && restored.pressed.some((t) => /Ferrari/.test(t)), JSON.stringify(restored));
await go(page, '/articles?q=zzzznotfound');
await shot(page, 'articles-empty');
check('List: empty state message', await hasText(page, 'no') , (await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 300))).replace(/\n/g, ' | '));
// pagination
await go(page, '/articles');
const hasPager = await page.$('[aria-label="Pagination"]');
if (hasPager) {
  await clickText(page, 'Next', '[aria-label="Next page"], a, button');
  await sleep(1200);
  check('List: pagination page=2 in URL', /page=2/.test(page.url()), page.url());
} else check('List: pagination present with 18 items', false, 'no pagination nav');

// ---------- ARTICLE DETAIL ----------
await go(page, '/articles/mclaren-720s-review');
await shot(page, 'article-720s', true);
// Re-test: the comments panel is collapsed behind "Join the conversation"; open it before reading it.
if (await page.$('[aria-controls="comments"]')) { await page.click('[aria-controls="comments"]'); await sleep(1500); }
const det = await page.evaluate(() => ({
  h1: document.querySelector('h1')?.innerText,
  toc: [...document.querySelectorAll('[aria-label="In this article"] a')].map((a) => a.innerText),
  spec: document.querySelector('#spec-sheet-title')?.closest('section')?.innerText?.slice(0, 400),
  gallery: !!document.querySelector('#gallery-title'),
  related: document.querySelector('#keep-reading')?.closest('section')?.querySelectorAll('a[href^="/articles/"]').length || 0,
  comments: document.querySelector('#comments')?.innerText?.slice(0, 300),
}));
console.log(JSON.stringify(det, null, 1));
check('Detail: title renders', /720S/.test(det.h1 || ''));
check('Detail: TOC lists h2s', det.toc.length >= 2, det.toc.join(' / '));
check('Detail: spec sheet renders', /710|770|341/.test(det.spec || ''), (det.spec || '').replace(/\n/g, ' ').slice(0, 150));
check('Detail: related articles', det.related > 0, `related=${det.related}`);
check('Detail: comments gate for anon', /sign in|log in/i.test(det.comments || ''), (det.comments || '').replace(/\n/g, ' | ').slice(0, 150));
check('Detail: no broken images', (await brokenImages(page)).length === 0, (await brokenImages(page)).join(' '));
// TOC click
if (det.toc.length) {
  await page.evaluate(() => scrollTo(0, 0)); await sleep(800); // re-test: the comments step above scrolled down
  const y0 = await page.evaluate(() => scrollY);
  await clickText(page, det.toc[1] || det.toc[0], '[aria-label="In this article"] a');
  await sleep(1500);
  const y1 = await page.evaluate(() => scrollY);
  check('Detail: TOC click scrolls', y1 > y0, `${y0} -> ${y1}; hash=${new URL(page.url()).hash}`);
}
// share copy link
await page.evaluate(() => document.querySelector('[aria-label="Copy link"]')?.click());
await sleep(600);
const copiedLabel = await page.evaluate(() => !!document.querySelector('[aria-label="Link copied"]'));
const clip = await page.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e.message));
check('Detail: share copy-link copies URL', copiedLabel && clip.includes('/articles/mclaren-720s-review'), `label=${copiedLabel} clip=${clip}`);
// gallery lightbox
if (det.gallery) {
  await page.evaluate(() => document.querySelector('#gallery-title').closest('section').querySelector('button')?.click());
  await sleep(1200);
  const lb = await page.evaluate(() => ({ dialog: !!document.querySelector('[role="dialog"]'), text: document.querySelector('[role="dialog"]')?.innerText?.slice(0, 200) }));
  await shot(page, 'article-lightbox');
  check('Detail: gallery lightbox opens', lb.dialog, (lb.text || '').replace(/\n/g, ' | '));
  await page.keyboard.press('ArrowRight'); await sleep(500);
  const lb2 = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText?.slice(0, 200));
  check('Detail: lightbox ArrowRight advances', lb2 !== lb.text, (lb2 || '').replace(/\n/g, ' | '));
  await page.keyboard.press('Escape'); await sleep(600);
  check('Detail: lightbox Escape closes', !(await page.$('[role="dialog"]')));
} else check('Detail: gallery section present (3 images attached)', false);
// view count
// legacy redirect
await go(page, '/detail/1');
check('Legacy /detail/1 redirects', /\/articles\//.test(page.url()), page.url());
await go(page, '/articles/does-not-exist-xyz');
await shot(page, 'article-404');
check('Detail: unknown slug shows not-found', await hasText(page, 'not found') || await hasText(page, '404'), (await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 200))).replace(/\n/g, ' | '));

// ---------- ⌘K SEARCH ----------
await go(page, '/');
await page.keyboard.down('Control'); await page.keyboard.press('KeyK'); await page.keyboard.up('Control');
await sleep(1000);
const sOpen = await page.$('input[placeholder="Search reviews, makes, models…"]');
check('Search: Ctrl+K opens overlay', !!sOpen);
if (sOpen) {
  await page.type('input[placeholder="Search reviews, makes, models…"]', 'mclaren');
  await sleep(1500);
  await shot(page, 'search-overlay');
  const res = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText?.slice(0, 500));
  check('Search: results for mclaren', /720S|GTS/i.test(res || ''), (res || '').replace(/\n/g, ' | ').slice(0, 200));
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await sleep(1500);
  check('Search: Enter navigates to result', /\/articles\//.test(page.url()), page.url());
}
await go(page, '/');
await page.keyboard.press('/');
await sleep(800);
check('Search: "/" opens overlay', !!(await page.$('input[placeholder="Search reviews, makes, models…"]')));
await page.keyboard.press('Escape');

// ---------- COMPARE ----------
await go(page, '/compare');
await shot(page, 'compare-empty', true);
const opts = await page.$$eval('main select', (ss) => ss.map((s) => [...s.options].map((o) => o.textContent)));
console.log('compare options', JSON.stringify(opts));
// Ground truth from the API (re-test: seed-extra gives two QA stories a spec sheet).
const specTitles = new Set((await (await fetch('http://localhost:3911/api/articles?limit=50')).json()).articles.filter((a) => a.has_specs).map((a) => a.title));
const nonSpec = (opts[0] || []).slice(1).filter((o) => ![...specTitles].some((t) => o.endsWith(t)));
check('Compare: picker offers only cars with specs', nonSpec.length === 0, `picker has ${opts[0]?.length} options; ${nonSpec.length} without specs e.g. "${nonSpec[0] || ''}"`);
await go(page, '/compare?ids=1,3');
await shot(page, 'compare-720s-urus', true);
const cmp = await page.evaluate(() => document.querySelector('main')?.innerText?.slice(0, 1200));
check('Compare: two spec’d cars render bars', /720S/.test(cmp) && /Urus/.test(cmp) && /hp/i.test(cmp), cmp.replace(/\n/g, ' | ').slice(0, 250));
await clickText(page, 'Swap cars', '[aria-label="Swap cars"]');
await sleep(800);
check('Compare: swap updates URL', /ids=3,1/.test(page.url()), page.url());
await go(page, '/compare?ids=1,6');
const cmpBad = await page.evaluate(() => document.querySelector('main')?.innerText?.slice(0, 800));
await shot(page, 'compare-unavailable');
check('Compare: no-spec car shows friendly message', /spec|unavailable|can.t compare/i.test(cmpBad), cmpBad.replace(/\n/g, ' | ').slice(0, 300));

// ---------- NEWSLETTER ----------
await go(page, '/');
const email = `qa-news-${Date.now()}@example.com`;
const nlSel = 'section[aria-labelledby="newsletter-heading"] input[type="email"]';
const nlExists = await page.$(nlSel);
if (nlExists) {
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), nlSel); await sleep(500);
  const submit = async () => {
    await page.click(nlSel, { clickCount: 3 }); await page.type(nlSel, email);
    const respP = page.waitForResponse((r) => r.url().includes('/api/newsletter') && r.request().method() === 'POST', { timeout: 8000 }).catch(() => null);
    await page.$eval(nlSel, (i) => i.form.requestSubmit());
    const r = await respP; await sleep(1200);
    return { status: r?.status(), text: await page.evaluate((s) => document.querySelector(s).closest('section').innerText.slice(0, 400), nlSel) };
  };
  const s1 = await submit();
  await shot(page, 'newsletter-1');
  check('Newsletter: first signup 201 + success UI', s1.status === 201 && /thank|subscrib|in\b|you.re/i.test(s1.text), `${s1.status} ${s1.text.replace(/\n/g, ' | ').slice(-160)}`);
  await go(page, '/');
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), nlSel); await sleep(500);
  const s2 = await submit();
  await shot(page, 'newsletter-2');
  check('Newsletter: second signup idempotent (200, no error UI)', s2.status === 200 && !/error|fail/i.test(s2.text), `${s2.status} ${s2.text.replace(/\n/g, ' | ').slice(-160)}`);
} else check('Newsletter form on home', false, 'not found');

// ---------- 404 ----------
await go(page, '/no-such-page-qa');
await shot(page, '404');
check('404 page renders', await hasText(page, '404') || await hasText(page, 'not found'));

// ---------- THEME ----------
await go(page, '/');
const t0 = await page.evaluate(() => document.documentElement.dataset.theme);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /theme|light|dark/i.test(b.getAttribute('aria-label') || ''))?.click());
await sleep(600);
const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
await page.reload({ waitUntil: 'networkidle2' }); await sleep(600);
const t2 = await page.evaluate(() => document.documentElement.dataset.theme);
check('Theme: toggle switches and persists across reload', t0 !== t1 && t1 === t2, `${t0} -> ${t1} -> reload ${t2}`);
await shot(page, 'home-light-desktop', true);
await go(page, '/articles/mclaren-720s-review');
await shot(page, 'article-light', true);
await go(page, '/compare?ids=1,3');
await shot(page, 'compare-light', true);
await page.evaluate(() => localStorage.setItem('apex-theme', 'apex-dark'));

// ---------- MOBILE 375 ----------
const mob = await newPage(browser, { label: 'mobile' });
await mob.emulate({ viewport: { width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
for (const [p, n] of [['/', 'home'], ['/articles', 'list'], ['/articles/mclaren-720s-review', 'article'], ['/compare?ids=1,3', 'compare'], ['/login', 'login']]) {
  await go(mob, p);
  const ov = await mob.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 5).map((e) => e.tagName + '.' + String(e.className).slice(0, 40)) }));
  check(`Mobile 375 ${n}: no horizontal overflow`, ov.sw <= ov.cw + 1, `scrollWidth=${ov.sw} client=${ov.cw} ${ov.wide.join(', ')}`);
  await shot(mob, `mobile-${n}`, true);
}
await go(mob, '/');
const menuBtn = await mob.$('[aria-label="Open menu"], [aria-label="Open navigation"]');
if (menuBtn) {
  await menuBtn.click(); await sleep(1000);
  const menu = await mob.evaluate(() => document.querySelector('#mobile-menu')?.innerText?.slice(0, 300));
  await shot(mob, 'mobile-menu');
  check('Mobile: menu opens with links', !!menu && /articles|stories|reviews/i.test(menu), (menu || '').replace(/\n/g, ' | '));
  const link = await mob.evaluate(() => { const a = [...document.querySelectorAll('#mobile-menu a')].find((x) => x.getAttribute('href')?.startsWith('/articles')); a?.click(); return a?.getAttribute('href'); });
  await sleep(1500);
  const closed = await mob.evaluate(() => { const m = document.querySelector('#mobile-menu'); return !m || m.getBoundingClientRect().width === 0 || getComputedStyle(m).visibility === 'hidden'; });
  check('Mobile: menu link navigates and closes menu', mob.url().includes('/articles') && closed, `${link} -> ${mob.url()} closed=${closed}`);
} else check('Mobile: menu button exists', false);

saveResults('public');
await browser.close();
