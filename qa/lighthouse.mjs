// Lighthouse against the local QA stack (vite preview :4173 + local API). Never production.
// Usage: node lighthouse.mjs [runs=3]  -> qa/lighthouse/<page>-<device>.report.{html,json} (median run)
//        and qa/lighthouse/summary.json
import fs from 'fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { BASE, CHROME } from './lib.mjs';

const RUNS = Number(process.argv[2] || 3);
const PAGES = [['home', '/'], ['article', '/articles/mclaren-720s-review']];
const DEVICES = ['mobile', 'desktop'];
const desktopConfig = (await import('lighthouse/core/config/desktop-config.js')).default;

fs.mkdirSync('lighthouse', { recursive: true });
const summary = {};
const chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ['--headless=new', '--no-first-run'] });
try {
  for (const [name, path] of PAGES) {
    for (const device of DEVICES) {
      const runs = [];
      for (let i = 0; i < RUNS; i += 1) {
        const flags = { port: chrome.port, output: ['html', 'json'], logLevel: 'error' };
        const res = await lighthouse(BASE + path, flags, device === 'desktop' ? desktopConfig : undefined);
        const a = res.lhr.audits;
        const c = res.lhr.categories;
        runs.push({
          report: res.report,
          perf: Math.round(c.performance.score * 100),
          a11y: Math.round(c.accessibility.score * 100),
          bp: Math.round(c['best-practices'].score * 100),
          seo: Math.round(c.seo.score * 100),
          fcp: a['first-contentful-paint'].displayValue,
          lcp: a['largest-contentful-paint'].displayValue,
          tbt: a['total-blocking-time'].displayValue,
          cls: a['cumulative-layout-shift'].displayValue,
          lcpMs: a['largest-contentful-paint'].numericValue,
        });
        console.log(`${name}/${device} run ${i + 1}: perf ${runs.at(-1).perf} lcp ${runs.at(-1).lcp} cls ${runs.at(-1).cls}`);
      }
      runs.sort((x, y) => x.perf - y.perf);
      const med = runs[Math.floor(runs.length / 2)];
      fs.writeFileSync(`lighthouse/${name}-${device}.report.html`, med.report[0]);
      fs.writeFileSync(`lighthouse/${name}-${device}.report.json`, med.report[1]);
      const { report, ...rest } = med;
      summary[`${name}-${device}`] = { ...rest, perfRuns: runs.map((r) => r.perf) };
    }
  }
} finally {
  await chrome.kill();
}
fs.writeFileSync('lighthouse/summary.json', JSON.stringify(summary, null, 2));
console.table(summary);
