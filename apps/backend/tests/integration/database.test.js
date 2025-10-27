// Mock the database pool for integration testing
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/db/pool');

describe('Database Integration Tests', () => {
  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const result = await pool.query('SELECT NOW()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].now).toBeInstanceOf(Date);
    });

    test('should execute basic queries', async () => {
      const result = await pool.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('Database Schema', () => {
    test('should have required tables', async () => {
      const tables = ['members', 'registration', 'rfid_cards', 'logs', 'venue_state'];
      
      for (const table of tables) {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });

    test('should have proper table structures', async () => {
      // Test members table structure
      const membersColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'members'
        ORDER BY column_name
      `);
      
      const expectedColumns = ['id', 'name', 'email', 'phone', 'province', 'district'];
      const actualColumns = membersColumns.rows.map(row => row.column_name);
      
      expectedColumns.forEach(col => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe('CRUD Operations', () => {
    test('should insert and retrieve member data', async () => {
      // Insert test member
      const insertResult = await pool.query(`
        INSERT INTO members (name, email, phone, province, district, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['test_member', 'test@example.com', '1234567890', 'test_province', 'test_district', 'MEMBER']);
      
      const memberId = insertResult.rows[0].id;
      expect(memberId).toBeDefined();
      
      // Retrieve member
      const selectResult = await pool.query(
        'SELECT * FROM members WHERE id = $1', 
        [memberId]
      );
      
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].name).toBe('test_member');
      expect(selectResult.rows[0].email).toBe('test@example.com');
      
      // Cleanup
      await pool.query('DELETE FROM members WHERE id = $1', [memberId]);
    });

    test('should handle RFID card operations', async () => {
      // Insert test RFID card
      const insertResult = await pool.query(`
        INSERT INTO rfid_cards (rfid_card_id, status)
        VALUES ($1, $2)
        RETURNING rfid_card_id
      `, ['test_card_123', 'available']);
      
      const cardId = insertResult.rows[0].rfid_card_id;
      
      // Update card status
      await pool.query(
        'UPDATE rfid_cards SET status = $1 WHERE rfid_card_id = $2',
        ['assigned', cardId]
      );
      
      // Verify update
      const selectResult = await pool.query(
        'SELECT status FROM rfid_cards WHERE rfid_card_id = $1',
        [cardId]
      );
      
      expect(selectResult.rows[0].status).toBe('assigned');
      
      // Cleanup
      await pool.query('DELETE FROM rfid_cards WHERE rfid_card_id = $1', [cardId]);
    });
  });

  describe('Transaction Handling', () => {
    test('should handle database transactions', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert member in transaction
        const result = await client.query(`
          INSERT INTO members (name, email, province, district, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, ['test_transaction', 'test@trans.com', 'test_prov', 'test_dist', 'MEMBER']);
        
        const memberId = result.rows[0].id;
        
        // Verify member exists within transaction
        const checkResult = await client.query(
          'SELECT * FROM members WHERE id = $1',
          [memberId]
        );
        expect(checkResult.rows).toHaveLength(1);
        
        // Rollback transaction
        await client.query('ROLLBACK');
        
        // Verify member doesn't exist after rollback
        const finalCheck = await pool.query(
          'SELECT * FROM members WHERE id = $1',
          [memberId]
        );
        expect(finalCheck.rows).toHaveLength(0);
        
      } finally {
        client.release();
      }
    });
  });
});