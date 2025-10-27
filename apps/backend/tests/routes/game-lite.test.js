/**
 * Unit Tests for Game Lite Routes
 * Tests API endpoints for game lite functionality
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);
jest.mock('../../src/services/gameLiteService');
jest.mock('../../src/config/gameLiteConfig', () => ({
  getConfig: jest.fn(() => ({ enabled: true, rules: { minGroupSize: 1, maxGroupSize: 10, minPointsRequired: 3 } })),
  updateConfig: jest.fn((config) => ({ ...config, updated: true })),
  resetToDefault: jest.fn(() => ({ enabled: false, rules: {} })),
  getRule: jest.fn((rule, defaultValue) => {
    const rules = { minGroupSize: 1, maxGroupSize: 10, minPointsRequired: 3 };
    return rules[rule] || defaultValue;
  }),
  normalizeLabel: jest.fn(label => label ? label.toUpperCase() : '')
}));

const gameLiteRoutes = require('../../src/routes/gameLite');
const gameLiteService = require('../../src/services/gameLiteService');
const gameLiteConfig = require('../../src/config/gameLiteConfig');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/game-lite', gameLiteRoutes);

describe('Game Lite Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    delete process.env.GAMELITE_ADMIN_KEY;
  });

  describe('GET /api/game-lite/status', () => {
    test('should return game lite status', async () => {
      // Act
      const response = await request(app)
        .get('/api/game-lite/status');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.enabled).toBeDefined();
    });
  });

  describe('GET /api/game-lite/config', () => {
    test('should return game configuration', async () => {
      // Act
      const response = await request(app)
        .get('/api/game-lite/config');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.enabled).toBeDefined();
      expect(response.body.rules).toBeDefined();
    });
  });

  describe('GET /api/game-lite/team/:registrationId/score', () => {
    test('should return team score for valid registration ID', async () => {
      // Arrange
      const registrationId = '1';
      const mockTeamScore = {
        registration_id: 1,
        current_points: 10,
        total_members: 3
      };

      gameLiteService.getTeamScore.mockResolvedValue(mockTeamScore);

      // Act
      const response = await request(app)
        .get(`/api/game-lite/team/${registrationId}/score`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        registrationId: 1,
        score: mockTeamScore
      });
      expect(gameLiteService.getTeamScore).toHaveBeenCalledWith(parseInt(registrationId));
    });

    test('should handle team not found', async () => {
      // Arrange
      const registrationId = '999';
      gameLiteService.getTeamScore.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/game-lite/team/${registrationId}/score`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        registrationId: 999,
        score: null
      });
    });

    test('should handle invalid registration ID', async () => {
      // Arrange
      const registrationId = 'invalid';
      gameLiteService.getTeamScore.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/game-lite/team/${registrationId}/score`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        registrationId: null,
        score: null
      });
    });
  });

  describe('GET /api/game-lite/teams/scores', () => {
    test('should return all team scores', async () => {
      // Arrange
      const mockTeamScores = [
        { registration_id: 1, current_points: 10, total_members: 3 },
        { registration_id: 2, current_points: 15, total_members: 4 }
      ];

      global.testUtils.mockPool.query.mockResolvedValue({ rows: mockTeamScores });

      // Act
      const response = await request(app)
        .get('/api/game-lite/teams/scores');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeamScores);
    });

    test('should handle empty team scores', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await request(app)
        .get('/api/game-lite/teams/scores');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/game-lite/eligible-teams', () => {
    test('should return eligible teams successfully', async () => {
      // Arrange
      const mockEligibleTeams = [
        { registration_id: 1, team_name: 'Team Alpha', current_points: 10 },
        { registration_id: 2, team_name: 'Team Beta', current_points: 15 }
      ];

      global.testUtils.mockPool.query.mockResolvedValue({ rows: mockEligibleTeams });

      // Act
      const response = await request(app)
        .get('/api/game-lite/eligible-teams');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEligibleTeams);
    });

    test('should handle empty eligible teams list', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await request(app)
        .get('/api/game-lite/eligible-teams');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/game-lite/leaderboard', () => {
    test('should return leaderboard data', async () => {
      // Arrange
      const mockLeaderboard = [
        { registration_id: 2, team_name: 'Team Beta', current_points: 15 },
        { registration_id: 1, team_name: 'Team Alpha', current_points: 10 }
      ];

      global.testUtils.mockPool.query.mockResolvedValue({ rows: mockLeaderboard });

      // Act
      const response = await request(app)
        .get('/api/game-lite/leaderboard');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLeaderboard);
    });
  });

  describe('GET /api/game-lite/debug/score/:rfid', () => {
    test('should return debug score info for RFID', async () => {
      // Arrange
      const rfid = 'TEST123';
      const mockTeamId = 1;
      const mockScore = { registration_id: 1, current_points: 10 };

      gameLiteService.getTeamIdForRfid.mockResolvedValue(mockTeamId);
      gameLiteService.getTeamScore.mockResolvedValue(mockScore);

      // Act
      const response = await request(app)
        .get(`/api/game-lite/debug/score/${rfid}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.teamId).toBe(mockTeamId);
      expect(response.body.score).toEqual(mockScore);
    });

    test('should handle RFID not found', async () => {
      // Arrange
      const rfid = 'NOTFOUND';
      gameLiteService.getTeamIdForRfid.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/game-lite/debug/score/${rfid}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('RFID not in team');
    });
  });

  describe('GET /api/game-lite/debug/visits/:rfid', () => {
    test('should return debug visit info for RFID', async () => {
      // Arrange
      const rfid = 'TEST123';
      const mockVisitData = {
        member_id: 101,
        team_id: 1,
        cluster_visits: { CLUSTER1: '2023-01-01', CLUSTER2: '2023-01-02' }
      };

      global.testUtils.mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockVisitData]
      });

      // Act
      const response = await request(app)
        .get(`/api/game-lite/debug/visits/${rfid}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockVisitData);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id as member_id, registration_id as team_id, cluster_visits FROM members WHERE rfid_card_id = $1'),
        [rfid]
      );
    });

    test('should handle RFID not found for visits', async () => {
      // Arrange
      const rfid = 'NOTFOUND';
      global.testUtils.mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

      // Act
      const response = await request(app)
        .get(`/api/game-lite/debug/visits/${rfid}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('RFID not found');
    });

    test('should handle database error for visits', async () => {
      // Arrange
      const rfid = 'TEST123';
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Database error'));

      // Act
      const response = await request(app)
        .get(`/api/game-lite/debug/visits/${rfid}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/game-lite/leaderboard with limits', () => {
    test('should respect custom limit parameter', async () => {
      // Arrange
      const mockLeaderboard = Array.from({ length: 5 }, (_, i) => ({
        registration_id: i + 1,
        score: 100 - (i * 10)
      }));

      global.testUtils.mockPool.query.mockResolvedValue({ rows: mockLeaderboard });

      // Act
      const response = await request(app)
        .get('/api/game-lite/leaderboard?limit=5');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });

    test('should enforce maximum limit of 1000', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await request(app)
        .get('/api/game-lite/leaderboard?limit=9999');

      // Assert
      expect(response.status).toBe(200);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [1000] // Should be capped at 1000
      );
    });

    test('should use default limit of 10', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await request(app)
        .get('/api/game-lite/leaderboard');

      // Assert
      expect(response.status).toBe(200);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [10]
      );
    });
  });

  describe('Error handling', () => {
    test('should handle service errors for team score', async () => {
      // Arrange
      const registrationId = '1';
      gameLiteService.getTeamScore.mockRejectedValue(new Error('Service error'));

      // Act
      const response = await request(app)
        .get(`/api/game-lite/team/${registrationId}/score`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service error');
    });

    test('should handle database errors for teams scores', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .get('/api/game-lite/teams/scores');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database connection failed');
    });

    test('should handle database errors for eligible teams', async () => {
      // Arrange
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Complex query failed'));

      // Act
      const response = await request(app)
        .get('/api/game-lite/eligible-teams');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Complex query failed');
    });

    test('should handle service errors for debug score', async () => {
      // Arrange
      const rfid = 'TEST123';
      gameLiteService.getTeamIdForRfid.mockRejectedValue(new Error('RFID lookup failed'));

      // Act
      const response = await request(app)
        .get(`/api/game-lite/debug/score/${rfid}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('RFID lookup failed');
    });
  });

  describe('Admin endpoints', () => {
    beforeEach(() => {
      process.env.GAMELITE_ADMIN_KEY = 'test-admin-key';
    });

    describe('POST /api/game-lite/config', () => {
      test('should update config with valid admin key', async () => {
        // Arrange
        const configUpdate = { enabled: true, rules: { newRule: 'value' } };
        const expectedResponse = { ...configUpdate, updated: true };

        // Act
        const response = await request(app)
          .post('/api/game-lite/config')
          .set('x-admin-key', 'test-admin-key')
          .send(configUpdate);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(expectedResponse);
        expect(gameLiteConfig.updateConfig).toHaveBeenCalledWith(configUpdate);
      });

      test('should reject config update without admin key', async () => {
        // Arrange
        const configUpdate = { enabled: false };

        // Act
        const response = await request(app)
          .post('/api/game-lite/config')
          .send(configUpdate);

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      });

      test('should reject config update with wrong admin key', async () => {
        // Arrange
        const configUpdate = { enabled: false };

        // Act
        const response = await request(app)
          .post('/api/game-lite/config')
          .set('x-admin-key', 'wrong-key')
          .send(configUpdate);

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      });
    });

    describe('POST /api/game-lite/config/reset', () => {
      test('should reset config with valid admin key', async () => {
        // Arrange
        const expectedResponse = { enabled: false, rules: {} };

        // Act
        const response = await request(app)
          .post('/api/game-lite/config/reset')
          .set('x-admin-key', 'test-admin-key');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(expectedResponse);
        expect(gameLiteConfig.resetToDefault).toHaveBeenCalled();
      });

      test('should reject config reset without admin key', async () => {
        // Act
        const response = await request(app)
          .post('/api/game-lite/config/reset');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      });
    });

    describe('POST /api/game-lite/redeem', () => {
      test('should redeem points with valid admin key', async () => {
        // Arrange
        const redeemRequest = {
          registrationId: 1,
          clusterLabel: 'cluster1',
          redeemedBy: 'admin'
        };
        const mockResult = { ok: true, pointsSpent: 20 };

        gameLiteService.redeemPoints.mockResolvedValue(mockResult);

        // Act
        const response = await request(app)
          .post('/api/game-lite/redeem')
          .set('x-admin-key', 'test-admin-key')
          .send(redeemRequest);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockResult);
        expect(gameLiteService.redeemPoints).toHaveBeenCalledWith({
          registrationId: 1,
          clusterLabel: 'CLUSTER1', // normalized
          redeemedBy: 'admin'
        });
      });

      test('should reject redemption with missing fields', async () => {
        // Arrange
        const invalidRequest = { registrationId: 1 }; // missing clusterLabel

        // Act
        const response = await request(app)
          .post('/api/game-lite/redeem')
          .set('x-admin-key', 'test-admin-key')
          .send(invalidRequest);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('registrationId and clusterLabel required');
      });

      test('should handle redemption service errors', async () => {
        // Arrange
        const redeemRequest = {
          registrationId: 1,
          clusterLabel: 'cluster1'
        };

        gameLiteService.redeemPoints.mockRejectedValue(new Error('Insufficient points'));

        // Act
        const response = await request(app)
          .post('/api/game-lite/redeem')
          .set('x-admin-key', 'test-admin-key')
          .send(redeemRequest);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Insufficient points');
      });

      test('should reject redemption without admin key', async () => {
        // Arrange
        const redeemRequest = {
          registrationId: 1,
          clusterLabel: 'cluster1'
        };

        // Act
        const response = await request(app)
          .post('/api/game-lite/redeem')
          .send(redeemRequest);

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      });
    });

    describe('POST /api/game-lite/admin/init', () => {
      test('should return schema message with admin key', async () => {
        // Act
        const response = await request(app)
          .post('/api/game-lite/admin/init')
          .set('x-admin-key', 'test-admin-key');

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          ok: true,
          message: 'Schema managed via Database/schema.sql'
        });
      });

      test('should reject admin init without admin key', async () => {
        // Act
        const response = await request(app)
          .post('/api/game-lite/admin/init');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
      });
    });
  });

  describe('Admin middleware edge cases', () => {
    test('should reject when admin key not configured', async () => {
      // Arrange - No admin key set
      delete process.env.GAMELITE_ADMIN_KEY;

      // Act
      const response = await request(app)
        .post('/api/game-lite/config')
        .send({ enabled: true });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin key not configured');
    });
  });
});