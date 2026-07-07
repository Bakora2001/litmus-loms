import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set. Check your .env file.');
}

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.PGSSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
