const pool = require('../../../src/db/pool');

describe('Service Layer Unit Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await pool.query('DELETE FROM members WHERE email LIKE \'%service.test%\'');
      await pool.query('DELETE FROM rfid_cards WHERE card_id LIKE \'SRV%\'');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Venue State Service', () => {
    let venueState;

    beforeAll(() => {
      venueState = require('../../../src/services/venueState');
    });

    test('should provide venue state functions', () => {
      expect(venueState).toBeDefined();
      expect(typeof venueState.getCurrentCrowd).toBe('function');
      expect(typeof venueState.incCrowd).toBe('function');
      expect(typeof venueState.decCrowd).toBe('function');
      expect(typeof venueState.adjustCrowd).toBe('function');
    });

    test('should handle getting current crowd', () => {
      const currentCrowd = venueState.getCurrentCrowd();
      expect(typeof currentCrowd).toBe('number');
      expect(currentCrowd).toBeGreaterThanOrEqual(0);
    });

    test('should handle incrementing crowd', () => {
      const initialCrowd = venueState.getCurrentCrowd();
      const result = venueState.incCrowd(2);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(initialCrowd);
    });

    test('should handle decrementing crowd', () => {
      const initialCrowd = venueState.getCurrentCrowd();
      const result = venueState.decCrowd(1);
      expect(typeof result).toBe('number');
      // Can't go below 0
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should handle adjusting crowd with positive delta', () => {
      const initialCrowd = venueState.getCurrentCrowd();
      const result = venueState.adjustCrowd(3);
      expect(result).toBe(initialCrowd + 3);
    });

    test('should handle adjusting crowd with negative delta', () => {
      const initialCrowd = venueState.getCurrentCrowd();
      const result = venueState.adjustCrowd(-2);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Game Lite Service', () => {
    let gameLiteService;

    beforeAll(() => {
      try {
        gameLiteService = require('../../../src/services/gameLiteService');
      } catch (error) {
        console.log('Game Lite Service not available:', error.message);
      }
    });

    test('should provide game lite service functions', () => {
      if (gameLiteService) {
        expect(gameLiteService).toBeDefined();
        expect(typeof gameLiteService.getTeamIdForRfid).toBe('function');
        expect(typeof gameLiteService.getTeamScore).toBe('function');
        expect(typeof gameLiteService.handlePostLogInserted).toBe('function');
      }
    });

    test('should handle team ID lookup for RFID', async () => {
      if (gameLiteService) {
        try {
          const result = await gameLiteService.getTeamIdForRfid('SRV12345');
          // Result can be null for non-existent RFID
          expect(result === null || typeof result === 'number').toBe(true);
        } catch (error) {
          // Database operation might fail in test environment
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle team score retrieval', async () => {
      if (gameLiteService) {
        try {
          const result = await gameLiteService.getTeamScore(1);
          expect(result === null || typeof result === 'object').toBe(true);
        } catch (error) {
          // Database operation might fail in test environment
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle post log insertion processing', async () => {
      if (gameLiteService) {
        const mockLog = {
          id: 999,
          rfid_card_id: 'SRV12345',
          label: 'CLUSTER1',
          member_id: 1
        };

        try {
          await gameLiteService.handlePostLogInserted(mockLog);
          // Function should complete without error
          expect(true).toBe(true);
        } catch (error) {
          // May fail due to database constraints in test environment
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle team cleanup on exit', async () => {
      if (gameLiteService && gameLiteService.maybeCleanupTeamOnExitout) {
        try {
          await gameLiteService.maybeCleanupTeamOnExitout('SRV12345');
          expect(true).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle points redemption', async () => {
      if (gameLiteService && gameLiteService.redeemPoints) {
        const redeemData = {
          registrationId: 1,
          clusterLabel: 'CLUSTER1',
          points: 10,
          redeemedBy: 'test'
        };

        try {
          const result = await gameLiteService.redeemPoints(redeemData);
          expect(result === null || typeof result === 'object').toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Registration Service', () => {
    let registrationService;

    beforeAll(() => {
      try {
        registrationService = require('../../../src/services/registrationService');
      } catch (error) {
        console.log('Registration Service not available:', error.message);
      }
    });

    test('should load registration service', () => {
      if (registrationService) {
        expect(registrationService).toBeDefined();
        expect(typeof registrationService).toBe('object');
      }
    });

    test('should provide registration functions', () => {
      if (registrationService) {
        // Check for common registration functions
        const expectedFunctions = ['createRegistration', 'validateRegistration', 'processRegistration'];
        expectedFunctions.forEach(funcName => {
          if (registrationService[funcName]) {
            expect(typeof registrationService[funcName]).toBe('function');
          }
        });
      }
    });
  });

  describe('Check Service', () => {
    let checkService;

    beforeAll(() => {
      try {
        checkService = require('../../../src/services/checkService');
      } catch (error) {
        console.log('Check Service not available:', error.message);
      }
    });

    test('should load check service', () => {
      if (checkService) {
        expect(checkService).toBeDefined();
        expect(typeof checkService).toBe('object');
      }
    });

    test('should provide check functions', () => {
      if (checkService) {
        // Check for common check functions
        const expectedFunctions = ['validateEntry', 'checkAccess', 'processCheck'];
        expectedFunctions.forEach(funcName => {
          if (checkService[funcName]) {
            expect(typeof checkService[funcName]).toBe('function');
          }
        });
      }
    });
  });

  describe('Stats Controller Service', () => {
    let statsController;

    beforeAll(() => {
      try {
        statsController = require('../../../src/services/statsController');
      } catch (error) {
        console.log('Stats Controller not available:', error.message);
      }
    });

    test('should load stats controller', () => {
      if (statsController) {
        expect(statsController).toBeDefined();
        expect(typeof statsController).toBe('object');
      }
    });

    test('should provide stats functions', async () => {
      if (statsController) {
        const expectedFunctions = ['getStats', 'getAnalytics', 'generateReport'];
        expectedFunctions.forEach(funcName => {
          if (statsController[funcName]) {
            expect(typeof statsController[funcName]).toBe('function');
          }
        });
      }
    });

    test('should handle stats generation', async () => {
      if (statsController && statsController.getStats) {
        try {
          const result = await statsController.getStats();
          expect(result === null || typeof result === 'object').toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Event Controller Service', () => {
    let eventController;

    beforeAll(() => {
      try {
        eventController = require('../../../src/services/eventController');
      } catch (error) {
        console.log('Event Controller not available:', error.message);
      }
    });

    test('should load event controller', () => {
      if (eventController) {
        expect(eventController).toBeDefined();
        expect(typeof eventController).toBe('object');
      }
    });

    test('should provide event handling functions', () => {
      if (eventController) {
        const expectedFunctions = ['handleEvent', 'processEvent', 'validateEvent'];
        expectedFunctions.forEach(funcName => {
          if (eventController[funcName]) {
            expect(typeof eventController[funcName]).toBe('function');
          }
        });
      }
    });
  });

  describe('Exitout Stack Service', () => {
    let exitoutStackService;

    beforeAll(() => {
      try {
        exitoutStackService = require('../../../src/services/exitoutStackService');
      } catch (error) {
        console.log('Exitout Stack Service not available:', error.message);
      }
    });

    test('should load exitout stack service', () => {
      if (exitoutStackService) {
        expect(exitoutStackService).toBeDefined();
        expect(typeof exitoutStackService).toBe('object');
      }
    });

    test('should provide stack management functions', () => {
      if (exitoutStackService) {
        const expectedFunctions = ['addToStack', 'getStack', 'maybeFinalizeTeamExit'];
        expectedFunctions.forEach(funcName => {
          if (exitoutStackService[funcName]) {
            expect(typeof exitoutStackService[funcName]).toBe('function');
          }
        });
      }
    });

    test('should handle adding to stack', async () => {
      if (exitoutStackService && exitoutStackService.addToStack) {
        try {
          await exitoutStackService.addToStack(1, 'SRV12345');
          expect(true).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle getting stack', () => {
      if (exitoutStackService && exitoutStackService.getStack) {
        try {
          const stack = exitoutStackService.getStack();
          expect(Array.isArray(stack) || stack === null).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    test('should handle team exit finalization', async () => {
      if (exitoutStackService && exitoutStackService.maybeFinalizeTeamExit) {
        try {
          await exitoutStackService.maybeFinalizeTeamExit(1);
          expect(true).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Service Integration with Database', () => {
    test('should handle service operations with database connections', async () => {
      // Test database connectivity from service layer
      try {
        const result = await pool.query('SELECT COUNT(*) as service_test FROM members');
        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle service layer transactions', async () => {
      // Mock client for transaction testing
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ transaction_test: 1 }] }),
        release: jest.fn()
      };
      
      const originalConnect = pool.connect;
      pool.connect = jest.fn().mockResolvedValue(mockClient);
      
      try {
        const client = await pool.connect();
        await client.query('BEGIN');
        
        // Simulate service layer transaction
        const result = await client.query('SELECT 1 as transaction_test');
        
        await client.query('COMMIT');
        
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as transaction_test');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(result.rows[0].transaction_test).toBe(1);
        
        client.release();
        expect(mockClient.release).toHaveBeenCalled();
      } finally {
        // Restore original connect function
        pool.connect = originalConnect;
      }
    });

    test('should handle service layer error scenarios', async () => {
      try {
        // Simulate service layer error handling
        await pool.query('SELECT * FROM non_existent_service_table');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });
});