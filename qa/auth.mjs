import fs from 'fs';
import { launch, newPage, go, shot, clickText, hasText, waitText, type, check, saveResults, sleep } from './lib.mjs';

const b = await launch();
const p = await newPage(b, { label: 'auth' });
const stamp = Date.now().toString().slice(-6);
const user = { fullName: 'QA Tester', username: `qa_${stamp}`, email: `qa.${stamp}@example.com`, password: 'QaPass123!' };
fs.writeFileSync('.qauser.json', JSON.stringify(user));
const user_ = () => p.evaluate(() => JSON.parse(localStorage.getItem('user') || 'null'));

// Register
await go(p, '/register');
await shot(p, 'register');
for (const k of ['fullName', 'username', 'email']) await type(p, `input[name="${k}"]`, user[k]);
await type(p, 'input[name="password"]', user.password);
// confirm field if any
const pwInputs = await p.$$('input[type="password"]');
if (pwInputs.length > 1) { await pwInputs[1].type(user.password); }
await clickText(p, 'Create account', 'button[type="submit"]');
await sleep(2500);
const afterReg = { url: p.url(), u: await user_() };
await shot(p, 'register-after');
check('Auth: register creates account', /login|\/$/.test(afterReg.url) || afterReg.u?.email === user.email, `url=${afterReg.url} loggedIn=${!!afterReg.u}`);
const regLoggedIn = !!afterReg.u;

// Logout (if logged in)
const logout = async () => {
  await p.evaluate(() => document.querySelector('[aria-label="Account menu"], [aria-label="Account"], [aria-label="Your profile"]')?.click());
  await sleep(500);
  await clickText(p, 'Log out');
  await sleep(1200);
};
if (regLoggedIn) { await logout(); check('Auth: logout clears session', !(await user_())); }

// Login
await go(p, '/login');
await type(p, 'input[name="email"]', user.email);
await type(p, 'input[name="password"]', user.password);
await clickText(p, 'Sign in', 'button[type="submit"]');
await sleep(2500);
check('Auth: login with new account', (await user_())?.email === user.email, p.url());
await shot(p, 'login-after');
await logout();
check('Auth: logout', !(await user_()), p.url());

// Wrong password
await go(p, '/login');
await type(p, 'input[name="email"]', user.email);
await type(p, 'input[name="password"]', 'wrong-password');
await clickText(p, 'Sign in', 'button[type="submit"]');
await sleep(2000);
const err = await p.evaluate(() => document.querySelector('[role="alert"]')?.innerText);
await shot(p, 'login-wrong-password');
check('Auth: wrong password shows message', !!err && !/undefined|500/.test(err), err);

// Demo "Use this" on /login
await go(p, '/login');
const demoTxt = await p.evaluate(() => document.querySelector('[aria-label="Demo access"]')?.innerText);
console.log('demo card:', demoTxt?.replace(/\n/g, ' | '));
await clickText(p, 'Use this');
await sleep(400);
const filled = await p.evaluate(() => ({ e: document.querySelector('input[name="email"]').value, pw: document.querySelector('input[name="password"]').value }));
check('Auth: demo "Use this" fills form', filled.e === 'some@gmail.com' && !!filled.pw, JSON.stringify({ e: filled.e }));
const autoLogged = await user_();
check('Auth: demo "Use this" also logs in (as task expects)', !!autoLogged, autoLogged ? 'logged in' : 'only fills, user must press Sign in');
if (!autoLogged) { await clickText(p, 'Sign in', 'button[type="submit"]'); await sleep(2500); }
check('Auth: demo reader login works', (await user_())?.email === 'some@gmail.com');
await logout();

