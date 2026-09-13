import pg from 'pg';

const { Pool } = pg;

if(!process.env.DATABASE_URL){
  console.error('DATABASE_URL is not set. The registry cannot start without a database.');
  process.exit(1);
}

/* Render's managed Postgres terminates TLS with its own CA; the platform's
   documented client setting is to trust it without local CA verification. */
const needsSsl = !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: 8,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on('error', (err) => console.error('Unexpected idle client error', err));

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn){
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
