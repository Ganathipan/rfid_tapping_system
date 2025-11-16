require('dotenv').config();
const { Pool } = require('pg');
const { getDatabaseUrl, config } = require('../../../../config/master-config.js');

// Priority order for connection:
// 1. Explicit DATABASE_URL environment variable (allows local overrides)
// 2. Connection string from master-config (built from individual env vars)
const resolvedConnectionString = process.env.DATABASE_URL || getDatabaseUrl();

// Determine SSL preference
const sslEnabled = (typeof process.env.DB_SSL !== 'undefined')
  ? (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1')
  : !!config.NETWORK.DATABASE.SSL;

if (process.env.DATABASE_URL) {
  console.log('[DB] Using process.env.DATABASE_URL override');
} else {
  console.log('[DB] Using master-config connection string');
}

// Light redaction for logging
try {
  const urlForLog = new URL(resolvedConnectionString);
  if (urlForLog.password) {
    urlForLog.password = '***';
  }
  console.log('[DB] Connection target:', urlForLog.toString());
} catch(_) {}

const pool = new Pool({
  connectionString: resolvedConnectionString,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  max: config.NETWORK.DATABASE.MAX_CONNECTIONS || 10,
});

// Proactive connectivity test with limited retry (helps surface 28P01 immediately with context)
async function verifyInitialConnection(retries = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const { rows } = await client.query('SELECT NOW() as now');
      client.release();
      console.log(`[DB] Connected successfully (attempt ${attempt}) at ${rows[0].now}`);
      return true;
    } catch (err) {
      const authCode = err && err.code;
      console.error(`[DB] Connection attempt ${attempt} failed${authCode ? ' (code ' + authCode + ')' : ''}:`, err.message);
      // For auth failures (28P01) no point retrying repeatedly unless password might change soon
      if (authCode === '28P01') {
        console.error('[DB] Authentication failed: verify DB_PASSWORD, DB_USER, and other DB_* env vars, or override DATABASE_URL. Aborting further retries.');
        break;
      }
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  return false;
}

// Skip verification in test environment to prevent async logging issues
if (process.env.NODE_ENV !== 'test') {
  verifyInitialConnection();
}

pool.on('error', (err) => {
  console.error('Unexpected PG error (pool idle client error):', err);
});

module.exports = pool;

