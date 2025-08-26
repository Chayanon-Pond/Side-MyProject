import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const connectionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
  acquireTimeoutMillis: 60000,    // Added acquire timeout
  createTimeoutMillis: 30000,     // Added create timeout
});

// Test connection
connectionPool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

connectionPool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

export default connectionPool;
export { connectionPool as pool };