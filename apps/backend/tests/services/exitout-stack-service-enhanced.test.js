/**
 * Enhanced Unit Tests for ExitOut Stack Service
 * Tests comprehensive stack management functionality
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../../src/db/pool', () => global.testUtils.mockPool);
jest.mock('../../src/services/venueState', () => ({
  decCrowd: jest.fn().mockResolvedValue(10),
  getCurrentCrowd: jest.fn().mockResolvedValue(10)
}));

const exitoutStackService = require('../../src/services/exitoutStackService');
const { decCrowd, getCurrentCrowd } = require('../../src/services/venueState');

describe('ExitOutStackService - Enhanced Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the internal stack for each test
    exitoutStackService.clearStack();
  });

  describe('addToStack', () => {
    test('should add card to new team stack', async () => {
      const registrationId = '1';
      const tagId = 'CARD001';

      const result = await exitoutStackService.addToStack(registrationId, tagId);

      expect(result).toEqual({
        registrationId,
        tagId,
        stackSize: 1,
        timestamp: expect.any(String)
      });

      expect(decCrowd).toHaveBeenCalledWith(1);
    });

    test('should add multiple cards to same team stack', async () => {
      const registrationId = '1';
      const tagId1 = 'CARD001';
      const tagId2 = 'CARD002';

      const result1 = await exitoutStackService.addToStack(registrationId, tagId1);
      const result2 = await exitoutStackService.addToStack(registrationId, tagId2);

      expect(result1.stackSize).toBe(1);
      expect(result2.stackSize).toBe(2);
      expect(decCrowd).toHaveBeenCalledTimes(2);
    });

    test('should not add duplicate cards to stack', async () => {
      const registrationId = '1';
      const tagId = 'CARD001';

      // Add card first time
      const result1 = await exitoutStackService.addToStack(registrationId, tagId);
      
      // Try to add same card again
      const result2 = await exitoutStackService.addToStack(registrationId, tagId);

      expect(result1.stackSize).toBe(1);
      expect(result2).toEqual({
        registrationId,
        tagId,
        stackSize: 1,
        alreadyInStack: true,
        timestamp: expect.any(String)
      });

      // Venue count should only be decremented once
      expect(decCrowd).toHaveBeenCalledTimes(1);
    });

    test('should handle venue count errors gracefully', async () => {
      const registrationId = '1';
      const tagId = 'CARD001';
      
      const venueError = new Error('Venue service unavailable');
      decCrowd.mockRejectedValueOnce(venueError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await exitoutStackService.addToStack(registrationId, tagId);

      expect(result.stackSize).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExitOut Stack] Failed to immediately reduce venue crowd'),
        venueError
      );

      consoleSpy.mockRestore();
    });

    test('should trigger team finalization when all members exit', async () => {
      const registrationId = '1';
      const teamMembers = ['CARD001', 'CARD002'];
      
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);
      
      // Mock successful team cleanup
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE team_scores_lite
        .mockResolvedValueOnce({}); // COMMIT

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock team members query to return consistently
      global.testUtils.mockPool.query.mockImplementation(() => 
        Promise.resolve({
          rows: teamMembers.map(card => ({ rfid_card_id: card }))
        })
      );

      // Add first card - should NOT trigger finalization
      await exitoutStackService.addToStack(registrationId, 'CARD001');
      
      // Small delay to let async operations complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add second card - should trigger finalization because all team members are now in stack  
      await exitoutStackService.addToStack(registrationId, 'CARD002');
      
      // Small delay to let finalization complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check that the console log for successful finalization was called
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Team 1 fully exited. Removed team_scores_lite row.')
      );      consoleSpy.mockRestore();
    });
  });

  describe('getStack', () => {
    test('should return empty array for empty stack', () => {
      const result = exitoutStackService.getStack();
      expect(result).toEqual([]);
    });

    test('should return formatted stack data', async () => {
      await exitoutStackService.addToStack('2', 'CARD001');
      await exitoutStackService.addToStack('1', 'CARD002');
      await exitoutStackService.addToStack('1', 'CARD003');

      const result = exitoutStackService.getStack();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        registrationId: '1',
        cardCount: 2,
        cards: ['CARD002', 'CARD003'],
        lastUpdated: expect.any(String)
      });
      expect(result[1]).toEqual({
        registrationId: '2',
        cardCount: 1,
        cards: ['CARD001'],
        lastUpdated: expect.any(String)
      });
    });

    test('should sort results by registration ID', async () => {
      await exitoutStackService.addToStack('10', 'CARD001');
      await exitoutStackService.addToStack('2', 'CARD002');
      await exitoutStackService.addToStack('1', 'CARD003');

      const result = exitoutStackService.getStack();

      expect(result.map(r => r.registrationId)).toEqual(['1', '10', '2']);
    });
  });

  describe('releaseAll', () => {
    test('should return no_cards_in_stack for empty team', async () => {
      const result = await exitoutStackService.releaseAll('999');

      expect(result).toEqual({
        registrationId: '999',
        released: 0,
        cards: [],
        status: 'no_cards_in_stack'
      });
    });

    test('should successfully release all cards for team', async () => {
      const registrationId = '1';
      const cards = ['CARD001', 'CARD002'];

      // Add cards to stack
      for (const card of cards) {
        await exitoutStackService.addToStack(registrationId, card);
      }

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      // Mock successful release operations
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // lockOrCreateCard for CARD001
        .mockResolvedValueOnce({}) // DELETE members for CARD001
        .mockResolvedValueOnce({}) // UPDATE rfid_cards for CARD001
        .mockResolvedValueOnce({ rowCount: 1 }) // lockOrCreateCard for CARD002
        .mockResolvedValueOnce({}) // DELETE members for CARD002
        .mockResolvedValueOnce({}) // UPDATE rfid_cards for CARD002
        .mockResolvedValueOnce({}); // COMMIT

      getCurrentCrowd.mockResolvedValue(8);

      const result = await exitoutStackService.releaseAll(registrationId);

      expect(result).toEqual({
        registrationId,
        released: 2,
        errors: 0,
        cards: [
          { tagId: 'CARD001', status: 'released', timestamp: expect.any(String) },
          { tagId: 'CARD002', status: 'released', timestamp: expect.any(String) }
        ],
        status: 'completed',
        timestamp: expect.any(String)
      });

      expect(getCurrentCrowd).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle mixed success and error results', async () => {
      const registrationId = '1';
      await exitoutStackService.addToStack(registrationId, 'CARD001');
      await exitoutStackService.addToStack(registrationId, 'CARD002');

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      const releaseError = new Error('Release failed');

      // Mock mixed success/failure
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // lockOrCreateCard for CARD001 - success
        .mockResolvedValueOnce({}) // DELETE members for CARD001
        .mockResolvedValueOnce({}) // UPDATE rfid_cards for CARD001
        .mockRejectedValueOnce(releaseError) // lockOrCreateCard for CARD002 - failure
        .mockResolvedValueOnce({}); // COMMIT

      const result = await exitoutStackService.releaseAll(registrationId);

      expect(result.released).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].status).toBe('released');
      expect(result.cards[1].status).toBe('error');
      expect(result.cards[1].error).toBe('Release failed');
    });

    test('should handle transaction failure with rollback', async () => {
      const registrationId = '1';
      await exitoutStackService.addToStack(registrationId, 'CARD001');

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      const transactionError = new Error('Transaction failed');
      mockClient.query
        .mockRejectedValueOnce(transactionError); // BEGIN fails

      const result = await exitoutStackService.releaseAll(registrationId);

      expect(result).toEqual({
        registrationId,
        released: 0,
        errors: 1,
        cards: [{ 
          tagId: 'CARD001', 
          status: 'error', 
          error: 'Transaction failed'
        }],
        status: 'transaction_failed', // Transaction failed completely
        error: 'Transaction failed',
        timestamp: expect.any(String)
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle numeric and string registration IDs', async () => {
      // Add with string ID
      await exitoutStackService.addToStack('123', 'CARD001');

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // lockOrCreateCard
        .mockResolvedValueOnce({}) // DELETE members
        .mockResolvedValueOnce({}) // UPDATE rfid_cards
        .mockResolvedValueOnce({}); // COMMIT

      // Try to release with numeric ID
      const result = await exitoutStackService.releaseAll(123);

      expect(result.status).toBe('completed');
      expect(result.released).toBe(1);
    });
  });

  describe('getStackStats', () => {
    test('should return zero stats for empty stack', () => {
      const stats = exitoutStackService.getStackStats();

      expect(stats).toEqual({
        totalTeams: 0,
        totalCards: 0,
        timestamp: expect.any(String)
      });
    });

    test('should calculate correct stats for populated stack', async () => {
      await exitoutStackService.addToStack('1', 'CARD001');
      await exitoutStackService.addToStack('1', 'CARD002');
      await exitoutStackService.addToStack('2', 'CARD003');

      const stats = exitoutStackService.getStackStats();

      expect(stats).toEqual({
        totalTeams: 2,
        totalCards: 3,
        timestamp: expect.any(String)
      });
    });
  });

  describe('clearStack', () => {
    test('should clear empty stack', () => {
      const result = exitoutStackService.clearStack();

      expect(result).toEqual({
        totalTeams: 0,
        totalCards: 0,
        status: 'cleared',
        timestamp: expect.any(String),
        clearedAt: expect.any(String)
      });
    });

    test('should clear populated stack and return previous stats', async () => {
      await exitoutStackService.addToStack('1', 'CARD001');
      await exitoutStackService.addToStack('2', 'CARD002');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = exitoutStackService.clearStack();

      expect(result.totalTeams).toBe(2);
      expect(result.totalCards).toBe(2);
      expect(result.status).toBe('cleared');

      // Verify stack is empty after clear
      const currentStats = exitoutStackService.getStackStats();
      expect(currentStats.totalTeams).toBe(0);
      expect(currentStats.totalCards).toBe(0);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExitOut Stack] Cleared entire stack'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('maybeFinalizeTeamExit edge cases', () => {
    test('should handle database errors in finalization gracefully', async () => {
      const registrationId = '1';
      
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      global.testUtils.mockPool.connect.mockResolvedValue(mockClient);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock team members query to return error when called
      global.testUtils.mockPool.query.mockRejectedValue(new Error('Database error'));

      // This should not throw, just log error
      await exitoutStackService.addToStack(registrationId, 'CARD001');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ExitOut Stack] maybeFinalizeTeamExit error:',
        'Database error'
      );

      consoleSpy.mockRestore();
    });

    test('should handle team with no members gracefully', async () => {
      const registrationId = '1';
      
      // Mock empty team members query
      global.testUtils.mockPool.query.mockResolvedValue({ rows: [] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Should not attempt finalization for team with no members
      await exitoutStackService.addToStack(registrationId, 'CARD001');

      // No finalization log expected
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Team 1 fully exited')
      );

      consoleSpy.mockRestore();
    });
  });
});