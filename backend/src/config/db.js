import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// SSL only when explicitly requested (DATABASE_SSL=true) — not needed for internal Docker networks
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
  process.exit(1);
});

export const query = (text, params) => pool.query(text, params);
