import pg from 'pg';
import { config } from '../config/env.js';
import logger from '../lib/logger.js';

const { Pool } = pg;

function buildConnFromParts() {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
  const db = process.env.PGDATABASE || process.env.POSTGRES_DB;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const pass = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  if (!host || !db || !user || !pass) return undefined;
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
}

export function resolveConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.RAILWAY_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    buildConnFromParts()
  );
}

function needsSsl(connectionString) {
  if (String(process.env.DATABASE_SSL || process.env.FORCE_DB_SSL || '').toLowerCase() === 'false') return false;
  return (
    String(process.env.FORCE_DB_SSL || '').toLowerCase() === 'true' ||
    process.env.DATABASE_SSL === 'true' ||
    process.env.PGSSLMODE === 'require' ||
    (config.isProduction && !!connectionString &&
      !/localhost|127\.0\.0\.1|\.railway\.internal/.test(connectionString))
  );
}

export function createPool() {
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    logger.warn('No Postgres connection string found (DATABASE_URL / RAILWAY_DATABASE_URL / POSTGRES_URL / PG*)');
  }
  const p = new Pool({
    connectionString,
    application_name: process.env.PG_APP_NAME || 'side-myproject-server',
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '10000', 10),
    keepAlive: true,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
  p.on('error', (err) => logger.error({ err: { message: err?.message } }, 'Idle Postgres client error'));
  return p;
}

// The pool is created lazily (no connection is opened at import time) and can be
// swapped in tests via __setPool().
let current = null;

export function getPool() {
  if (!current) current = createPool();
  return current;
}

export function __setPool(p) {
  current = p;
}

export async function closePool() {
  if (current) {
    const p = current;
    current = null;
    await p.end();
  }
}

/** Thin facade so modules can `import pool from '../db/pool.js'` and call pool.query(). */
const pool = {
  query: (...args) => getPool().query(...args),
  connect: () => getPool().connect(),
};

export default pool;
