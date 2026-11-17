import fs from 'fs';
import { launch, newPage, go, shot, clickText, hasText, waitText, type, check, saveResults, sleep, API } from './lib.mjs';

const user = JSON.parse(fs.readFileSync('.qauser.json', 'utf8'));
const b = await launch();
const p = await newPage(b, { label: 'member' });
const tok = () => p.evaluate(() => localStorage.getItem('token'));

await go(p, '/login');
await type(p, 'input[name="email"]', user.email);
await type(p, 'input[name="password"]', user.password);
await clickText(p, 'Sign in', 'button[type="submit"]');
await sleep(2500);
check('Member: logged in', !!(await tok()));

// ---- comments
await go(p, '/articles/mclaren-720s-review#comments');
await sleep(1500);
const openGate = async () => {
  if (!(await p.$('#comments textarea'))) { await clickText(p, 'Join the conversation').catch(() => {}); await sleep(1200); }
};
await openGate();
const marker = `QA comment ${Date.now()}`;
const payload = `${marker} <script>window.__xss=1</script><img src=x onerror="window.__xss=2"> & <b>bold</b>`;
await p.waitForSelector('#comments textarea', { timeout: 8000 });
await p.type('#comments textarea', payload);
await clickText(p, 'Post', '#comments button[type="submit"], #comments button').catch(async () => p.$eval('#comments form', (f) => f.requestSubmit()));
await sleep(2500);
await shot(p, 'comment-posted');
const rendered = await p.evaluate((m) => {
  const el = [...document.querySelectorAll('#comments p, #comments div')].reverse().find((x) => x.innerText?.includes(m) && x.children.length === 0);
  return { text: el?.innerText, xss: window.__xss || 0, injectedImg: !!document.querySelector('#comments img[src="x"]') };
}, marker);
check('Member: post comment appears', !!rendered.text, rendered.text);
check('Member: comment HTML rendered as text (no XSS)', !rendered.xss && !rendered.injectedImg, JSON.stringify(rendered));

// find my comment block helper
const inMine = async (btnText, m = marker) => p.evaluate((btnText, m) => {
  const items = [...document.querySelectorAll('#comments *')].filter((x) => x.innerText?.includes(m));
  // smallest container that also contains a button with btnText
  const c = items.reverse().find((x) => [...x.querySelectorAll('button')].some((bb) => bb.innerText.trim() === btnText));
  const btn = c && [...c.querySelectorAll('button')].find((bb) => bb.innerText.trim() === btnText);
  if (btn) { btn.click(); return true; } return false;
}, btnText, m);

