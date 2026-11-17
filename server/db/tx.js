import pool from './pool.js';

/**
 * Run `fn(client)` inside a single-connection transaction.
 * Commits on success, rolls back on any thrown error, always releases the client.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // connection may already be broken; the original error is more useful
    }
    throw err;
  } finally {
    client.release();
  }
}
