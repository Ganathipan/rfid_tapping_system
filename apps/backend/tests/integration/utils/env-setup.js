/**
 * Integration Test Environment Setup
 * Sets up environment variables and global test utilities
 */

// Set test environment variables before any modules are loaded
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/rfid_test';
process.env.MQTT_URL = 'mqtt://localhost:1885';
process.env.INTERNAL_BASE = 'http://localhost:4000';

// Load test environment variables from .env.test if it exists
const path = require('path');
const fs = require('fs');

const envTestPath = path.join(__dirname, '../../.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
}

// Ensure MQTT doesn't try to connect during tests
process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';

// Mock PostgreSQL pool - shared across all integration tests
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0
};

// Transaction state tracking
let transactionState = {
  inTransaction: false,
  rolledBack: false,
  insertedData: {}
};

// Mock client for database transactions
const mockClient = {
  query: jest.fn((query, params) => mockPool.query(query, params)),
  release: jest.fn()
};

// Setup default mock behaviors
mockPool.query.mockImplementation((query, params) => {
  // Debug all member-related queries and transaction commands
  if (query.includes('members') && !query.includes('information_schema')) {
    console.log('MEMBER QUERY MATCH:', query, 'PARAMS:', params);
  }
  if (query.includes('BEGIN') || query.includes('ROLLBACK') || query.includes('COMMIT')) {
    console.log('TRANSACTION COMMAND:', query);
  }
  
  // Handle schema queries FIRST (highest priority)
  if (query.includes('information_schema.columns')) {
    console.log('SCHEMA HANDLER TRIGGERED');
    if (query.includes("table_name = 'members'") || (query.includes('members') && query.includes('column_name'))) {
      console.log('RETURNING MEMBERS SCHEMA');
      return Promise.resolve({
        rows: [
          { column_name: 'id', data_type: 'integer' },
          { column_name: 'name', data_type: 'character varying' },
          { column_name: 'email', data_type: 'character varying' },
          { column_name: 'phone', data_type: 'character varying' },
          { column_name: 'province', data_type: 'character varying' },
          { column_name: 'district', data_type: 'character varying' }
        ],
        command: 'SELECT',
        rowCount: 6
      });
    }
    // Default schema response
    return Promise.resolve({
      rows: [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'name', data_type: 'character varying' }
      ],
      command: 'SELECT',
      rowCount: 2
    });
  }
  
  // HIGH PRIORITY: Member select queries (must be before generic SELECT handlers)
  if (query.includes('SELECT * FROM members WHERE id')) {
    const memberId = params?.[0] || 1;
    console.log('SELECT MEMBER HANDLER TRIGGERED for member ID:', memberId);
    console.log('Transaction state:', { inTransaction: transactionState.inTransaction, rolledBack: transactionState.rolledBack });
    
    // If transaction was rolled back, return empty result for that member
    if (transactionState.rolledBack) {
      console.log('Returning empty due to rollback');
      return Promise.resolve({
        rows: [],
        command: 'SELECT',
        rowCount: 0
      });
    }
    
    // If in transaction, return transaction data if it exists
    if (transactionState.inTransaction && transactionState.insertedData[memberId]) {
      console.log('Returning transaction data');
      return Promise.resolve({
        rows: [transactionState.insertedData[memberId]],
        command: 'SELECT',
        rowCount: 1
      });
    }
    
    // Default response for regular CRUD operations
    const mockData = {
      id: memberId,
      name: 'test_member',
      email: 'test@example.com',
      phone: '1234567890',
      province: 'test_province',
      district: 'test_district',
      registration_id: 1,
      rfid_card_id: 'test_123'
    };
    console.log('Returning default CRUD response:', mockData);
    return Promise.resolve({
      rows: [mockData],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // Mock different responses based on the query
  if (query.includes('SELECT NOW() as current_time')) {
    return Promise.resolve({
      rows: [{ current_time: new Date() }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT NOW()')) {
    return Promise.resolve({
      rows: [{ now: new Date() }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT 1 as test')) {
    return Promise.resolve({
      rows: [{ test: 1 }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT EXISTS')) {
    return Promise.resolve({
      rows: [{ exists: true }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // Registration insert queries
  if (query.includes('INSERT INTO registration')) {
    return Promise.resolve({
      rows: [{ id: 1 }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  // Member insert queries
  if (query.includes('INSERT INTO members')) {
    return Promise.resolve({
      rows: [{ id: 1 }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  // RFID card insert queries
  if (query.includes('INSERT INTO rfid_cards')) {
    return Promise.resolve({
      rows: [{ rfid_card_id: params?.[0] || 'test_card_123' }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  // Log insert queries
  if (query.includes('INSERT INTO logs')) {
    return Promise.resolve({
      rows: [{ 
        id: 1, 
        log_time: new Date().toISOString(),
        rfid_card_id: params?.[0] || 'test_card',
        portal: params?.[1] || 'portal1',
        label: params?.[2] || 'CLUSTER1'
      }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  // Log select queries
  if (query.includes('SELECT * FROM logs WHERE')) {
    return Promise.resolve({
      rows: [{
        id: 1,
        log_time: new Date().toISOString(),
        rfid_card_id: 'test_log_card_456',
        portal: 'reader1',
        label: 'CLUSTER_A'
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // Venue state queries
  if (query.includes('SELECT value FROM venue_state')) {
    return Promise.resolve({
      rows: [{ value: '42' }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // Venue state update queries
  if (query.includes('UPDATE venue_state') || query.includes('INSERT INTO venue_state')) {
    return Promise.resolve({
      rows: [],
      command: 'UPDATE',
      rowCount: 1
    });
  }
  
  // JOIN queries for member verification
  if (query.includes('JOIN') && query.includes('members m') && query.includes('registration r')) {
    return Promise.resolve({
      rows: [{
        name: 'test_workflow_member',
        role: 'MEMBER',
        team_name: 'test_workflow_team',
        rfid_card_id: 'test_workflow_card_789'
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // Error simulation for non-existent table
  if (query.includes('non_existent_table')) {
    return Promise.reject(new Error('relation "non_existent_table" does not exist'));
  }
  
  // Kiosk eligibility responses
  if (query.includes('SELECT') && (query.includes('members') || query.includes('team_scores_lite'))) {
    return Promise.resolve({
      rows: [{
        rfid_card_id: params?.[0] || 'KIOSK001',
        eligible: true,
        score: 100,
        group_size: 3,
        minGroupSize: 2,
        maxGroupSize: 5,
        minPointsRequired: 50,
        latest_label: 'CLUSTER1',
        last_seen_at: new Date().toISOString()
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // Schema queries
  if (query.includes('information_schema.columns')) {

    // Return proper column info based on table name
    if (query.includes("table_name = 'members'") || (query.includes('members') && query.includes('column_name'))) {

      return Promise.resolve({
        rows: [
          { column_name: 'id', data_type: 'integer' },
          { column_name: 'name', data_type: 'character varying' },
          { column_name: 'email', data_type: 'character varying' },
          { column_name: 'phone', data_type: 'character varying' },
          { column_name: 'province', data_type: 'character varying' },
          { column_name: 'district', data_type: 'character varying' },
          { column_name: 'registration_id', data_type: 'character varying' },
          { column_name: 'rfid_card_id', data_type: 'character varying' }
        ],
        command: 'SELECT',
        rowCount: 8
      });
    }
    if (query.includes("table_name = 'rfid_cards'") || (query.includes('rfid_cards') && query.includes('column_name'))) {
      return Promise.resolve({
        rows: [
          { column_name: 'rfid_card_id', data_type: 'character varying' },
          { column_name: 'status', data_type: 'character varying' },
          { column_name: 'registration_id', data_type: 'integer' },
          { column_name: 'created_at', data_type: 'timestamp with time zone' }
        ],
        command: 'SELECT',
        rowCount: 4
      });
    }
    return Promise.resolve({
      rows: [
        { column_name: 'id', data_type: 'integer' },
        { column_name: 'name', data_type: 'character varying' },
        { column_name: 'email', data_type: 'character varying' },
        { column_name: 'status', data_type: 'character varying' }
      ],
      command: 'SELECT',
      rowCount: 4
    });
  }
  

  
  // RFID card status select queries
  if (query.includes('SELECT status FROM rfid_cards WHERE')) {
    return Promise.resolve({
      rows: [{
        status: 'assigned'
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // RFID card select queries
  if (query.includes('SELECT * FROM rfid_cards WHERE')) {
    return Promise.resolve({
      rows: [{
        rfid_card_id: params?.[0] || 'test_card',
        status: 'assigned',
        registration_id: 1,
        created_at: new Date().toISOString()
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  // RFID card status update
  if (query.includes('UPDATE rfid_cards SET status')) {
    return Promise.resolve({
      rows: [],
      command: 'UPDATE',
      rowCount: 1
    });
  }
  
  // Default response
  return Promise.resolve({
    rows: [],
    command: 'SELECT',
    rowCount: 0
  });
});

mockPool.connect.mockResolvedValue(mockClient);

mockClient.query.mockImplementation((query, params) => {
  if (query === 'BEGIN') {
    transactionState.inTransaction = true;
    transactionState.rolledBack = false;
    transactionState.insertedData = {};
    return Promise.resolve({
      rows: [],
      command: query,
      rowCount: 0
    });
  }
  
  if (query === 'ROLLBACK') {
    transactionState.inTransaction = false;
    transactionState.rolledBack = true;
    // Clear inserted data after rollback
    const insertedData = { ...transactionState.insertedData };
    transactionState.insertedData = {};
    return Promise.resolve({
      rows: [],
      command: query,
      rowCount: 0
    });
  }
  
  if (query === 'COMMIT') {
    transactionState.inTransaction = false;
    transactionState.rolledBack = false;
    return Promise.resolve({
      rows: [],
      command: query,
      rowCount: 0
    });
  }
  
  // Transaction member insert
  if (query.includes('INSERT INTO members') && query.includes('RETURNING') && transactionState.inTransaction) {
    const memberId = 1;
    transactionState.insertedData[memberId] = {
      id: memberId,
      name: params?.[0] || 'test_transaction',
      email: params?.[1] || 'test@trans.com',
      province: params?.[2] || 'test_prov',
      district: params?.[3] || 'test_dist',
      role: params?.[4] || 'MEMBER'
    };
    console.log('TRANSACTION INSERT - Stored data:', transactionState.insertedData[memberId]);
    return Promise.resolve({
      rows: [{ id: memberId }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  // Transaction member select (within client.query)
  if (query.includes('SELECT * FROM members WHERE id') && transactionState.inTransaction) {
    const memberId = params?.[0] || 1;
    console.log('TRANSACTION SELECT - Looking for member ID:', memberId);
    console.log('TRANSACTION SELECT - Available data:', transactionState.insertedData);
    
    if (transactionState.insertedData[memberId]) {
      console.log('TRANSACTION SELECT - Returning transaction data');
      return Promise.resolve({
        rows: [transactionState.insertedData[memberId]],
        command: 'SELECT',
        rowCount: 1
      });
    } else {
      console.log('TRANSACTION SELECT - No data found for member ID:', memberId);
      return Promise.resolve({
        rows: [],
        command: 'SELECT',
        rowCount: 0
      });
    }
  }

  return Promise.resolve({
    rows: [],
    command: 'SELECT',
    rowCount: 0
  });
});

// Global test utilities available to all integration tests
global.testUtils = {
  mockPool,
  mockClient,
  
  // Helper to create mock database result
  createMockDbResult: (rows = [], command = 'SELECT', rowCount = rows.length) => ({
    rows,
    command,
    rowCount,
    oid: null,
    fields: []
  })
};