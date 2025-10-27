/**
 * Database Pool Module Tests - Branch Coverage Focus
 * Tests specifically targeting the conditional branches in pool.js
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Store original environment variables
const originalEnv = { ...process.env };

describe('Database Pool Module - Branch Coverage', () => {
  beforeEach(() => {
    // Clean up environment variables
    delete process.env.DATABASE_URL;
    delete process.env.PG_SSL;
    
    // Clear module cache to test different configurations
    jest.resetModules();
    
    // Mock console to prevent noise
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Connection String Resolution Branches', () => {
    test('should use process.env.DATABASE_URL when available (first branch)', () => {
      // Set environment variable
      process.env.DATABASE_URL = 'postgresql://env:override@localhost:5432/rfid_env';
      
      // Mock dependencies
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://master:config@localhost:5432/rfid_master'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      // Require the module to trigger the logic
      require('../../src/db/pool.js');
      
      expect(console.log).toHaveBeenCalledWith('[DB] Using process.env.DATABASE_URL override');
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        connectionString: 'postgresql://env:override@localhost:5432/rfid_env'
      }));
    });

    test('should use LEGACY_DATABASE_URL when process.env not set (second branch)', () => {
      // Don't set process.env.DATABASE_URL, but set legacy
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://master:config@localhost:5432/rfid_master'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ 
        DATABASE_URL: 'postgresql://legacy:env@localhost:5432/rfid_legacy', 
        PG_SSL: undefined 
      }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(console.log).toHaveBeenCalledWith('[DB] Using legacy env DATABASE_URL from config/env');
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        connectionString: 'postgresql://legacy:env@localhost:5432/rfid_legacy'
      }));
    });

    test('should use master-config when no env variables set (third branch)', () => {
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://master:config@localhost:5432/rfid_master'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(console.log).toHaveBeenCalledWith('[DB] Using master-config connection string');
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        connectionString: 'postgresql://master:config@localhost:5432/rfid_master'
      }));
    });
  });

  describe('SSL Configuration Branches', () => {
    test('should enable SSL when process.env.PG_SSL is "true"', () => {
      process.env.PG_SSL = 'true';
      
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: { rejectUnauthorized: false }
      }));
    });

    test('should enable SSL when process.env.PG_SSL is "1"', () => {
      process.env.PG_SSL = '1';
      
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: { rejectUnauthorized: false }
      }));
    });

    test('should disable SSL when process.env.PG_SSL is "false"', () => {
      process.env.PG_SSL = 'false';
      
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: true, MAX_CONNECTIONS: 10 } } } // config has SSL=true but env overrides
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: false
      }));
    });

    test('should use config SSL when process.env.PG_SSL is undefined', () => {
      // No process.env.PG_SSL set
      
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: true, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        ssl: { rejectUnauthorized: false }
      }));
    });
  });

  describe('Max Connections Branch', () => {
    test('should use configured max connections', () => {
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 20 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        max: 20
      }));
    });

    test('should default to 10 when max connections is falsy', () => {
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: null } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(mockPgPool).toHaveBeenCalledWith(expect.objectContaining({
        max: 10
      }));
    });
  });

  describe('URL Redaction Branch', () => {
    test('should redact password in URL logging', () => {
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      
      jest.doMock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://user:password@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      require('../../src/db/pool.js');
      
      expect(console.log).toHaveBeenCalledWith(
        '[DB] Connection target:', 
        'postgresql://user:***@localhost:5432/rfid_test'
      );
    });

    test('should handle invalid URL format gracefully (catch branch)', () => {
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      
      jest.doMock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'not-a-valid-url'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      // Should not throw
      expect(() => require('../../src/db/pool.js')).not.toThrow();
      
      // Should not log connection target due to URL parsing error
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('[DB] Connection target:'),
        expect.anything()
      );
    });
  });

  describe('Basic Functionality', () => {
    test('should create pool and set up error handler', () => {
      const mockPool = { connect: jest.fn(), on: jest.fn(), query: jest.fn() };
      const mockPgPool = jest.fn(() => mockPool);
      
      jest.doMock('pg', () => ({ Pool: mockPgPool }));
      jest.doMock('../../../../config/master-config.js', () => ({
        getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test'),
        config: { NETWORK: { DATABASE: { SSL: false, MAX_CONNECTIONS: 10 } } }
      }));
      jest.doMock('../../src/config/env', () => ({ DATABASE_URL: undefined, PG_SSL: undefined }));
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      
      const pool = require('../../src/db/pool.js');
      
      expect(pool).toBe(mockPool);
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });


});