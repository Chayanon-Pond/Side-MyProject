import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL;

// Helper to build connection string from discrete PG* env vars when DATABASE_URL isn't present
function buildConnFromParts() {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
  const db = process.env.PGDATABASE || process.env.POSTGRES_DB;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const pass = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  if (!host || !db || !user || !pass) return undefined;
  // URL-encode username/password in case of special chars
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
}

// Resolve connection string from common envs (Railway/Neon/Supabase)
const connectionString = (
  process.env.DATABASE_URL ||
  process.env.RAILWAY_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  buildConnFromParts()
);

// Determine whether to enable SSL
const needSSL = (
  String(process.env.FORCE_DB_SSL || '').toLowerCase() === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  process.env.DATABASE_SSL === 'true' ||
  (isProduction && connectionString && !connectionString.includes('localhost'))
);

const poolConfig = {
  connectionString,
  application_name: process.env.PG_APP_NAME || 'side-myproject-server',
  // Connection pool settings
  max: parseInt(process.env.PG_POOL_MAX || '15', 10),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '30000', 10),
  // @ts-ignore - supported by pg-pool
  acquireTimeoutMillis: parseInt(process.env.PG_ACQUIRE_TIMEOUT || '60000', 10),
  // @ts-ignore - supported by pg-pool
  createTimeoutMillis: parseInt(process.env.PG_CREATE_TIMEOUT || '30000', 10),
  keepAlive: true,
};

if (needSSL) {
  // Some providers (Neon, Supabase, Render public) require SSL
  poolConfig.ssl = { rejectUnauthorized: false };
}

if (!poolConfig.connectionString) {
  console.warn('⚠️  No Postgres connection string found (DATABASE_URL/RAILWAY_DATABASE_URL/POSTGRES_URL).');
}

const connectionPool = new Pool(poolConfig);

// Test connection and log sanitized target
async function testConnectionOnce() {
  try {
    const client = await connectionPool.connect();
    await client.query('SELECT 1');
    client.release();
    const target = getDbTarget();
    if (target) {
      console.log(`✅ PostgreSQL connected to ${target.host}:${target.port}/${target.database} (ssl=${target.ssl ? 'on' : 'off'})`);
    } else {
      console.log('✅ PostgreSQL connected');
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err?.message || err);
  }
}
testConnectionOnce();

connectionPool.on('error', (err) => {
  console.error('❌ Database connection error:', err?.message || err);
});

export default connectionPool;
export { connectionPool as pool };

// Helper to expose safe DB target info (no secrets)
export function getDbTarget() {
  try {
    const url = poolConfig.connectionString ? new URL(poolConfig.connectionString) : null;
    return url ? {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname?.replace('/', ''),
      ssl: !!poolConfig.ssl,
      provider: isProduction ? 'production' : 'development'
    } : null;
  } catch {
    return null;
  }
}