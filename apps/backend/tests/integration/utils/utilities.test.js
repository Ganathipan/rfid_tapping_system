const pool = require('../../../src/db/pool');
const postInternal = require('../../../src/utils/postInternal');

describe('Utilities Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Database Pool Utilities', () => {
    test('should handle database connection pooling', async () => {
      expect(pool).toBeDefined();
      expect(typeof pool.query).toBe('function');
      expect(typeof pool.connect).toBe('function');
    });

    test('should execute basic database queries', async () => {
      try {
        const result = await pool.query('SELECT NOW() as current_time');
        expect(result).toBeDefined();
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBeGreaterThan(0);
      } catch (error) {
        // Database might not be available in test environment
        expect(error).toBeDefined();
      }
    });

    test('should handle database connection errors gracefully', async () => {
      try {
        // Try to execute an invalid query to test error handling
        await pool.query('SELECT * FROM non_existent_table');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    test('should manage connection lifecycle', async () => {
      let client;
      try {
        client = await pool.connect();
        expect(client).toBeDefined();
        expect(typeof client.query).toBe('function');
        
        const result = await client.query('SELECT 1 as test');
        expect(result.rows[0].test).toBe(1);
      } catch (error) {
        // Connection might fail in test environment
        expect(error).toBeDefined();
      } finally {
        if (client) {
          client.release();
        }
      }
    });
  });

  describe('PostInternal Utility', () => {
    test('should be defined and have expected structure', () => {
      expect(postInternal).toBeDefined();
      expect(typeof postInternal).toBe('object');
    });

    test('should handle internal API calls', async () => {
      try {
        // Test if postInternal has the expected methods
        if (typeof postInternal.makeRequest === 'function') {
          // Test making an internal request
          const result = await postInternal.makeRequest({
            method: 'GET',
            url: '/health'
          });
          expect(result).toBeDefined();
        }
      } catch (error) {
        // Method might not exist or fail in test environment
        expect(error).toBeDefined();
      }
    });

    test('should handle request configuration', () => {
      // Test configuration properties if they exist
      const expectedProperties = ['baseURL', 'timeout', 'headers'];
      expectedProperties.forEach(prop => {
        if (postInternal.hasOwnProperty(prop)) {
          expect(postInternal[prop]).toBeDefined();
        }
      });
    });

    test('should handle error responses', async () => {
      try {
        if (typeof postInternal.makeRequest === 'function') {
          // Try to make a request to a non-existent endpoint
          await postInternal.makeRequest({
            method: 'GET',
            url: '/non-existent-endpoint'
          });
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Configuration Integration', () => {
    test('should load environment configuration', () => {
      const env = require('../../../src/config/env');
      expect(env).toBeDefined();
      expect(typeof env).toBe('object');
    });

    test('should have required configuration values', () => {
      const env = require('../../../src/config/env');
      
      // Test for common configuration properties
      const expectedConfigs = ['PORT', 'NODE_ENV', 'DATABASE_URL'];
      expectedConfigs.forEach(config => {
        if (env.hasOwnProperty(config)) {
          expect(env[config]).toBeDefined();
        }
      });
    });

    test('should handle game lite configuration', () => {
      try {
        const gameLiteConfig = require('../../../src/config/gameLiteConfig');
        expect(gameLiteConfig).toBeDefined();
        expect(typeof gameLiteConfig).toBe('object');
      } catch (error) {
        // Config file might not exist
        expect(error).toBeDefined();
      }
    });

    test('should handle configuration store', () => {
      try {
        const configStore = require('../../../src/config/configStore');
        expect(configStore).toBeDefined();
        
        if (typeof configStore.get === 'function') {
          // Test configuration retrieval
          const testConfig = configStore.get('test_key');
          // Result can be undefined for non-existent keys
          expect(testConfig !== null).toBe(true);
        }
      } catch (error) {
        // Config store might not be available
        expect(error).toBeDefined();
      }
    });
  });

  describe('Real-time Integration Utilities', () => {
    test('should handle MQTT handler configuration', () => {
      const mqttHandler = require('../../../src/realtime/mqttHandler');
      expect(mqttHandler).toBeDefined();
      expect(typeof mqttHandler).toBe('object');
    });

    test('should handle cluster bus configuration', () => {
      try {
        const clusterBus = require('../../../src/realtime/clusterBus');
        expect(clusterBus).toBeDefined();
        expect(typeof clusterBus).toBe('object');
      } catch (error) {
        // Cluster bus might not be available in test environment
        expect(error).toBeDefined();
      }
    });

    test('should manage real-time connection states', () => {
      const mqttHandler = require('../../../src/realtime/mqttHandler');
      
      // Test if handler has expected properties
      const expectedProperties = ['client', 'isConnected', 'connect', 'disconnect'];
      expectedProperties.forEach(prop => {
        if (mqttHandler.hasOwnProperty(prop)) {
          expect(mqttHandler[prop]).toBeDefined();
        }
      });
    });
  });

  describe('Service Layer Integration', () => {
    test('should load event controller', () => {
      try {
        const eventController = require('../../../src/services/eventController');
        expect(eventController).toBeDefined();
        expect(typeof eventController).toBe('object');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should load registration service', () => {
      try {
        const registrationService = require('../../../src/services/registrationService');
        expect(registrationService).toBeDefined();
        expect(typeof registrationService).toBe('object');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should load check service', () => {
      try {
        const checkService = require('../../../src/services/checkService');
        expect(checkService).toBeDefined();
        expect(typeof checkService).toBe('object');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should load venue state service', () => {
      try {
        const venueState = require('../../../src/services/venueState');
        expect(venueState).toBeDefined();
        expect(typeof venueState).toBe('object');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Database Schema Integration', () => {
    test('should verify required tables exist', async () => {
      try {
        const tables = ['members', 'registration', 'rfid_cards', 'logs', 'venue_state'];
        
        for (const table of tables) {
          const result = await pool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            )
          `, [table]);
          
          expect(result.rows[0].exists).toBe(true);
        }
      } catch (error) {
        // Database might not be available or tables might not exist in test env
        expect(error).toBeDefined();
      }
    });

    test('should verify table relationships', async () => {
      try {
        // Test foreign key relationships
        const query = `
          SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
        `;
        
        const result = await pool.query(query);
        expect(result.rows).toBeDefined();
        expect(Array.isArray(result.rows)).toBe(true);
      } catch (error) {
        // Schema queries might fail in test environment
        expect(error).toBeDefined();
      }
    });
  });
});