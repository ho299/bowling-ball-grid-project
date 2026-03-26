
/**
 * Database configuration.
 * - Production: uses DATABASE_URL (set by Render/Supabase).
 * - Local dev: falls back to individual DB_* vars from .env.
 */

const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    });

module.exports = pool;