// Forgot / reset
await go(p, '/forgot-password');
await type(p, 'input[type="email"]', user.email);
const logSizeBefore = fs.statSync('logs/server.log').size;
await clickText(p, 'Send', 'button[type="submit"]').catch(async () => p.$eval('button[type="submit"]', (x) => x.click()));
await sleep(2500);
const fpText = await p.evaluate(() => document.querySelector('main')?.innerText.slice(0, 300));
await shot(p, 'forgot-sent');
check('Auth: forgot-password generic success', /if an account|sent|check your/i.test(fpText), fpText.replace(/\n/g, ' | '));
const logTail = fs.readFileSync('logs/server.log', 'utf8').slice(logSizeBefore);
const link = (logTail.match(/"resetLink":"([^"]+)"/) || [])[1];
check('Auth: reset link logged by server (no email in log line)', !!link && !logTail.split('\n').find((l) => l.includes('resetLink'))?.includes(user.email), link);
const newPw = 'NewQaPass456!';
if (link) {
  const path = new URL(link).pathname;
  check('Auth: reset link points at client /reset-password/:token on APP_BASE_URL', link.startsWith('http://localhost:4173/reset-password/'), link);
  await go(p, path);
  await shot(p, 'reset-page');
  const pws = await p.$$('input[type="password"]');
  for (const el of pws) await el.type(newPw);
  await p.$eval('button[type="submit"]', (x) => x.click());
  await sleep(2500);
  const rt = await p.evaluate(() => document.body.innerText.slice(0, 600));
  await shot(p, 'reset-after');
  check('Auth: reset with token succeeds', /updated|reset|sign in/i.test(rt) && !/invalid|expired/i.test(rt), `${p.url()} ${rt.replace(/\n/g, ' | ').slice(0, 200)}`);
  // login with new
  await go(p, '/login');
  await type(p, 'input[name="email"]', user.email);
  await type(p, 'input[name="password"]', newPw);
  await clickText(p, 'Sign in', 'button[type="submit"]');
  await sleep(2500);
  check('Auth: login with new password', (await user_())?.email === user.email);
  await logout();
  // token reuse
  await go(p, path);
  const pws2 = await p.$$('input[type="password"]');
  for (const el of pws2) await el.type('Another789!');
  await p.$eval('button[type="submit"]', (x) => x.click());
  await sleep(2500);
  const rt2 = await p.evaluate(() => document.body.innerText.slice(0, 600));
  await shot(p, 'reset-reuse');
  check('Auth: token reuse rejected with message', /invalid|expired|used/i.test(rt2), rt2.replace(/\n/g, ' | ').slice(0, 200));
}
user.password = newPw; fs.writeFileSync('.qauser.json', JSON.stringify(user));

// Admin demo login on /admin/login
await go(p, '/admin/login');
await shot(p, 'admin-login');
await clickText(p, 'Use this');
await sleep(300);
await clickText(p, 'Sign in', 'button[type="submit"]');
await sleep(3000);
check('Auth: admin demo login -> /admin', /\/admin/.test(p.url()) && (await user_())?.role === 'admin', p.url());
await p.evaluate(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); });

// Member trying admin login
await go(p, '/admin/login');
await type(p, 'input[name="email"]', 'some@gmail.com');
await type(p, 'input[name="password"]', 'ppond333');
await clickText(p, 'Sign in', 'button[type="submit"]');
await sleep(2500);
const memAdm = await p.evaluate(() => document.querySelector('[role="alert"]')?.innerText);
check('Auth: member blocked from admin login with message', !/\/admin\/?(dashboard)?$/.test(new URL(p.url()).pathname) || !!memAdm, `${p.url()} ${memAdm}`);
await p.evaluate(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); });

// Rate limit
let msg = '';
for (let i = 0; i < 12; i++) {
  await go(p, '/login');
  await type(p, 'input[name="email"]', 'nobody@example.com');
  await type(p, 'input[name="password"]', 'nope' + i);
  await clickText(p, 'Sign in', 'button[type="submit"]');
  await sleep(1200);
  msg = await p.evaluate(() => document.querySelector('[role="alert"]')?.innerText || '');
  if (/too many/i.test(msg)) { console.log('429 after', i + 1, 'attempts'); break; }
}
await shot(p, 'login-rate-limited');
check('Auth: rate-limit message shown', /too many/i.test(msg), msg);

saveResults('auth');
await b.close();
