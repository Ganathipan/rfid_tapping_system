const path = require('path');

// Mock the master-config.js module
jest.mock('../../../../config/master-config.js', () => ({
  getBackendEnv: jest.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://localhost:5432/testdb',
    MQTT_BROKER_URL: 'mqtt://broker.hivemq.com1883'
  }))
}));

describe('Backend Environment Configuration', () => {
  // Clear require cache before each test
  beforeEach(() => {
    // Clear the require cache for the env.js module
    delete require.cache[require.resolve('../../src/config/env.js')];
    delete require.cache[require.resolve('../../../../config/master-config.js')];
  });

  describe('Module Exports', () => {
    it('should export the result of getBackendEnv()', () => {
      // Require the module (will execute the code)
      const envConfig = require('../../src/config/env.js');

      // Verify the exported value has expected properties
      expect(envConfig).toBeDefined();
      expect(typeof envConfig).toBe('object');
      expect(envConfig.NODE_ENV).toBe('test');
      expect(envConfig.PORT).toBe(3001);
      expect(envConfig.DATABASE_URL).toBe('postgresql://localhost:5432/testdb');
      expect(envConfig.MQTT_BROKER_URL).toBe('mqtt://localhost:1883');
    });

    it('should be a valid configuration object', () => {
      const envConfig = require('../../src/config/env.js');

      expect(envConfig).toBeDefined();
      expect(envConfig).not.toBeNull();
      expect(typeof envConfig).toBe('object');
    });

    it('should contain expected configuration keys', () => {
      const envConfig = require('../../src/config/env.js');

      // Check for common environment configuration keys
      expect(envConfig).toHaveProperty('NODE_ENV');
      expect(envConfig).toHaveProperty('PORT');
      expect(envConfig).toHaveProperty('DATABASE_URL');
      expect(envConfig).toHaveProperty('MQTT_BROKER_URL');
    });
  });

  describe('Master Config Integration', () => {
    it('should correctly import getBackendEnv from master-config.js', () => {
      const envConfig = require('../../src/config/env.js');

      // Verify the import works and returns expected structure
      expect(envConfig).toBeDefined();
      expect(typeof envConfig).toBe('object');
      expect(envConfig.NODE_ENV).toBe('test');
    });

    it('should have proper configuration structure', () => {
      const envConfig = require('../../src/config/env.js');

      expect(envConfig).toBeDefined();
      expect(typeof envConfig).toBe('object');
      // Verify it has standard environment variables
      expect(typeof envConfig.PORT).toBe('number');
      expect(typeof envConfig.DATABASE_URL).toBe('string');
      expect(typeof envConfig.MQTT_BROKER_URL).toBe('string');
    });
  });

  describe('Configuration Validation', () => {
    it('should not throw errors when required', () => {
      expect(() => {
        require('../../src/config/env.js');
      }).not.toThrow();
    });

    it('should return consistent configuration across requires', () => {
      const envConfig1 = require('../../src/config/env.js');
      const envConfig2 = require('../../src/config/env.js');

      expect(envConfig1).toEqual(envConfig2);
      expect(envConfig1.NODE_ENV).toBe(envConfig2.NODE_ENV);
    });
  });

  describe('Configuration Types', () => {
    it('should have proper string configuration values', () => {
      const envConfig = require('../../src/config/env.js');

      expect(typeof envConfig.NODE_ENV).toBe('string');
      expect(typeof envConfig.DATABASE_URL).toBe('string');
      expect(typeof envConfig.MQTT_BROKER_URL).toBe('string');
    });

    it('should have proper numeric configuration values', () => {
      const envConfig = require('../../src/config/env.js');

      expect(typeof envConfig.PORT).toBe('number');
      expect(envConfig.PORT).toBeGreaterThan(0);
    });

    it('should have valid configuration values', () => {
      const envConfig = require('../../src/config/env.js');

      expect(envConfig.NODE_ENV).toBeTruthy();
      expect(envConfig.DATABASE_URL).toContain('postgresql://');
      expect(envConfig.MQTT_BROKER_URL).toContain('mqtt://');
      expect(envConfig.PORT).toBeGreaterThan(1000);
    });
  });

  describe('Module Caching', () => {
    it('should cache the module after first require', () => {
      // First require
      const envConfig1 = require('../../src/config/env.js');
      
      // Second require (should use cached version)
      const envConfig2 = require('../../src/config/env.js');

      // Should be the same reference due to Node.js module caching
      expect(envConfig1).toBe(envConfig2); // Same reference
      expect(envConfig1).toEqual(envConfig2);
    });

    it('should maintain consistent values across multiple requires', () => {
      const envConfig1 = require('../../src/config/env.js');
      const envConfig2 = require('../../src/config/env.js');

      expect(envConfig1.NODE_ENV).toBe(envConfig2.NODE_ENV);
      expect(envConfig1.PORT).toBe(envConfig2.PORT);
      expect(envConfig1.DATABASE_URL).toBe(envConfig2.DATABASE_URL);
    });
  });

  describe('File Path and Structure', () => {
    it('should be located in the correct directory structure', () => {
      // Verify the file exists in the expected location
      const envPath = require.resolve('../../src/config/env.js');
      expect(envPath).toContain('config');
      expect(envPath).toContain('env.js');
    });

    it('should successfully import master-config.js', () => {
      // This test ensures the relative path ../../../../config/master-config.js is correct
      // If incorrect, the require would fail and throw an error
      expect(() => {
        require('../../src/config/env.js');
      }).not.toThrow();
    });

    it('should export a valid configuration object', () => {
      const envConfig = require('../../src/config/env.js');

      expect(envConfig).toBeDefined();
      expect(typeof envConfig).toBe('object');
      expect(Object.keys(envConfig).length).toBeGreaterThan(0);
    });
  });
});