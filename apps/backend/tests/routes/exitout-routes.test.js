/**
 * Unit Tests for Exit Out Routes
 * Tests API endpoints for exit stack management
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);
jest.mock('../../src/services/exitoutStackService');
jest.mock('../../src/services/venueState', () => ({
  getCurrentCrowd: jest.fn().mockResolvedValue(45)
}));

const exitoutRoutes = require('../../src/routes/exitoutRoutes');
const exitoutStackService = require('../../src/services/exitoutStackService');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/exitout', exitoutRoutes);

describe('Exit Out Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/exitout/stack', () => {
    test('should return exit stack successfully', async () => {
      // Arrange
      const mockStack = [
        {
          registrationId: '1',
          cardCount: 2,
          cards: ['CARD1', 'CARD2'],
          lastUpdated: '2025-10-26T10:00:00.000Z'
        }
      ];
      const mockStats = {
        totalTeams: 1,
        totalCards: 2,
        timestamp: '2025-10-26T10:00:00.000Z'
      };

      exitoutStackService.getStack.mockReturnValue(mockStack);
      exitoutStackService.getStackStats.mockReturnValue(mockStats);

      // Act
      const response = await request(app)
        .get('/api/exitout/stack');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stack).toEqual(mockStack);
      expect(response.body.stats).toEqual(mockStats);
    });

    test('should return empty stack', async () => {
      // Arrange
      exitoutStackService.getStack.mockReturnValue([]);
      exitoutStackService.getStackStats.mockReturnValue({
        totalTeams: 0,
        totalCards: 0,
        timestamp: '2025-10-26T10:00:00.000Z'
      });

      // Act
      const response = await request(app)
        .get('/api/exitout/stack');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stack).toEqual([]);
    });
  });

  describe('POST /api/exitout/release/:registrationId', () => {
    test('should release team cards successfully', async () => {
      // Arrange
      const registrationId = '1';
      const mockReleaseResult = {
        registrationId: '1',
        released: 2,
        errors: 0,
        cards: [
          { tagId: 'CARD1', status: 'released', timestamp: '2025-10-26T10:00:00.000Z' },
          { tagId: 'CARD2', status: 'released', timestamp: '2025-10-26T10:00:00.000Z' }
        ],
        status: 'completed'
      };

      exitoutStackService.releaseAll.mockResolvedValue(mockReleaseResult);

      // Act
      const response = await request(app)
        .post(`/api/exitout/release/${registrationId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockReleaseResult);
      expect(exitoutStackService.releaseAll).toHaveBeenCalledWith(registrationId);
    });

    test('should handle team with no cards in stack', async () => {
      // Arrange
      const registrationId = '999';
      const mockReleaseResult = {
        registrationId: '999',
        released: 0,
        errors: 0,
        cards: [],
        status: 'no_cards_in_stack'
      };

      exitoutStackService.releaseAll.mockResolvedValue(mockReleaseResult);

      // Act
      const response = await request(app)
        .post(`/api/exitout/release/${registrationId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.status).toBe('no_cards_in_stack');
    });

    test('should handle missing registrationId', async () => {
      // Act
      const response = await request(app)
        .post('/api/exitout/release/');

      // Assert
      expect(response.status).toBe(404); // Route not found
    });
  });

  describe('POST /api/exitout/clear', () => {
    test('should clear exit stack successfully', async () => {
      // Arrange
      const mockClearResult = {
        totalTeams: 2,
        totalCards: 4,
        status: 'cleared',
        clearedAt: '2025-10-26T10:00:00.000Z'
      };

      exitoutStackService.clearStack.mockReturnValue(mockClearResult);

      // Act
      const response = await request(app)
        .post('/api/exitout/clear');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockClearResult);
    });
  });

  describe('GET /api/exitout/stats', () => {
    test('should return exit stack statistics', async () => {
      // Arrange
      const mockStats = {
        totalTeams: 2,
        totalCards: 5,
        timestamp: '2025-10-26T10:00:00.000Z'
      };

      exitoutStackService.getStackStats.mockReturnValue(mockStats);

      // Act
      const response = await request(app)
        .get('/api/exitout/stats');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual(mockStats);
    });
  });

  describe('GET /api/exitout/team/:registrationId', () => {
    test('should return team exit stack info', async () => {
      // Arrange
      const registrationId = '1';
      const mockStack = [
        {
          registrationId: '1',
          cardCount: 2,
          cards: ['CARD1', 'CARD2'],
          lastUpdated: '2025-10-26T10:00:00.000Z'
        }
      ];

      exitoutStackService.getStack.mockReturnValue(mockStack);

      // Act
      const response = await request(app)
        .get(`/api/exitout/team/${registrationId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.team).toEqual(mockStack[0]);
    });

    test('should handle team not in stack', async () => {
      // Arrange
      const registrationId = '999';
      exitoutStackService.getStack.mockReturnValue([]);

      // Act
      const response = await request(app)
        .get(`/api/exitout/team/${registrationId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.team).toMatchObject({
        registrationId: registrationId,
        cardCount: 0,
        cards: [],
        lastUpdated: expect.any(String)
      });
    });
  });

  describe('POST /api/exitout/simulate/:registrationId', () => {
    test('should simulate exitout tap successfully', async () => {
      // Arrange
      const registrationId = '1';
      const tagId = 'TEST123';
      const mockResult = {
        registrationId: '1',
        tagId: 'TEST123',
        stackSize: 1,
        timestamp: '2025-10-26T10:00:00.000Z'
      };

      exitoutStackService.addToStack.mockResolvedValue(mockResult);

      // Act
      const response = await request(app)
        .post(`/api/exitout/simulate/${registrationId}`)
        .send({ tagId });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(mockResult);
    });
  });

  describe('GET /api/exitout/health', () => {
    test('should return health status', async () => {
      // Arrange
      exitoutStackService.getStackStats.mockReturnValue({
        totalTeams: 2,
        totalCards: 5
      });
      
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [{ cluster_cards: 10 }] });

      // Act
      const response = await request(app)
        .get('/api/exitout/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    test('should handle health check errors', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      getCurrentCrowd.mockRejectedValue(new Error('Health check failed'));

      // Act
      const response = await request(app)
        .get('/api/exitout/health');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        status: 'error',
        error: 'Health check failed'
      });
    });

    test('should detect high venue crowd alert', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      getCurrentCrowd.mockResolvedValue(150); // High value
      
      exitoutStackService.getStackStats.mockReturnValue({
        totalTeams: 2,
        totalCards: 5
      });
      
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [{ cluster_cards: 10 }] });

      // Act
      const response = await request(app)
        .get('/api/exitout/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.alerts.highVenueCrowd).toBe(true);
    });
  });

  // Add missing endpoint tests for better coverage
  describe('GET /api/exitout/test-crowd', () => {
    test('should return crowd test analysis', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      getCurrentCrowd.mockResolvedValue(50);
      
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: [{ current_crowd: 50 }] }) // venue_state
        .mockResolvedValueOnce({ // cluster counts
          rows: [
            { zone_code: 'CLUSTER1', current_count: '20' },
            { zone_code: 'CLUSTER2', current_count: '15' }
          ]
        });

      exitoutStackService.getStack.mockReturnValue([]);
      exitoutStackService.getStackStats.mockReturnValue({ totalCards: 2, totalTeams: 1 });

      // Act
      const response = await request(app)
        .get('/api/exitout/test-crowd');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        venueCrowd: 50,
        clusterTotal: 35,
        analysis: expect.objectContaining({
          venueVsCluster: 15,
          expectedDifference: 2
        })
      });
    });

    test('should handle test-crowd database errors', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      const dbError = new Error('Connection timeout');
      dbError.code = 'ECONNRESET';
      dbError.constraint = null;
      
      getCurrentCrowd.mockRejectedValue(dbError);

      // Act
      const response = await request(app)
        .get('/api/exitout/test-crowd');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to get current crowd',
        details: {
          code: 'ECONNRESET',
          constraint: null
        }
      });
    });
  });

  describe('GET /api/exitout/debug-logs', () => {
    test('should return debug log information', async () => {
      // Arrange
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ // latest taps per card
          rows: [
            { rfid_card_id: 'CARD1', label: 'CLUSTER1', log_time: new Date(), portal: 'reader1', category: 'CLUSTER' },
            { rfid_card_id: 'CARD2', label: 'EXITOUT', log_time: new Date(), portal: 'EXITOUT', category: 'EXITOUT' }
          ]
        })
        .mockResolvedValueOnce({ // recent exitout logs
          rows: [
            { rfid_card_id: 'CARD2', label: 'EXITOUT', portal: 'EXITOUT', log_time: new Date() }
          ]
        })
        .mockResolvedValueOnce({ // summary by category
          rows: [
            { category: 'CLUSTER', count: '25' },
            { category: 'EXITOUT', count: '5' }
          ]
        });

      // Act
      const response = await request(app)
        .get('/api/exitout/debug-logs');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        latestTapsPerCard: expect.arrayContaining([
          expect.objectContaining({ rfid_card_id: 'CARD1' })
        ]),
        recentExitoutLogs: expect.arrayContaining([
          expect.objectContaining({ rfid_card_id: 'CARD2' })
        ]),
        summaryByCategory: expect.arrayContaining([
          expect.objectContaining({ category: 'CLUSTER' })
        ])
      });
    });

    test('should handle debug-logs database errors', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Query execution failed'));

      // Act
      const response = await request(app)
        .get('/api/exitout/debug-logs');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to get debug logs',
        message: 'Query execution failed'
      });
    });
  });

  describe('GET /api/exitout/debug-totals', () => {
    test('should return debug totals analysis', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      getCurrentCrowd.mockResolvedValue(45);
      
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_assigned: '100' }] }) // assigned cards count
        .mockResolvedValueOnce({ // cluster counts
          rows: [
            { zone_code: 'CLUSTER1', current_count: '20' },
            { zone_code: 'CLUSTER2', current_count: '15' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ current_crowd: 45, last_updated: new Date() }] }); // venue state

      exitoutStackService.getStackStats.mockReturnValue({ totalCards: 3, totalTeams: 2 });

      // Act
      const response = await request(app)
        .get('/api/exitout/debug-totals');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        analysis: expect.objectContaining({
          venueCrowd: 45,
          dbClusterTotal: 35,
          maxTotalCards: 100,
          exitoutCards: 3,
          difference: 10,
          isRealistic: true
        }),
        warnings: expect.objectContaining({
          highVenueCrowd: false,
          highDbTotal: false,
          hugeDifference: false
        })
      });
    });

    test('should detect warning conditions', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      getCurrentCrowd.mockResolvedValue(150); // High value
      
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_assigned: '200' }] })
        .mockResolvedValueOnce({ rows: [{ zone_code: 'CLUSTER1', current_count: '120' }] }) // High cluster count
        .mockResolvedValueOnce({ rows: [{ current_crowd: 150 }] });

      exitoutStackService.getStackStats.mockReturnValue({ totalCards: 5, totalTeams: 3 });

      // Act
      const response = await request(app)
        .get('/api/exitout/debug-totals');

      // Assert
      expect(response.body.warnings).toMatchObject({
        highVenueCrowd: true,
        highDbTotal: true,
        hugeDifference: false // 150 - 120 = 30, not > 50
      });
    });

    test('should handle debug-totals service errors', async () => {
      // Arrange
      const { getCurrentCrowd } = require('../../src/services/venueState');
      getCurrentCrowd.mockRejectedValue(new Error('Service unavailable'));

      // Act
      const response = await request(app)
        .get('/api/exitout/debug-totals');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to get debug totals',
        message: 'Service unavailable'
      });
    });
  });

  describe('POST /api/exitout/simulate-tap', () => {
    test('should simulate complete exitout tap with registration lookup', async () => {
      // Arrange
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ // log insertion
          rows: [{ 
            id: 1, 
            log_time: new Date(), 
            rfid_card_id: 'CARD123', 
            portal: 'EXITOUT', 
            label: 'EXITOUT' 
          }]
        })
        .mockResolvedValueOnce({ // registration lookup (no registrationId provided)
          rows: [{ registration_id: 'REG_FOUND' }]
        })
        .mockResolvedValueOnce({ // verification query
          rows: [{ 
            rfid_card_id: 'CARD123', 
            label: 'EXITOUT', 
            log_time: new Date() 
          }]
        });
      
      exitoutStackService.addToStack.mockResolvedValue({
        status: 'added',
        cardId: 'CARD123'
      });

      // Act
      const response = await request(app)
        .post('/api/exitout/simulate-tap')
        .send({ rfidCardId: 'CARD123' }); // No registrationId provided

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Simulated complete EXITOUT tap for CARD123',
        registrationId: 'REG_FOUND'
      });
    });

    test('should handle unknown card in simulate-tap', async () => {
      // Arrange
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, rfid_card_id: 'UNKNOWN_CARD' }] }) // log
        .mockResolvedValueOnce({ rows: [] }) // no registration found
        .mockResolvedValueOnce({ rows: [{ rfid_card_id: 'UNKNOWN_CARD' }] }); // verify
      
      exitoutStackService.addToStack.mockResolvedValue({ status: 'added' });

      // Act
      const response = await request(app)
        .post('/api/exitout/simulate-tap')
        .send({ rfidCardId: 'UNKNOWN_CARD' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.registrationId).toBe('UNKNOWN');
    });

    test('should validate rfidCardId in simulate-tap', async () => {
      // Act
      const response = await request(app)
        .post('/api/exitout/simulate-tap')
        .send({}); // Missing rfidCardId

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'RFID card ID is required in request body'
      });
    });

    test('should handle database errors in simulate-tap', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const response = await request(app)
        .post('/api/exitout/simulate-tap')
        .send({ rfidCardId: 'CARD123' });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to simulate EXITOUT tap',
        message: 'Database connection lost'
      });
    });
  });

  describe('GET /api/exitout/card-history/:cardId', () => {
    test('should return card tap history', async () => {
      // Arrange
      const cardId = 'CARD123';
      
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ // history query
          rows: [
            { log_time: new Date(), label: 'CLUSTER1', portal: 'reader1', log_id: 1, event_type: 'CLUSTER_VISIT' },
            { log_time: new Date(), label: 'EXITOUT', portal: 'EXITOUT', log_id: 2, event_type: 'EXIT' },
            { log_time: new Date(), label: 'REGISTER', portal: 'registration', log_id: 3, event_type: 'REGISTRATION' }
          ]
        })
        .mockResolvedValueOnce({ // card details query
          rows: [{
            rfid_card_id: 'CARD123',
            status: 'assigned',
            portal: 'reader1',
            card_created: new Date(),
            registration_id: 'REG_001',
            member_since: new Date(),
            team_name: 'Test Team',
            group_size: 3
          }]
        });

      // Act
      const response = await request(app)
        .get(`/api/exitout/card-history/${cardId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        cardId: 'CARD123',
        cardDetails: expect.objectContaining({
          rfid_card_id: 'CARD123',
          status: 'assigned',
          team_name: 'Test Team'
        }),
        statistics: expect.objectContaining({
          totalTaps: 3,
          clusterVisits: 1,
          registrations: 1,
          exits: 1
        }),
        clustersVisited: ['CLUSTER1']
      });
    });

    test('should handle card history with custom limit', async () => {
      // Arrange
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: Array(5).fill({ log_time: new Date(), label: 'CLUSTER1', event_type: 'CLUSTER_VISIT' }) })
        .mockResolvedValueOnce({ rows: [{ rfid_card_id: 'CARD123' }] });

      // Act
      const response = await request(app)
        .get('/api/exitout/card-history/CARD123?limit=5');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        limit: 5,
        returned: 5,
        hasMore: true
      });
    });

    test('should validate cardId parameter', async () => {
      // Act
      const response = await request(app)
        .get('/api/exitout/card-history/');

      // Assert
      expect(response.status).toBe(404); // Missing route parameter
    });

    test('should handle card history database errors', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockRejectedValue(new Error('History query failed'));

      // Act
      const response = await request(app)
        .get('/api/exitout/card-history/CARD123');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve card history',
        message: 'History query failed',
        cardId: 'CARD123'
      });
    });
  });

  // Add error handling tests for existing endpoints
  describe('Error handling for existing endpoints', () => {
    test('should handle GET /stack service errors', async () => {
      // Arrange
      exitoutStackService.getStack.mockImplementation(() => {
        throw new Error('Stack service unavailable');
      });

      // Act
      const response = await request(app)
        .get('/api/exitout/stack');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve exitout stack',
        message: 'Stack service unavailable'
      });
    });

    test('should handle POST /release transaction failure', async () => {
      // Arrange
      exitoutStackService.releaseAll.mockResolvedValue({
        status: 'transaction_failed',
        error: 'Database transaction rolled back',
        registrationId: 'REG_001'
      });

      // Act
      const response = await request(app)
        .post('/api/exitout/release/REG_001');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to release cards due to database error'
      });
    });

    test('should handle POST /release service exceptions', async () => {
      // Arrange
      exitoutStackService.releaseAll.mockRejectedValue(new Error('Release service failed'));

      // Act
      const response = await request(app)
        .post('/api/exitout/release/REG_001');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to release cards',
        message: 'Release service failed',
        registrationId: 'REG_001'
      });
    });

    test('should handle GET /stats service errors', async () => {
      // Arrange
      exitoutStackService.getStackStats.mockImplementation(() => {
        throw new Error('Stats calculation failed');
      });

      // Act
      const response = await request(app)
        .get('/api/exitout/stats');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve exitout statistics',
        message: 'Stats calculation failed'
      });
    });

    test('should handle POST /clear service errors', async () => {
      // Arrange
      exitoutStackService.clearStack.mockImplementation(() => {
        throw new Error('Clear operation failed');
      });

      // Act
      const response = await request(app)
        .post('/api/exitout/clear');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to clear exitout stack',
        message: 'Clear operation failed'
      });
    });

    test('should handle GET /team service errors', async () => {
      // Arrange
      exitoutStackService.getStack.mockImplementation(() => {
        throw new Error('Team lookup service failed');
      });

      // Act
      const response = await request(app)
        .get('/api/exitout/team/REG_001');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to retrieve team exitout stack',
        message: 'Team lookup service failed',
        registrationId: 'REG_001'
      });
    });

    test('should validate tagId in POST /simulate', async () => {
      // Act
      const response = await request(app)
        .post('/api/exitout/simulate/REG_001')
        .send({}); // Missing tagId

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Tag ID is required in request body'
      });
    });

    test('should handle POST /simulate service errors', async () => {
      // Arrange
      exitoutStackService.addToStack.mockRejectedValue(new Error('Simulation failed'));

      // Act
      const response = await request(app)
        .post('/api/exitout/simulate/REG_001')
        .send({ tagId: 'CARD123' });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to add card to exitout stack',
        message: 'Simulation failed'
      });
    });
  });
});