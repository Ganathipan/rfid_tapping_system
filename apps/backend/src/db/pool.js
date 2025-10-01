const { Pool } = require('pg');
const { DATABASE_URL, PG_SSL } = require('../config/env');

// Use centralized configuration
const { getDatabaseUrl, config } = require('../../../../config/master-config.js');

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: config.NETWORK.DATABASE.SSL ? { rejectUnauthorized: false } : false,
  max: config.NETWORK.DATABASE.MAX_CONNECTIONS,
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
  process.exit(1);
});

module.exports = pool;
