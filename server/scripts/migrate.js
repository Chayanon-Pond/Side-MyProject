#!/usr/bin/env node
// npm run migrate  -> applies pending SQL files from server/migrations (Railway preDeployCommand).
import { getPool, closePool } from '../db/pool.js';
import { runMigrations } from '../db/migrate.js';

try {
  const applied = await runMigrations(getPool());
  console.log(applied.length ? `Applied ${applied.length} migration(s): ${applied.join(', ')}` : 'Database is up to date');
  await closePool();
  process.exit(0);
} catch (err) {
  console.error(err.message);
  await closePool().catch(() => {});
  process.exit(1);
}
