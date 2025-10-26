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