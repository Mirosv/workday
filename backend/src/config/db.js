import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// pg reads PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD natively.
// We also support DATABASE_URL as a fallback (local dev).
// SSL is off for internal Docker networks; set DATABASE_SSL=true for managed DBs.
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host:     process.env.PGHOST     || 'localhost',
        port:     Number(process.env.PGPORT)     || 5432,
        database: process.env.PGDATABASE || 'workday',
        user:     process.env.PGUSER     || 'workday',
        password: process.env.PGPASSWORD,
        ssl,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
  process.exit(1);
});

export const query = (text, params) => pool.query(text, params);
