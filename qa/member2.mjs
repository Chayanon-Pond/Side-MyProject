import fs from 'fs';
import { launch, newPage, go, shot, clickText, hasText, type, check, saveResults, sleep, API } from './lib.mjs';
const user = JSON.parse(fs.readFileSync('.qauser.json', 'utf8'));
const lr = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: user.password }) })).json();
const b = await launch(); const p = await newPage(b, { label: 'member2' });
await go(p, '/');
await p.evaluate((t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); }, lr.token, lr.user);
await go(p, '/articles/mclaren-720s-review#comments'); await sleep(1500);
if (!(await p.$('#comments textarea'))) { await clickText(p, 'Join the conversation'); await sleep(1200); }
const marker = await p.evaluate(() => (document.querySelector('#comments').innerText.match(/QA comment \d+/) || [])[0]);
console.log('marker', marker);
// click Edit in my comment block
await p.evaluate((m) => { const c = [...document.querySelectorAll('#comments *')].filter((x) => x.innerText?.includes(m)).reverse().find((x) => [...x.querySelectorAll('button')].some((bb) => bb.innerText.trim() === 'Edit')); [...c.querySelectorAll('button')].find((bb) => bb.innerText.trim() === 'Edit').click(); }, marker);
await sleep(600);
const ok = await p.evaluate((m) => { const ta = [...document.querySelectorAll('#comments textarea')].find((t) => t.value.includes(m)); if (!ta) return 'no textarea';
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(ta, m + ' EDITED'); ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok'; }, marker);
await sleep(300);
await p.evaluate((m) => { const ta = [...document.querySelectorAll('#comments textarea')].find((t) => t.value.includes(m)); const btn = [...ta.parentElement.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Save'); btn.click(); }, marker);
await sleep(2000);
await shot(p, 'comment-edited');
check('Member: edit own comment saved', await hasText(p, `${marker} EDITED`), ok);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(1200);
if (!(await p.$('#comments textarea'))) { await clickText(p, 'Join the conversation'); await sleep(1200); }
check('Member: edit persisted after reload', await hasText(p, `${marker} EDITED`));
// delete own top-level comment
await p.evaluate((m) => { const c = [...document.querySelectorAll('#comments *')].filter((x) => x.innerText?.includes(m)).reverse().find((x) => [...x.querySelectorAll('button')].some((bb) => bb.innerText.trim() === 'Delete')); [...c.querySelectorAll('button')].find((bb) => bb.innerText.trim() === 'Delete').click(); }, marker);
await sleep(700); await shot(p, 'comment-delete-confirm');
await p.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); [...d.querySelectorAll('button')].find((x) => /delete/i.test(x.innerText))?.click(); });
await sleep(2000);
check('Member: delete own comment', !(await hasText(p, marker)));

// change password with confirm modal
const confirmModal = async () => { await sleep(600); await p.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); [...(d?.querySelectorAll('button') || [])].find((x) => /update|confirm/i.test(x.innerText))?.click(); }); await sleep(2000); };
await go(p, '/reset-password');
await type(p, 'input[name="currentPassword"]', 'WrongCurrent1');
await type(p, 'input[name="newPassword"]', 'Changed789!');
await type(p, 'input[name="confirmPassword"]', 'Changed789!');
await p.$eval('form button[type="submit"]', (x) => x.click());
await confirmModal();
const msg = await p.evaluate(() => [...document.querySelectorAll('[role="alert"], [data-sonner-toast], .text-danger')].map((e) => e.innerText).join(' | '));
await shot(p, 'change-password-wrong');
check('Member: wrong current pw -> error shown, not logged out', !!(await p.evaluate(() => localStorage.getItem('token'))) && /current|incorrect|wrong/i.test(msg), msg);
await go(p, '/reset-password');
await type(p, 'input[name="currentPassword"]', user.password);
await type(p, 'input[name="newPassword"]', 'Changed789!');
await type(p, 'input[name="confirmPassword"]', 'Changed789!');
await p.$eval('form button[type="submit"]', (x) => x.click());
await confirmModal();
await shot(p, 'change-password-after');
const lr2 = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'Changed789!' }) })).json();
check('Member: change password works (login with new pw)', !!lr2.token, lr2.error || 'ok');
if (lr2.token) { user.password = 'Changed789!'; fs.writeFileSync('.qauser.json', JSON.stringify(user)); }
saveResults('member2'); await b.close();
