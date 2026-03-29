
/**
 * Database configuration for the backend. (Update this to server setting when deployed)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = require('pg');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

module.exports = pool;