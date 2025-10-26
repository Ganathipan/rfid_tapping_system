/**
 * Test Setup Configuration
 * Initializes test environment with mocked dependencies
 */

// Jest is available globally, no need to import

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/rfid_test';
process.env.MQTT_URL = 'mqtt://localhost:1885';

// Mock PostgreSQL pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0
};

// Mock MQTT client
const mockMqttClient = {
  connected: true,
  connect: jest.fn(),
  subscribe: jest.fn(),
  publish: jest.fn(),
  on: jest.fn(),
  end: jest.fn()
};

// Global test utilities
global.testUtils = {
  mockPool,
  mockMqttClient,
  
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
});

// Clean up after all tests
afterAll(() => {
  global.consoleSpy.log.mockRestore();
  global.consoleSpy.error.mockRestore();
  global.consoleSpy.warn.mockRestore();
});