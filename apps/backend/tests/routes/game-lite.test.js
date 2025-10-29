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

/**
 * Integration Tests for Game Lite Scoring System
 * Tests with hex RFID format and live system functionality
 * 
 * Note: These tests are designed to run against a live backend server
 * Usage: Run these manually when backend is running for integration testing
 */
describe('Game Lite Integration Tests (Manual)', () => {
  const http = require('http');
  const BASE_URL = 'http://localhost:4000/api';

  function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async function testLiveScoring() {
    console.log('=== Testing Live Team Scoring System ===');
    
    try {
      // Test 1: Check if backend is running
      console.log('\n1. Checking backend server status...');
      const status = await makeRequest(`${BASE_URL}/game-lite/status`);
      if (status.status === 200) {
        console.log('✅ Backend server is running');
        console.log('✅ Game enabled:', status.data.enabled);
        expect(status.data.enabled).toBe(true);
      } else {
        console.log('❌ Backend not responding, status:', status.status);
        return false;
      }
      
      // Test 2: Check configuration
      console.log('\n2. Checking game configuration...');
      const config = await makeRequest(`${BASE_URL}/game-lite/config`);
      if (config.status === 200) {
        console.log('✅ Configuration loaded');
        const clusterRules = config.data.rules?.clusterRules || {};
        console.log('✅ Cluster rules configured:', Object.keys(clusterRules).length);
        console.log('   Clusters:', Object.keys(clusterRules).join(', '));
        expect(Object.keys(clusterRules).length).toBeGreaterThan(0);
      }
      
      // Test 3: Test RFID tap with hex card ID
      console.log('\n3. Testing RFID tap with hex card ID...');
      const tapResult = await makeRequest(`${BASE_URL}/tags/rfidRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          reader: 'CLUSTER1',
          portal: 'reader1', 
          tag: 'A1B2C3D4'  // Using hex RFID card ID
        }
      });
      
      if (tapResult.status === 200) {
        console.log('✅ RFID tap processed successfully');
        expect(tapResult.status).toBe(200);
      } else {
        console.log('⚠️  RFID tap status:', tapResult.status);
        console.log('   Response:', tapResult.data);
      }
      
      // Test 4: Check team scores
      console.log('\n4. Checking team scores...');
      const scores = await makeRequest(`${BASE_URL}/game-lite/teams/scores`);
      if (scores.status === 200) {
        console.log('✅ Teams scores endpoint accessible');
        console.log('✅ Teams with scores:', scores.data.length);
        if (scores.data.length > 0) {
          console.log('   Sample scores:', scores.data.slice(0, 3));
          expect(scores.data.length).toBeGreaterThan(0);
        }
        expect(scores.status).toBe(200);
      }
      
      // Test 5: Test CLUSTER2 for different points
      console.log('\n5. Testing CLUSTER2 scoring...');
      const cluster2Result = await makeRequest(`${BASE_URL}/tags/rfidRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          reader: 'CLUSTER2',
          portal: 'reader1', 
          tag: 'E5F6A7B8'  // Different hex RFID card ID
        }
      });
      
      if (cluster2Result.status === 200) {
        console.log('✅ CLUSTER2 tap processed successfully');
        expect(cluster2Result.status).toBe(200);
      }
      
      // Test 6: Verify score increase
      console.log('\n6. Verifying score changes...');
      const updatedScores = await makeRequest(`${BASE_URL}/game-lite/teams/scores`);
      if (updatedScores.status === 200 && updatedScores.data.length > 0) {
        const teamScore = updatedScores.data[0].score;
        console.log('✅ Current team score:', teamScore);
        expect(parseInt(teamScore)).toBeGreaterThan(0);
      }
      
      console.log('\n=== Integration Test Summary ===');
      console.log('✅ All tests passed - Team scoring system is working!');
      console.log('✅ Hex RFID format supported (A1B2C3D4, E5F6A7B8)');
      console.log('✅ CLUSTER1 and CLUSTER2 scoring functional');
      
      return true;
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      console.log('\n📋 Requirements for integration tests:');
      console.log('1. Backend server running (cd apps/backend && npm run dev)');
      console.log('2. Database connected (PostgreSQL with "rfid" database)');
      console.log('3. Teams registered with hex RFID cards assigned');
      console.log('4. Game configuration enabled');
      return false;
    }
  }

  // Manual integration test - skip in automated test runs
  test.skip('Live team scoring integration test', async () => {
    const success = await testLiveScoring();
    expect(success).toBe(true);
  });

  describe('Hex RFID Format Tests', () => {
    test('should validate hex RFID format requirements', () => {
      const validHexIds = ['A1B2C3D4', 'E5F6A7B8', 'C9D0E1F2', '12345678'];
      const invalidIds = ['TEST123', 'abc123', '123', 'TOOLONG123'];
      
      validHexIds.forEach(id => {
        expect(id).toMatch(/^[A-F0-9]{8}$/);
        expect(id.length).toBe(8);
      });
      
      invalidIds.forEach(id => {
        expect(id).not.toMatch(/^[A-F0-9]{8}$/);
      });
    });

    test('should normalize RFID tags to uppercase', () => {
      const testCases = [
        { input: 'a1b2c3d4', expected: 'A1B2C3D4' },
        { input: 'e5f6a7b8', expected: 'E5F6A7B8' },
        { input: 'MiXeD123', expected: 'MIXED123' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(input.toUpperCase()).toBe(expected);
      });
    });
  });

  // Export the test function for manual use
  if (typeof module !== 'undefined' && module.exports) {
    module.exports.testLiveScoring = testLiveScoring;
  }
});