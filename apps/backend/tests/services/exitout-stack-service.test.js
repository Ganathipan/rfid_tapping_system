/**
 * Unit Tests for Exit Out Stack Service
 * Tests card lifecycle management and exit tracking
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);
jest.mock('../../src/services/venueState', () => ({
  decCrowd: jest.fn().mockResolvedValue(45),
  getCurrentCrowd: jest.fn().mockResolvedValue(45)
}));

const exitoutStackService = require('../../src/services/exitoutStackService');

describe('ExitoutStackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the internal stack between tests
    exitoutStackService.clearStack();
  });

  describe('addToStack', () => {
    test('should successfully add card to exit stack', async () => {
      // Arrange
      const registrationId = '1';
      const tagId = 'TEST123';

      // Act
      const result = await exitoutStackService.addToStack(registrationId, tagId);

      // Assert
      expect(result.registrationId).toBe(registrationId);
      expect(result.tagId).toBe(tagId);
      expect(result.stackSize).toBe(1);
      expect(result.timestamp).toBeDefined();
    });

    test('should handle duplicate card in stack', async () => {
      // Arrange
      const registrationId = '1';
      const tagId = 'TEST123';

      // Add card first time
      await exitoutStackService.addToStack(registrationId, tagId);

      // Act - Try to add same card again
      const duplicateResult = await exitoutStackService.addToStack(registrationId, tagId);

      // Assert
      expect(duplicateResult.alreadyInStack).toBe(true);
      expect(duplicateResult.stackSize).toBe(1); // Should not increase
    });

    test('should add multiple cards to same team stack', async () => {
      // Arrange
      const registrationId = '1';
      const tagId1 = 'TEST123';
      const tagId2 = 'TEST456';

      // Act
      const result1 = await exitoutStackService.addToStack(registrationId, tagId1);
      const result2 = await exitoutStackService.addToStack(registrationId, tagId2);

      // Assert
      expect(result1.stackSize).toBe(1);
      expect(result2.stackSize).toBe(2);
    });
  });

  describe('getStack', () => {
    test('should return all cards currently in exit stack', async () => {
      // Arrange
      const registrationId1 = '1';
      const registrationId2 = '2';
      await exitoutStackService.addToStack(registrationId1, 'CARD1');
      await exitoutStackService.addToStack(registrationId1, 'CARD2');
      await exitoutStackService.addToStack(registrationId2, 'CARD3');

      // Act
      const result = await exitoutStackService.getStack();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        registrationId: registrationId1,
        cardCount: 2,
        cards: expect.arrayContaining(['CARD1', 'CARD2'])
      });
      expect(result[1]).toMatchObject({
        registrationId: registrationId2,
        cardCount: 1,
        cards: ['CARD3']
      });
    });

    test('should return empty array when no cards in exit stack', async () => {
      // Act
      const result = await exitoutStackService.getStack();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('releaseAll', () => {
    test('should release all cards for a team', async () => {
      // Arrange
      const registrationId = '1';
      const tagId1 = 'TEST123';
      const tagId2 = 'TEST456';
      
      // Mock database operations for release
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [] });

      await exitoutStackService.addToStack(registrationId, tagId1);
      await exitoutStackService.addToStack(registrationId, tagId2);

      // Act
      const result = await exitoutStackService.releaseAll(registrationId);

      // Assert
      expect(result.registrationId).toBe(registrationId);
      expect(result.released).toBe(2);
      expect(result.status).toBe('completed');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle team with no cards in stack', async () => {
      // Arrange
      const registrationId = '999';

      // Act
      const result = await exitoutStackService.releaseAll(registrationId);

      // Assert
      expect(result.registrationId).toBe(registrationId);
      expect(result.released).toBe(0);
      expect(result.status).toBe('no_cards_in_stack');
    });
  });

  describe('getStackStats', () => {
    test('should return exit stack statistics', async () => {
      // Arrange
      await exitoutStackService.addToStack('1', 'CARD1');
      await exitoutStackService.addToStack('1', 'CARD2');
      await exitoutStackService.addToStack('2', 'CARD3');

      // Act
      const result = await exitoutStackService.getStackStats();

      // Assert
      expect(result).toMatchObject({
        totalTeams: 2,
        totalCards: 3,
        timestamp: expect.any(String)
      });
    });

    test('should return zero stats for empty stack', async () => {
      // Act
      const result = await exitoutStackService.getStackStats();

      // Assert
      expect(result).toMatchObject({
        totalTeams: 0,
        totalCards: 0,
        timestamp: expect.any(String)
      });
    });
  });

  describe('clearStack', () => {
    test('should clear all entries from exit stack', async () => {
      // Arrange
      await exitoutStackService.addToStack('1', 'CARD1');
      await exitoutStackService.addToStack('2', 'CARD2');

      // Act
      const result = await exitoutStackService.clearStack();

      // Assert
      expect(result.status).toBe('cleared');
      expect(result.totalTeams).toBe(2); // Previous stats
      expect(result.totalCards).toBe(2);
      
      // Verify stack is actually cleared
      const stackAfterClear = await exitoutStackService.getStack();
      expect(stackAfterClear).toEqual([]);
    });

    test('should handle empty stack gracefully', async () => {
      // Act
      const result = await exitoutStackService.clearStack();

      // Assert
      expect(result.status).toBe('cleared');
      expect(result.totalTeams).toBe(0);
      expect(result.totalCards).toBe(0);
    });
  });
});