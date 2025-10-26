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
  });
});