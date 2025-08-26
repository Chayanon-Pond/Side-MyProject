import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_STATIC_URL;

// Some cloud Postgres providers require SSL (Neon, Supabase, etc.)
const needSSL = (
  process.env.PGSSLMODE === 'require' ||
  process.env.DATABASE_SSL === 'true' ||
  (isProduction && process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'))
);

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '20000', 10),
  // @ts-ignore - supported by pg-pool
  acquireTimeoutMillis: parseInt(process.env.PG_ACQUIRE_TIMEOUT || '60000', 10),
  // @ts-ignore - supported by pg-pool
  createTimeoutMillis: parseInt(process.env.PG_CREATE_TIMEOUT || '30000', 10),
  keepAlive: true,
};

if (needSSL) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

if (!poolConfig.connectionString) {
  console.warn('⚠️  DATABASE_URL is not set. The server cannot connect to Postgres.');
}

const connectionPool = new Pool(poolConfig);

// Test connection
connectionPool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

connectionPool.on('error', (err) => {
  console.error('❌ Database connection error:', err?.message || err);
});

export default connectionPool;
export { connectionPool as pool };