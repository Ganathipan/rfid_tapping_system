/**
 * Test Setup Configuration
 * Initializes test environment with mocked dependencies
 */

// Jest is available globally, no need to import

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/rfid_test';
process.env.MQTT_URL = 'mqtt://broker.hivemq.com:1883';

// Mock PostgreSQL pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0
};

// Mock client for database transactions
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Mock MQTT event handlers storage
const mockEventHandlers = {};

// Mock MQTT client
const mockMqttClient = {
  connected: true,
  connect: jest.fn(),
  subscribe: jest.fn(),
  publish: jest.fn(),
  on: jest.fn((event, handler) => {
    mockEventHandlers[event] = handler;
  }),
  end: jest.fn()
};

// Note: Database pool mocking is handled individually by tests that need it
// This avoids conflicts with unit tests that want to test the actual pool module

// Note: MQTT module mocking is handled individually by tests that need it

// Mock the game lite config store to prevent file loading during tests
jest.mock('../src/config/gameLiteConfigStore', () => ({
  loadSync: jest.fn(() => null),
  saveSync: jest.fn(),
  STORE_FILE: '/mock/path/game-lite.config.json'
}));

// Setup default mock behaviors with more specific responses
mockPool.query.mockImplementation((query, params) => {
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
  
  if (query.includes('information_schema.columns')) {
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
  
  if (query.includes('INSERT INTO members')) {
    return Promise.resolve({
      rows: [{ id: 1 }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('INSERT INTO registration')) {
    return Promise.resolve({
      rows: [{ id: 1 }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('INSERT INTO logs') && query.includes('RETURNING')) {
    return Promise.resolve({
      rows: [{ id: 1, log_time: new Date() }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('INSERT INTO logs')) {
    return Promise.resolve({
      rows: [{ id: 1 }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('INSERT INTO venue_state')) {
    return Promise.resolve({
      rows: [],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT value FROM venue_state')) {
    return Promise.resolve({
      rows: [{ value: '42' }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT * FROM logs WHERE')) {
    return Promise.resolve({
      rows: [{
        id: 1,
        log_time: new Date(),
        rfid_card_id: 'test_log_card_456',
        portal: 'reader1',
        label: 'CLUSTER_A'
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('JOIN') && query.includes('members m')) {
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
  
  if (query.includes('FROM non_existent_table')) {
    return Promise.reject(new Error('relation "non_existent_table" does not exist'));
  }
  
  if (query.includes('INSERT INTO rfid_cards')) {
    return Promise.resolve({
      rows: [{ rfid_card_id: params ? params[0] : 'test_card_123' }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT * FROM members WHERE id')) {
    // Check if this is the transaction test case (looking for ID 1 after rollback)
    if (params && params[0] === 1 && global.testTransactionRollback) {
      return Promise.resolve({
        rows: [],
        command: 'SELECT',
        rowCount: 0
      });
    }
    return Promise.resolve({
      rows: [{
        id: 1,
        name: 'test_member',
        email: 'test@example.com',
        phone: '1234567890',
        province: 'test_province',
        district: 'test_district',
        role: 'MEMBER'
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT status FROM rfid_cards')) {
    return Promise.resolve({
      rows: [{ status: 'assigned' }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  if (query.includes('UPDATE rfid_cards SET status')) {
    return Promise.resolve({
      rows: [],
      command: 'UPDATE',
      rowCount: 1
    });
  }
  
  if (query.includes('DELETE FROM')) {
    return Promise.resolve({
      rows: [],
      command: 'DELETE',
      rowCount: 1
    });
  }
  
  // For transaction tests - return empty after rollback for pool queries
  if (query.includes('SELECT * FROM members WHERE id') && global.testTransactionRollback) {
    return Promise.resolve({
      rows: [],
      command: 'SELECT',
      rowCount: 0
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
  if (query === 'BEGIN' || query === 'ROLLBACK' || query === 'COMMIT') {
    if (query === 'ROLLBACK') {
      global.testTransactionRollback = true;
      // Set a timeout to reset rollback state after a short delay
      setTimeout(() => {
        global.testTransactionRollback = false;
      }, 100);
    }
    return Promise.resolve({
      rows: [],
      command: query,
      rowCount: 0
    });
  }
  
  if (query.includes('INSERT INTO members')) {
    global.testMemberId = 1; // Store member ID for transaction test
    return Promise.resolve({
      rows: [{ id: 1 }],
      command: 'INSERT',
      rowCount: 1
    });
  }
  
  if (query.includes('SELECT * FROM members WHERE id')) {
    return Promise.resolve({
      rows: [{
        id: 1,
        name: 'test_transaction',
        email: 'test@trans.com',
        province: 'test_prov',
        district: 'test_dist',
        role: 'MEMBER'
      }],
      command: 'SELECT',
      rowCount: 1
    });
  }
  
  return Promise.resolve({
    rows: [],
    command: 'SELECT',
    rowCount: 0
  });
});

// Global test utilities
global.testUtils = {
  mockPool,
  mockMqttClient,
  mockEventHandlers,
  
  // Helper to create mock database result
  createMockDbResult: (rows = [], command = 'SELECT', rowCount = rows.length) => ({
    rows,
    command,
    rowCount,
    oid: null,
    fields: []
  }),
  
  // Helper to create mock RFID card
  createMockCard: (overrides = {}) => ({
    rfid_card_id: 'TEST123',
    status: 'available',
    portal: 'portal1',
    registration_id: null,
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Helper to create mock registration
  createMockRegistration: (overrides = {}) => ({
    id: 1,
    portal: 'portal1',
    team_name: 'Test Team',
    group_size: 3,
    province: 'Western',
    district: 'Colombo',
    school: 'Test School',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Helper to create mock member
  createMockMember: (overrides = {}) => ({
    id: 1,
    registration_id: 1,
    rfid_card_id: 'TEST123',
    cluster_visits: {},
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Helper to create mock log entry
  createMockLog: (overrides = {}) => ({
    id: 1,
    log_time: new Date().toISOString(),
    rfid_card_id: 'TEST123',
    portal: 'portal1',
    label: 'REGISTER',
    ...overrides
  })
};

// Setup console spy to reduce noise in tests
global.consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  global.testTransactionRollback = false;
});

// Clean up after all tests
afterAll(() => {
  global.consoleSpy.log.mockRestore();
  global.consoleSpy.error.mockRestore();
  global.consoleSpy.warn.mockRestore();
});