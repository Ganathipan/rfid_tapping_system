/**
 * Unit Tests for Game Lite Service
 * Tests core game logic and scoring functionality
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);
jest.mock('../../src/services/exitoutStackService', () => ({
  removeFromExitStack: jest.fn()
}));
jest.mock('../../src/config/gameLiteConfig', () => ({
  getConfig: jest.fn(),
  getRule: jest.fn(),
  getClusterRule: jest.fn(() => ({
    redeemable: true,
    redeemPoints: 20
  })),
  normalizeLabel: jest.fn(label => label.toUpperCase())
}));

const gameLiteService = require('../../src/services/gameLiteService');

describe('GameLiteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTeamIdForRfid', () => {
    test('should return team registration ID for valid RFID', async () => {
      // Arrange
      const rfidCardId = 'TEST123';
      const mockMember = {
        registration_id: 1
      };

      global.testUtils.mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockMember]
      });

      // Act
      const result = await gameLiteService.getTeamIdForRfid(rfidCardId);

      // Assert
      expect(result).toBe(1);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT registration_id FROM members'),
        [rfidCardId]
      );
    });

    test('should return null for non-existent RFID', async () => {
      // Arrange
      const rfidCardId = 'NONEXISTENT';
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await gameLiteService.getTeamIdForRfid(rfidCardId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getMemberIdsForTeam', () => {
    test('should return RFID card IDs for valid team', async () => {
      // Arrange
      const registrationId = 1;
      const mockMembers = [
        { rfid_card_id: 'CARD001' },
        { rfid_card_id: 'CARD002' },
        { rfid_card_id: 'CARD003' }
      ];

      global.testUtils.mockPool.query.mockResolvedValue({
        rows: mockMembers
      });

      // Act
      const result = await gameLiteService.getMemberIdsForTeam(registrationId);

      // Assert
      expect(result).toEqual(['CARD001', 'CARD002', 'CARD003']);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT rfid_card_id FROM members'),
        [registrationId]
      );
    });

    test('should return empty array for team with no members', async () => {
      // Arrange
      const registrationId = 999;
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await gameLiteService.getMemberIdsForTeam(registrationId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getTeamScore', () => {
    test('should return team score for valid registration ID', async () => {
      // Arrange
      const registrationId = 1;
      const mockScore = {
        score: 45
      };

      global.testUtils.mockPool.query.mockResolvedValue({
        rowCount: 1,
        rows: [mockScore]
      });

      // Act
      const result = await gameLiteService.getTeamScore(registrationId);

      // Assert
      expect(result).toBe(45);
      expect(global.testUtils.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT total_points as score FROM team_scores_lite'),
        [registrationId]
      );
    });

    test('should return 0 for non-existent team', async () => {
      // Arrange
      const registrationId = 999;
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await gameLiteService.getTeamScore(registrationId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('redeemPoints', () => {
    test('should successfully redeem points for eligible team', async () => {
      // Arrange
      const redemptionData = {
        registrationId: 1,
        clusterLabel: 'CLUSTER1',
        points: 20,
        redeemedBy: 'admin'
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock team score check - team has sufficient points
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow - SELECT team_name
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT ON CONFLICT
        .mockResolvedValueOnce({ rows: [{ score: 50 }] }) // Check current points FOR UPDATE
        .mockResolvedValueOnce({}) // Update team score - subtract points
        .mockResolvedValueOnce({}) // Insert redemption record
        .mockResolvedValueOnce({}); // COMMIT

      // Act
      const result = await gameLiteService.redeemPoints(redemptionData);

      // Assert
      expect(result.ok).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT total_points as score FROM team_scores_lite'),
        [redemptionData.registrationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should reject redemption for insufficient points', async () => {
      // Arrange
      const redemptionData = {
        registrationId: 1,
        clusterLabel: 'CLUSTER1',
        points: 100, // More than available
        redeemedBy: 'admin'
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock team score check - team has insufficient points  
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow - SELECT team_name
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT ON CONFLICT
        .mockResolvedValueOnce({ rows: [{ score: 10 }] }); // Check current points - insufficient (10 < 100)

      // Act & Assert
      await expect(gameLiteService.redeemPoints(redemptionData))
        .rejects.toThrow('Insufficient points');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});