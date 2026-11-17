import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

// Arbitrary constant so two deploys never run migrations concurrently.
const LOCK_KEY = 784512903;

export async function listMigrationFiles(dir = MIGRATIONS_DIR) {
  const files = await fs.readdir(dir);
  return files.filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
}

/**
 * Apply pending ordered SQL migrations. Each file runs in its own transaction and is
 * recorded in schema_migrations. Returns the list of newly applied file names.
 */
export async function runMigrations(pool, { dir = MIGRATIONS_DIR, log = console.log } = {}) {
  const client = await pool.connect();
  const applied = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));

    for (const file of await listMigrationFiles(dir)) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      log(`-> applying ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}
