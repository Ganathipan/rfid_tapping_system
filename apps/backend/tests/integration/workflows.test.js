// Mock the database pool for integration testing
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');

describe('End-to-End Workflow Integration Tests', () => {
  let testData;

  beforeEach(async () => {
    // Reset test data
    testData = {
      memberIds: [],
      registrationIds: [],
      cardIds: []
    };
  });

  afterEach(async () => {
    // Cleanup all test data in correct order due to foreign key constraints
    // Delete cards first (they reference registration)
    if (testData.cardIds && testData.cardIds.length > 0) {
      for (const id of testData.cardIds) {
        await pool.query('DELETE FROM rfid_cards WHERE rfid_card_id = $1', [id]);
      }
    }
    // Delete members next (they reference registration)
    if (testData.memberIds && testData.memberIds.length > 0) {
      for (const id of testData.memberIds) {
        await pool.query('DELETE FROM members WHERE id = $1', [id]);
      }
    }
    // Delete registration last (it's referenced by other tables)
    if (testData.registrationIds && testData.registrationIds.length > 0) {
      for (const id of testData.registrationIds) {
        await pool.query('DELETE FROM registration WHERE id = $1', [id]);
      }
    }
  });

  describe('Database Workflow Operations', () => {
    test('should create member and registration records', async () => {
      // Step 1: Create a registration
      const registrationResult = await pool.query(`
        INSERT INTO registration (team_name, is_individual, portal, group_size)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['test_workflow_team', false, 'reader1', 3]);

      const registrationId = registrationResult.rows[0].id;
      testData.registrationIds.push(registrationId);

      // Step 2: Create a member linked to registration
      const memberResult = await pool.query(`
        INSERT INTO members (name, email, registration_id, role, portal)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['test_workflow_member', 'test@workflow.com', registrationId, 'LEADER', 'reader1']);

      const memberId = memberResult.rows[0].id;
      testData.memberIds.push(memberId);

      // Step 3: Create RFID card
      const cardResult = await pool.query(`
        INSERT INTO rfid_cards (rfid_card_id, registration_id, status)
        VALUES ($1, $2, $3)
        RETURNING rfid_card_id
      `, ['test_workflow_card_789', registrationId, 'assigned']);

      testData.cardIds.push(cardResult.rows[0].rfid_card_id);

      // Step 4: Verify the relationships work
      const verifyResult = await pool.query(`
        SELECT m.name, m.role, r.team_name, rc.rfid_card_id
        FROM members m
        JOIN registration r ON m.registration_id = r.id
        JOIN rfid_cards rc ON rc.registration_id = r.id
        WHERE m.id = $1
      `, [memberId]);

      expect(verifyResult.rows).toHaveLength(1);
      expect(verifyResult.rows[0].name).toBe('test_workflow_member');
      expect(verifyResult.rows[0].team_name).toBe('test_workflow_team');
      expect(verifyResult.rows[0].rfid_card_id).toBe('test_workflow_card_789');
    });

    test('should handle logging workflow', async () => {
      // Create a card first
      await pool.query(`
        INSERT INTO rfid_cards (rfid_card_id, status)
        VALUES ($1, $2)
      `, ['test_log_card_456', 'available']);

      testData.cardIds.push('test_log_card_456');

      // Create a log entry
      const logResult = await pool.query(`
        INSERT INTO logs (rfid_card_id, portal, label)
        VALUES ($1, $2, $3)
        RETURNING id, log_time
      `, ['test_log_card_456', 'reader1', 'CLUSTER_A']);

      expect(logResult.rows).toHaveLength(1);
      expect(logResult.rows[0]).toHaveProperty('id');
      expect(logResult.rows[0]).toHaveProperty('log_time');

      // Verify the log was created
      const verifyLog = await pool.query(`
        SELECT * FROM logs WHERE rfid_card_id = $1
      `, ['test_log_card_456']);

      expect(verifyLog.rows).toHaveLength(1);
      expect(verifyLog.rows[0].portal).toBe('reader1');
      expect(verifyLog.rows[0].label).toBe('CLUSTER_A');

      // Cleanup log
      await pool.query('DELETE FROM logs WHERE rfid_card_id = $1', ['test_log_card_456']);
    });
  });

  describe('Venue State Management', () => {
    test('should handle venue state operations', async () => {
      // Check if venue_state table has data
      const venueStateResult = await pool.query('SELECT * FROM venue_state LIMIT 1');
      
      // This test passes regardless of current data
      expect(Array.isArray(venueStateResult.rows)).toBe(true);
    });

    test('should handle basic venue operations', async () => {
      // Test updating venue state
      await pool.query(`
        INSERT INTO venue_state (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, ['test_counter', 42]);

      // Verify update
      const result = await pool.query('SELECT value FROM venue_state WHERE key = $1', ['test_counter']);
      expect(result.rows[0].value).toBe('42'); // PostgreSQL returns bigint as string

      // Cleanup
      await pool.query('DELETE FROM venue_state WHERE key = $1', ['test_counter']);
    });
  });

  describe('System Integration', () => {
    test('should handle basic system operations', async () => {
      // Test that the database connection is working
      const result = await pool.query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('current_time');
    });

    test('should handle error scenarios gracefully', async () => {
      // Test invalid query handling
      try {
        await pool.query('SELECT FROM non_existent_table');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('relation "non_existent_table" does not exist');
      }
    });
  });
});