
/**
 * Database configuration for the backend. (Update this to server setting when deployed)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'bowling_db',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

module.exports = pool;