import { launch, newPage, go, fullShot, shot, sleep, brokenImages, check, saveResults, consoleLog } from './lib.mjs';
// Re-test: the admin flow's article slug changes per run; use the newest QA Full Article.
const newest = (await (await fetch('http://localhost:3911/api/articles?limit=50&q=QA%20Full%20Article')).json()).articles[0]?.slug || 'qa-full-article-90570';
const b = await launch();
const pages = [['/', 'home'], ['/articles', 'list'], ['/articles/mclaren-720s-review', 'article'], [`/articles/${newest}`, 'article-new'], ['/compare?ids=1,3', 'compare'], ['/login', 'login'], ['/register', 'register'], ['/about', 'about'], ['/help', 'help'], ['/contact', 'contact'], ['/no-such', '404']];
const bad = {};
for (const theme of ['apex-dark', 'apex-light']) {
  const p = await newPage(b, { theme, label: theme });
  p.on('response', (r) => { if (r.status() >= 400) { const k = new URL(p.url()).pathname; (bad[k] ||= new Set()).add(`${r.status()} ${r.request().method()} ${r.url()}`); } });
  // CLS observer
  await p.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  for (const [path, name] of pages) {
    await go(p, path); await sleep(800);
    const cls = await p.evaluate(() => window.__cls);
    const broken = await brokenImages(p);
    // low-contrast scan: text elements whose color ~ background
    const contrast = await p.evaluate(() => {
      const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, bb] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
      const bgOf = (el) => { while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !(c.match(/[\d.]+/g)?.[3] === '0')) return c; el = el.parentElement; } return getComputedStyle(document.body).backgroundColor; };
      const out = [];
      for (const el of document.querySelectorAll('main p, main span, main a, main h1, main h2, main h3, main li, main label, main button, footer a, footer p, header a, header button')) {
        if (!el.innerText?.trim() || el.children.length > 2) continue;
        const r = el.getBoundingClientRect(); if (!r.width) continue;
        const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity < 0.5) continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        const bg = bgOf(el); if (el.closest('[style*="background-image"], .relative img')) continue;
        const L1 = lum(s.color), L2 = lum(bg); if (L1 == null || L2 == null) continue;
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
        if (ratio < (big ? 3 : 4.5)) out.push(`${ratio.toFixed(2)} "${el.innerText.trim().slice(0, 40)}" ${s.color} on ${bg}`);
      }
      return [...new Set(out)].slice(0, 8);
    });
    console.log(`[${theme}] ${name}: CLS=${cls.toFixed(3)} broken=${broken.length} lowContrast=${contrast.length}`); contrast.forEach((c) => console.log('    ', c)); broken.forEach((c) => console.log('    broken', c));
    check(`Visual ${theme} ${name}: no broken images`, broken.length === 0, broken.join(' '));
    check(`Visual ${theme} ${name}: CLS < 0.1 (load)`, cls < 0.1, cls.toFixed(3));
    await fullShot(p, `v-${theme}-${name}`);
  }
  await p.close();
}
for (const [k, v] of Object.entries(bad)) console.log('HTTP>=400 on', k, [...v].join(' || '));
saveResults('visual');
await b.close();