// reply
check('Member: Reply button on own comment', await inMine('Reply'));
await sleep(600);
const replyText = `QA reply ${Date.now()}`;
await p.type('textarea[placeholder="Write a reply..."]', replyText).catch(() => {});
await sleep(200);
await p.evaluate(() => { const ta = document.querySelector('textarea[placeholder="Write a reply..."]'); const box = ta.parentElement.parentElement; [...box.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Reply')?.click(); });
await sleep(2500);
check('Member: reply posted & shown', await hasText(p, replyText));
await shot(p, 'comment-reply');

// edit
check('Member: Edit button on own comment', await inMine('Edit'));
await sleep(500);
const ta = await p.$$('#comments textarea');
const editTa = await p.evaluateHandle((m) => [...document.querySelectorAll('#comments textarea')].find((t) => t.value.includes(m)), marker);
if (editTa.asElement()) {
  await editTa.asElement().click({ clickCount: 3 });
  await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control');
  await editTa.asElement().type(`${marker} EDITED`);
  await inMine('Save', marker);
  await sleep(2000);
}
check('Member: edit saved', await hasText(p, `${marker} EDITED`));
await shot(p, 'comment-edited');

// delete reply (own)
const delOk = await inMine('Delete', replyText);
await sleep(800);
await shot(p, 'comment-delete-confirm');
// confirm modal
await p.evaluate(() => { const d = document.querySelector('[role="dialog"], [role="alertdialog"]'); const btn = d && [...d.querySelectorAll('button')].find((x) => /delete|confirm|yes/i.test(x.innerText)); btn?.click(); });
await sleep(2000);
check('Member: delete own reply', delOk && !(await hasText(p, replyText)));
await p.reload({ waitUntil: 'networkidle2' }); await sleep(1000); await openGate();
check('Member: edit persisted after reload', await hasText(p, `${marker} EDITED`));
check('Member: deleted reply stays deleted after reload', !(await hasText(p, replyText)));

// others' comment: demo user comment id 1 '<b>hi</b><script>x</script>'
const other = await p.evaluate(() => {
  const items = [...document.querySelectorAll('#comments *')].filter((x) => x.innerText?.includes('Demo User'));
  const c = items.reverse().find((x) => x.querySelectorAll('button').length);
  return c ? [...c.querySelectorAll('button')].map((x) => x.innerText.trim()) : null;
});
check('Member: no Edit/Delete on others\' comments', other && !other.includes('Delete') && !other.includes('Edit'), JSON.stringify(other));
const t = await tok();
// Re-test: look the other user's comment up instead of assuming it is id 1 (fresh DBs differ).
const art = (await (await fetch(`${API}/articles/mclaren-720s-review`)).json()).data;
const listed = (await (await fetch(`${API}/comments/article/${art.id}?limit=50`)).json()).comments;
const othersId = listed.find((c) => c.user_username !== user.username)?.id;
const r = await fetch(`${API}/comments/${othersId}`, { method: 'DELETE', headers: { authorization: `Bearer ${t}` } });
check('Member: API DELETE others\' comment -> 403', r.status === 403, String(r.status));
const r2 = await fetch(`${API}/comments/${othersId}`, { method: 'PUT', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify({ content: 'hijack' }) });
check('Member: API PUT others\' comment -> 403', r2.status === 403, String(r2.status));

// ---- profile
await go(p, '/profile');
await shot(p, 'profile-before');
const fileInput = await p.$('input[type="file"]');
await fileInput.uploadFile('fixtures/avatar.png');
await sleep(800);
await type(p, 'input[name="name"]', 'QA Tester Renamed');
const respP = p.waitForResponse((res) => /\/api\/(auth|profile)/.test(res.url()) && res.request().method() === 'PUT', { timeout: 10000 }).catch(() => null);
await clickText(p, 'Save', 'button[type="submit"]');
const resp = await respP;
await sleep(2000);
const body = resp ? await resp.json().catch(() => null) : null;
await shot(p, 'profile-after');
const avatarUrl = body?.user?.profile_image_url;
check('Member: profile update request ok', resp?.status() === 200, `${resp?.status()} ${resp?.url()}`);
check('Member: avatar stored (profile_image_url set)', !!avatarUrl, avatarUrl);
if (avatarUrl) {
  const abs = avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:3911${avatarUrl}`;
  const ir = await fetch(abs);
  check('Member: avatar served by API', ir.ok && /image/.test(ir.headers.get('content-type')), `${ir.status} ${ir.headers.get('content-type')} ${abs}`);
}
await p.reload({ waitUntil: 'networkidle2' }); await sleep(1000);
const navAvatar = await p.evaluate(() => [...document.querySelectorAll('header img, nav img')].map((i) => ({ src: i.currentSrc, ok: i.naturalWidth > 0 })));
check('Member: avatar displayed in UI after reload', navAvatar.some((i) => i.ok && /uploads\/profiles|webp/.test(i.src)) || (await p.evaluate(() => [...document.images].some((i) => /profiles/.test(i.src) && i.naturalWidth > 0))), JSON.stringify(navAvatar));
check('Member: name updated', (await p.$eval('input[name="name"]', (i) => i.value)) === 'QA Tester Renamed');
// comment shows new avatar/name?
const pr = await (await fetch(`${API}/profile`, { headers: { authorization: `Bearer ${t}` } })).json();
check('Member: GET /api/profile reflects update', pr.full_name === 'QA Tester Renamed' && !!pr.profile_image_url, JSON.stringify({ n: pr.full_name, img: pr.profile_image_url }));

// ---- change password
await go(p, '/reset-password');
await shot(p, 'change-password');
// wrong current first
await type(p, 'input[name="currentPassword"]', 'WrongCurrent1');
await type(p, 'input[name="newPassword"]', 'Changed789!');
await type(p, 'input[name="confirmPassword"]', 'Changed789!');
await p.$eval('form button[type="submit"]', (x) => x.click());
await sleep(2000);
check('Member: wrong current password -> message, still logged in', !!(await tok()) && /current|incorrect|wrong/i.test(await p.evaluate(() => document.body.innerText)), p.url());
await type(p, 'input[name="currentPassword"]', user.password);
await type(p, 'input[name="newPassword"]', 'Changed789!');
await type(p, 'input[name="confirmPassword"]', 'Changed789!');
await p.$eval('form button[type="submit"]', (x) => x.click());
await sleep(2500);
await shot(p, 'change-password-after');
const lr = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'Changed789!' }) })).json();
check('Member: change password works (API login with new pw)', !!lr.token, lr.error || 'ok');
if (lr.token) { user.password = 'Changed789!'; fs.writeFileSync('.qauser.json', JSON.stringify(user)); } // re-test: only when it really changed (member2 logs in with it)

// notifications page for member
await go(p, '/notifications');
await shot(p, 'member-notifications');
check('Member: notifications page loads', !(await hasText(p, 'something went wrong')));

saveResults('member');
await b.close();
