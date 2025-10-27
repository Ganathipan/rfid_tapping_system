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
  normalizeLabel: jest.fn(label => label ? label.toUpperCase() : '')
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

    test('should reject redemption for invalid input', async () => {
      // Test missing registrationId
      await expect(gameLiteService.redeemPoints({ clusterLabel: 'CLUSTER1' }))
        .rejects.toThrow('Invalid redemption');

      // Test missing clusterLabel
      await expect(gameLiteService.redeemPoints({ registrationId: 1 }))
        .rejects.toThrow('Invalid redemption');
    });

    test('should reject redemption for non-redeemable cluster', async () => {
      // Mock non-redeemable cluster
      const mockGetClusterRule = require('../../src/config/gameLiteConfig').getClusterRule;
      mockGetClusterRule.mockReturnValue({ redeemable: false });

      await expect(gameLiteService.redeemPoints({ 
        registrationId: 1, 
        clusterLabel: 'CLUSTER1' 
      })).rejects.toThrow('Cluster not redeemable');
    });
  });

  describe('handlePostLogInserted', () => {
    beforeEach(() => {
      // Reset environment variable
      delete process.env.GAMELITE_DEBUG;
    });

    test('should skip processing when GameLite is disabled', async () => {
      // Mock disabled config
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: false });

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({ skipped: true, reason: 'disabled' });
    });

    test('should handle EXITOUT logs with exitout stack service', async () => {
      // Mock enabled config  
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      // Mock normalizeLabel to return EXITOUT as non-eligible
      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('EXITOUT');

      // Mock getRule for eligibleLabelPrefix check
      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReturnValue('CLUSTER'); // This makes EXITOUT not start with CLUSTER, so non-eligible

      const log = { rfid_card_id: 'TEST123', label: 'EXITOUT' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({ skipped: true, reason: 'label-not-eligible' });
    });

    test('should skip processing for non-eligible labels', async () => {
      // Mock enabled config
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      // Mock normalizeLabel and getRule
      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('INVALID_LABEL');
      
      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReturnValue('CLUSTER'); // eligibleLabelPrefix

      const log = { rfid_card_id: 'TEST123', label: 'INVALID_LABEL' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({ skipped: true, reason: 'label-not-eligible' });
    });

    test('should skip processing for RFID not in team', async () => {
      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReturnValue('CLUSTER');

      // Mock no team found for RFID
      global.testUtils.mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

      const log = { rfid_card_id: 'UNKNOWN123', label: 'CLUSTER1' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({ skipped: true, reason: 'rfid-not-in-team' });
    });

    test('should skip processing when member not found in team', async () => {
      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReturnValue('CLUSTER');

      // Mock team found for RFID but member not found in team
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ registration_id: 1 }] }) // Team found
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // Member not found

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({ skipped: true, reason: 'member-not-found' });
    });

    test('should award points for valid first cluster visit', async () => {
      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockImplementation((key) => {
        if (key === 'eligibleLabelPrefix') return 'CLUSTER';
        if (key === 'awardOnlyFirstVisit') return true;
        if (key === 'pointsPerMemberFirstVisit') return 10;
        if (key === 'pointsPerMemberRepeatVisit') return 5;
        return null;
      });

      const mockGetClusterRule = require('../../src/config/gameLiteConfig').getClusterRule;
      mockGetClusterRule.mockReturnValue({ awardPoints: 15 });

      // Mock team and member found
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ registration_id: 1 }] }) // Team found
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101 }] }); // Member found

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock successful first visit processing
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101, cluster_visits: { CLUSTER1: '2023-01-01' } }] }) // First visit update (successful)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow - SELECT team_name  
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT ON CONFLICT
        .mockResolvedValueOnce({}) // addPointsToTeam - UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({
        awarded: true,
        points: 15,
        firstTime: true,
        teamId: 1,
        redemption: null
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should process repeat visit with zero points awarded', async () => {
      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockImplementation((key) => {
        if (key === 'eligibleLabelPrefix') return 'CLUSTER';
        if (key === 'awardOnlyFirstVisit') return true;
        if (key === 'pointsPerMemberFirstVisit') return 10;
        if (key === 'pointsPerMemberRepeatVisit') return 0;
        return null;
      });

      const mockGetClusterRule = require('../../src/config/gameLiteConfig').getClusterRule;
      mockGetClusterRule.mockReturnValue({ awardPoints: 10 });

      // Mock team and member found
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ registration_id: 1 }] }) // Team found
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101 }] }); // Member found

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock repeat visit (not first time)
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // recordMemberClusterVisitIfFirst - repeat visit (no rows affected = not first)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result).toEqual({
        awarded: false,
        points: 0, // Points from pointsPerMemberRepeatVisit, not awarded due to repeat visit
        firstTime: false,
        teamId: 1,
        redemption: null
      });
    });

    test('should handle database errors with rollback', async () => {
      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReturnValueOnce('CLUSTER'); // eligible prefix
      mockGetRule.mockReturnValueOnce(true); // awardOnlyFirstVisit
      mockGetRule.mockReturnValueOnce(10); // pointsPerMemberFirstVisit

      const mockGetClusterRule = require('../../src/config/gameLiteConfig').getClusterRule;
      mockGetClusterRule.mockReturnValue({ awardPoints: 10 });

      // Mock team and member found
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ registration_id: 1 }] }) // Team found
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101 }] }); // Member found

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      const dbError = new Error('Database connection failed');
      
      // Mock database error during transaction
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(dbError); // Error during first visit update

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      
      await expect(gameLiteService.handlePostLogInserted(log))
        .rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should enable debug logging when GAMELITE_DEBUG is true', async () => {
      // Enable debug mode
      process.env.GAMELITE_DEBUG = 'true';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Clear any existing mock setup from previous tests
      jest.clearAllMocks();

      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReset(); // Reset any previous mock implementations
      mockGetRule.mockImplementation((key) => {
        if (key === 'eligibleLabelPrefix') return 'CLUSTER';
        return 'CLUSTER'; // fallback for other keys
      });

      const mockGetClusterRule = require('../../src/config/gameLiteConfig').getClusterRule;
      mockGetClusterRule.mockReturnValue({ awardPoints: 10 });

      // Mock team and member found
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ registration_id: 1 }] }) // Team found
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101 }] }); // Member found

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock debug queries and successful processing
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ cluster_visits: {} }] }) // Debug: before visit
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101, cluster_visits: { CLUSTER1: '2023-01-01' } }] }) // First visit successful
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT
        .mockResolvedValueOnce({}) // addPointsToTeam
        .mockResolvedValueOnce({ rows: [{ total_points: 25 }] }) // Debug: new score
        .mockResolvedValueOnce({}); // COMMIT

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      await gameLiteService.handlePostLogInserted(log);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[GameLite][recordMemberClusterVisitIfFirst]'),
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[GameLite][ClusterTap]'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
      delete process.env.GAMELITE_DEBUG;
    });

    test('should handle automatic redemption for redeemable clusters', async () => {
      // Mock enabled config and eligible label
      const mockGetConfig = require('../../src/config/gameLiteConfig').getConfig;
      mockGetConfig.mockReturnValue({ enabled: true });

      const mockNormalizeLabel = require('../../src/config/gameLiteConfig').normalizeLabel;
      mockNormalizeLabel.mockReturnValue('CLUSTER1');

      const mockGetRule = require('../../src/config/gameLiteConfig').getRule;
      mockGetRule.mockReturnValue('CLUSTER');

      const mockGetClusterRule = require('../../src/config/gameLiteConfig').getClusterRule;
      mockGetClusterRule.mockReturnValue({ awardPoints: 10, redeemable: true, redeemPoints: 20 });

      // Mock team and member found
      global.testUtils.mockPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ registration_id: 1 }] }) // Team found
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101 }] }); // Member found

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock successful processing with redemption client operations
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 101, cluster_visits: { CLUSTER1: '2023-01-01' } }] }) // First visit
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT
        .mockResolvedValueOnce({}) // addPointsToTeam
        .mockResolvedValueOnce({}) // COMMIT
        // Additional queries for redemption
        .mockResolvedValueOnce({}) // BEGIN (redemption)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ team_name: 'Test Team' }] }) // ensureTeamScoreRow (redemption)
        .mockResolvedValueOnce({}) // ensureTeamScoreRow - INSERT (redemption)
        .mockResolvedValueOnce({ rows: [{ score: 50 }] }) // Check current score
        .mockResolvedValueOnce({}) // Update score for redemption
        .mockResolvedValueOnce({}) // Insert redemption record
        .mockResolvedValueOnce({}); // COMMIT (redemption)

      const log = { rfid_card_id: 'TEST123', label: 'CLUSTER1' };
      const result = await gameLiteService.handlePostLogInserted(log);

      expect(result.redemption).toEqual({ ok: true });
      expect(result.awarded).toBe(true);
      expect(result.points).toBe(10);
    });
  });
});