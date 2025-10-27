/**
 * Unit Tests for Analytics Controller
 * Tests analytics data aggregation and processing
 * Focus on error handling and basic functionality verification
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);

// Mock gameLiteConfigStore
jest.mock('../../src/config/gameLiteConfigStore', () => ({
  loadSync: jest.fn(() => null),
  saveSync: jest.fn(),
  STORE_FILE: '/mock/path/gameLite.config.json'
}));

// Mock gameLiteConfig
const mockGetConfig = jest.fn(() => ({
  enabled: true,
  rules: {
    eligibleLabelPrefix: 'CLUSTER',
    pointsPerMemberFirstVisit: 1,
    pointsPerMemberRepeatVisit: 0,
    awardOnlyFirstVisit: true,
    minGroupSize: 1,
    maxGroupSize: 9999,
    minPointsRequired: 3,
    clusterRules: {
      CLUSTER1: { awardPoints: 1, redeemable: true, redeemPoints: 1 },
      CLUSTER2: { awardPoints: 1, redeemable: true, redeemPoints: 1 }
    }
  }
}));

jest.mock('../../src/config/gameLiteConfig', () => ({
  getConfig: mockGetConfig
}));

const analyticsController = require('../../src/services/analyticsController');

describe('AnalyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Structure', () => {
    test('should export required functions', () => {
      // Test that the module exports the expected functions
      expect(typeof analyticsController.getLiveAnalytics).toBe('function');
      expect(typeof analyticsController.getRangeAnalytics).toBe('function');
    });
  });

  describe('getLiveAnalytics', () => {
    test('should return successful live analytics with default 24h window', async () => {
      // Mock successful database responses
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            active_cards: 15,
            total_unique_cards: 25,
            avg_session_duration_secs: 1800,
            avg_active_session_age_secs: 900,
            latest_register_events: 20,
            latest_exit_events: 5
          }]
        })
        .mockResolvedValueOnce({
          rows: [
            { label: 'CLUSTER1', visitor_count: 8 },
            { label: 'CLUSTER2', visitor_count: 7 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }); // reader_config query

      const mockReq = { query: {} };
      const mockRes = {
        json: jest.fn()
      };

      await analyticsController.getLiveAnalytics(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        mode: 'live',
        window_hours: 24,
        generated_at: expect.any(String),
        venue_total: 15,
        active_cards: 15,
        total_unique_cards: 25,
        average_session_duration_secs: 1800,
        average_active_session_age_secs: 900,
        clusters: expect.arrayContaining([
          { id: 1, zone: 'zone1', visitors: 8 },
          { id: 2, zone: 'zone2', visitors: 7 }
        ])
      });
    });

    test('should handle custom window hours with clamping', async () => {
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const mockReq = { query: { window_hours: '100' } }; // Should clamp to 72
      const mockRes = {
        json: jest.fn()
      };

      await analyticsController.getLiveAnalytics(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        window_hours: 72
      }));
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Act
      await analyticsController.getLiveAnalytics(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'failed to compute live analytics'
      });
    });
  });

  describe('getRangeAnalytics', () => {
    test('should return successful range analytics with valid dates', async () => {
      const fromDate = '2024-01-01T00:00:00Z';
      const toDate = '2024-01-02T00:00:00Z';

      global.testUtils.mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_unique_cards: 30,
            active_cards: 12,
            avg_session_duration_secs: 2100,
            avg_active_session_age_secs: 600
          }]
        })
        .mockResolvedValueOnce({
          rows: [
            { label: 'CLUSTER1', visitor_count: 5 },
            { label: 'CLUSTER3', visitor_count: 7 }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }); // reader_config query

      const mockReq = { 
        query: { 
          from: fromDate,
          to: toDate 
        } 
      };
      const mockRes = {
        json: jest.fn()
      };

      await analyticsController.getRangeAnalytics(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        mode: 'range',
        from: expect.stringMatching(/^2024-01-01T00:00:00/),
        to: expect.stringMatching(/^2024-01-02T00:00:00/),
        generated_at: expect.any(String),
        venue_total: 12,
        active_cards: 12,
        total_unique_cards: 30,
        average_session_duration_secs: 2100,
        average_active_session_age_secs: 600,
        clusters: expect.arrayContaining([
          expect.objectContaining({ id: 1, zone: 'zone1', visitors: 5 }),
          expect.objectContaining({ id: 3, zone: 'zone3', visitors: 7 })
        ])
      });
    });

    test('should handle epoch timestamp dates', async () => {
      const fromEpoch = '1704067200000'; // 2024-01-01T00:00:00Z as epoch
      const toEpoch = '1704153600000';   // 2024-01-02T00:00:00Z as epoch

      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const mockReq = { 
        query: { 
          from: fromEpoch,
          to: toEpoch 
        } 
      };
      const mockRes = {
        json: jest.fn()
      };

      await analyticsController.getRangeAnalytics(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'range',
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-02T00:00:00.000Z'
      }));
    });

    test('should handle missing date parameters', async () => {
      // Arrange
      const mockReq = { query: {} };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Act
      await analyticsController.getRangeAnalytics(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'invalid from/to range'
      });
    });

    test('should handle invalid date parameters', async () => {
      // Arrange
      const mockReq = { 
        query: { 
          from: 'invalid-date',
          to: 'also-invalid' 
        } 
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Act
      await analyticsController.getRangeAnalytics(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'invalid from/to range'
      });
    });

    test('should handle reversed date range', async () => {
      const fromDate = '2024-01-02T00:00:00Z';
      const toDate = '2024-01-01T00:00:00Z'; // Earlier than from

      const mockReq = { 
        query: { 
          from: fromDate,
          to: toDate 
        } 
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await analyticsController.getRangeAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'invalid from/to range'
      });
    });

    test('should handle database errors gracefully', async () => {
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Database query failed'));

      const mockReq = { 
        query: { 
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-02T00:00:00Z' 
        } 
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await analyticsController.getRangeAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'failed to compute range analytics'
      });
    });
  });

  describe('Alternative Testing Approaches', () => {
    test('should have proper function signatures', () => {
      // Test function arity (parameter count)
      expect(analyticsController.getLiveAnalytics.length).toBe(2); // req, res
      expect(analyticsController.getRangeAnalytics.length).toBe(2); // req, res
    });

    test('should be part of a cohesive module', () => {
      // Test that the functions exist and are part of the same module
      const exports = Object.keys(analyticsController);
      expect(exports).toContain('getLiveAnalytics');
      expect(exports).toContain('getRangeAnalytics');
      expect(exports.length).toBe(2); // Only these two functions should be exported
    });

    test('should handle basic request/response pattern', () => {
      // Test that functions can be called without throwing synchronous errors
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // These should not throw synchronous errors
      expect(() => {
        analyticsController.getLiveAnalytics(mockReq, mockRes);
      }).not.toThrow();

      expect(() => {
        analyticsController.getRangeAnalytics(mockReq, mockRes);
      }).not.toThrow();
    });
  });
});