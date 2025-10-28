const pool = require('../../../src/db/pool');

// Check if pool is mocked (for tests that mock database)
const isPoolMocked = () => {
  return jest.isMockFunction(pool.query);
};

// Test database setup and teardown
const setupTestDB = async () => {
  // Skip database operations if pool is mocked
  if (isPoolMocked()) {
    console.log('Skipping database setup - pool is mocked');
    return;
  }
  
  try {
    // Create test tables if they don't exist (or clean them)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Clean up any existing test data using actual table names from schema
    await pool.query('DELETE FROM rfid_cards WHERE rfid_card_id LIKE $1', ['test_%']);
    await pool.query('DELETE FROM registration WHERE team_name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM members WHERE name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM logs WHERE rfid_card_id LIKE $1', ['test_%']);
  } catch (error) {
    console.warn('Database setup failed - continuing with mocked tests:', error.message);
  }
};

const teardownTestDB = async () => {
  // Skip database operations if pool is mocked
  if (isPoolMocked()) {
    console.log('Skipping database teardown - pool is mocked');
    return;
  }
  
  try {
    // Clean up test data using actual table names from schema
    await pool.query('DELETE FROM rfid_cards WHERE rfid_card_id LIKE $1', ['test_%']);
    await pool.query('DELETE FROM registration WHERE team_name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM members WHERE name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM logs WHERE rfid_card_id LIKE $1', ['test_%']);
    
    // Drop test tables
    await pool.query('DROP TABLE IF EXISTS test_sessions');
  } catch (error) {
    console.warn('Database teardown failed - ignoring:', error.message);
  }
};

// Global setup
beforeAll(async () => {
  await setupTestDB();
});

// Global teardown
afterAll(async () => {
  await teardownTestDB();
  if (!isPoolMocked()) {
    await pool.end();
  }
});

// Clean up between tests
beforeEach(async () => {
  // Skip database operations if pool is mocked
  if (isPoolMocked()) {
    return;
  }
  
  try {
    // Clear test data before each test using actual table names
    await pool.query('DELETE FROM rfid_cards WHERE rfid_card_id LIKE $1', ['test_%']);
    await pool.query('DELETE FROM registration WHERE team_name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM members WHERE name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM logs WHERE rfid_card_id LIKE $1', ['test_%']);
  } catch (error) {
    // Ignore cleanup errors when using mock
  }
});

module.exports = {
  setupTestDB,
  teardownTestDB
};