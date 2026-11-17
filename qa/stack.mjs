// QA stack orchestrator: throwaway embedded Postgres + migrate + seed + API server.
// Control via http://127.0.0.1:<ctl>/ : /restart-server, /stop. Writes qa/.stack.json.
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import http from 'http';
import { spawn, spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const ROOT = 'D:/my-project/Side-MyProject';
const SERVER = `${ROOT}/server`;
const QA = `${ROOT}/qa`;
const { default: EmbeddedPostgres } = await import(pathToFileURL(`${SERVER}/node_modules/embedded-postgres/dist/index.js`).href);

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer(); s.unref(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-qa-'));
const uploadDir = path.join(tmp, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(`${QA}/logs`, { recursive: true });
const pgPort = await freePort();
const apiPort = Number(process.env.API_PORT || 3911);
const ctlPort = Number(process.env.CTL_PORT || 3912);
const password = 'qa-embedded-only';

const pg = new EmbeddedPostgres({
  databaseDir: path.join(tmp, 'data'), user: 'postgres', password, port: pgPort, persistent: false,
  onLog: () => {}, onError: (e) => process.stderr.write(`[pg] ${String(e)}\n`),
});
await pg.initialise();
await pg.start();
await pg.createDatabase('apex_qa');

const env = {
  ...process.env,
  DATABASE_URL: `postgres://postgres:${password}@127.0.0.1:${pgPort}/apex_qa`,
  JWT_SECRET: 'qa-local-jwt-secret-not-for-prod-0123456789',
  NODE_ENV: 'development',
  UPLOAD_DIR: uploadDir,
  CORS_ORIGINS: 'http://localhost:4173,http://localhost:5173',
  APP_BASE_URL: 'http://localhost:4173',
  PUBLIC_API_URL: `http://localhost:${apiPort}`,
  PORT: String(apiPort),
  LOG_LEVEL: 'info',
  CLOUDINARY_URL: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '',
};
for (const s of ['migrate', 'seed']) {
  const r = spawnSync('npm', ['run', s], { cwd: SERVER, env, shell: true, encoding: 'utf8' });
  fs.writeFileSync(`${QA}/logs/${s}.log`, (r.stdout || '') + (r.stderr || ''));
  if (r.status !== 0) { console.error(`${s} failed`, r.stderr); await pg.stop(); process.exit(1); }
}

let child = null;
let gen = 0;
function startServer() {
  gen += 1;
  const out = fs.createWriteStream(`${QA}/logs/server.log`, { flags: 'a' });
  out.write(`\n==== server start #${gen} ${new Date().toISOString()} ====\n`);
  child = spawn(process.execPath, ['app.js'], { cwd: SERVER, env });
  child.stdout.pipe(out); child.stderr.pipe(out);
}
function stopServer() {
  return new Promise((res) => {
    if (!child || child.exitCode !== null) return res();
    child.once('exit', () => res());
    child.kill();
    setTimeout(res, 5000);
  });
}
startServer();

fs.writeFileSync(`${QA}/.stack.json`, JSON.stringify({ apiPort, ctlPort, pgPort, tmp, uploadDir, databaseUrl: env.DATABASE_URL }, null, 2));
console.log(`READY api=${apiPort} pg=${pgPort} ctl=${ctlPort} tmp=${tmp}`);

http.createServer(async (req, res) => {
  if (req.url === '/restart-server') {
    await stopServer(); startServer();
    await new Promise((r) => setTimeout(r, 2500));
    res.end('restarted\n');
  } else if (req.url === '/stop') {
    res.end('stopping\n');
    await stopServer();
    try { await pg.stop(); } catch (e) { console.error(e); }
    fs.rmSync(tmp, { recursive: true, force: true });
    try { fs.rmSync(`${QA}/.stack.json`); } catch {}
    console.log('STOPPED and cleaned', tmp);
    process.exit(0);
  } else res.end('ok\n');
}).listen(ctlPort, '127.0.0.1');
