/**
 * Boots a throwaway PostgreSQL (npm package embedded-postgres, no Docker) in a temp dir,
 * creates one database per suite, and hands the URLs to tests via vitest's provide/inject.
 * Everything is deleted on teardown. Never touches DATABASE_URL from .env.
 */
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import EmbeddedPostgres from 'embedded-postgres';

export const DATABASES = ['fresh', 'legacy', 'api'];

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export default async function setup({ provide }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'side-myproject-pg-'));
  const port = await freePort();
  const password = 'embedded-test-only';
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(dir, 'data'),
    user: 'postgres',
    password,
    port,
    persistent: false,
    onLog: () => {},
    onError: (e) => process.stderr.write(`[embedded-postgres] ${String(e)}\n`),
  });
  await pg.initialise();
  await pg.start();
  for (const db of DATABASES) await pg.createDatabase(db);

  const urls = Object.fromEntries(
    DATABASES.map((db) => [db, `postgres://postgres:${password}@127.0.0.1:${port}/${db}`]),
  );
  provide('pgUrls', urls);
  process.stdout.write(`[test:pg] embedded PostgreSQL on 127.0.0.1:${port} (${dir})\n`);

  return async () => {
    try {
      await pg.stop();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}
