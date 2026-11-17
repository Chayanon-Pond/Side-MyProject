import puppeteer from 'puppeteer-core';
import fs from 'fs';

export const BASE = 'http://localhost:4173';
export const API = 'http://localhost:3911/api';
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
export const consoleLog = {};
export function check(name, pass, note = '') {
  results.push({ name, pass: !!pass, note });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? '  -- ' + note : ''}`);
}
export function saveResults(file) {
  fs.mkdirSync('results', { recursive: true });
  fs.writeFileSync(`results/${file}.json`, JSON.stringify({ results, console: consoleLog }, null, 2));
}

export async function launch(opts = {}) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: opts.headless ?? true,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-features=Translate', '--window-size=1440,900'],
    defaultViewport: opts.viewport || { width: 1440, height: 900 },
  });
}

/** Page with console/pageerror/failed-request capture keyed by the current path. */
export async function newPage(browser, { label = 'page', theme, nointro = true } = {}) {
  const page = await browser.newPage();
  const key = () => { try { return new URL(page.url()).pathname || label; } catch { return label; } };
  const rec = (type, text) => {
    const k = key();
    (consoleLog[k] ||= []);
    if (!consoleLog[k].some((e) => e.type === type && e.text === text)) consoleLog[k].push({ type, text: text.slice(0, 400) });
  };
  page.on('console', (m) => { if (['error', 'warning', 'warn'].includes(m.type())) rec(m.type(), m.text()); });
  page.on('pageerror', (e) => rec('pageerror', String(e?.message || e)));
  page.on('requestfailed', (r) => { const u = r.url(); if (!/favicon|fonts\.g/.test(u)) rec('requestfailed', `${r.failure()?.errorText} ${u}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/articles/') ) {} if (r.status() >= 500) rec('http5xx', `${r.status()} ${r.url()}`); });
  page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument((theme, nointro) => {
    try {
      if (nointro) { sessionStorage.setItem('apex-intro-seen', '1'); sessionStorage.setItem('apex:intro', '1'); }
      if (theme) localStorage.setItem('apex-theme', theme);
    } catch {}
  }, theme, nointro);
  return page;
}

export async function go(page, path, wait = 'networkidle2') {
  await page.goto(BASE + path, { waitUntil: wait, timeout: 30000 });
  await sleep(600);
}

export async function shot(page, name, full = false) {
  fs.mkdirSync('screens', { recursive: true });
  await page.screenshot({ path: `screens/${name}.png`, fullPage: full });
  return `qa/screens/${name}.png`;
}

/** Click first visible element (button/a/[role]) whose text includes `text`. */
export async function clickText(page, text, sel = 'button, a, [role="button"], [role="menuitem"], [role="tab"], label') {
  const ok = await page.evaluate((text, sel) => {
    const els = [...document.querySelectorAll(sel)].filter((e) => {
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (e.innerText || e.getAttribute('aria-label') || '').trim().toLowerCase().includes(text.toLowerCase());
    });
    if (!els.length) return false;
    els[0].scrollIntoView({ block: 'center' }); els[0].click(); return true;
  }, text, sel);
  if (!ok) throw new Error(`clickText: no visible element with text "${text}"`);
  await sleep(400);
}

export async function hasText(page, text) {
  return page.evaluate((t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()), text);
}

export async function waitText(page, text, timeout = 8000) {
  try {
    await page.waitForFunction((t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()), { timeout }, text);
    return true;
  } catch { return false; }
}

export async function type(page, selector, value, clear = true) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  if (clear) {
    await page.$eval(selector, (el) => { el.focus(); el.select?.(); });
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
  }
  await page.type(selector, value, { delay: 5 });
}

export async function apiLogin(email, password) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return r.json();
}

/** Put a token into localStorage the same way the app does (key discovered from authStorage.js). */
export async function brokenImages(page) {
  return page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.currentSrc || i.src));
}

/** Scroll the whole page in steps so scroll-triggered reveals render before a full-page shot. */
export async function revealAll(page) {
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight;
    for (let y = 0; y < h(); y += Math.round(innerHeight * 0.6)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, h()); await new Promise((r) => setTimeout(r, 500)); scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
  });
}
export async function fullShot(page, name) { await revealAll(page); return shot(page, name, true); }
