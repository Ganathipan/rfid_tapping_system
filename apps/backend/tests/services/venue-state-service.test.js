const { describe, it, expect, beforeEach } = require('@jest/globals');

// Import the actual venue state service (uses in-memory counters)
const venueStateService = require('../../src/services/venueState');

describe('Venue State Service', () => {
  beforeEach(() => {
    // Reset in-memory counter to 0 before each test
    const current = venueStateService.getCurrentCrowd();
    if (current > 0) {
      venueStateService.adjustCrowd(-current);
    }
  });

  describe('getCurrentCrowd', () => {
    it('returns 0 initially', () => {
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(0);
    });

    it('returns current crowd count after increment', () => {
      venueStateService.incCrowd(5);
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(5);
    });

    it('handles large numbers', () => {
      venueStateService.incCrowd(999999);
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(999999);
    });
  });

  describe('incCrowd', () => {
    it('increments crowd count by specified amount', () => {
      const result = venueStateService.incCrowd(5);
      expect(result).toBe(5);
      expect(venueStateService.getCurrentCrowd()).toBe(5);
    });

    it('defaults to increment by 1 when no amount specified', () => {
      const result = venueStateService.incCrowd();
      expect(result).toBe(1);
      expect(venueStateService.getCurrentCrowd()).toBe(1);
    });

    it('handles string numbers correctly', () => {
      const result = venueStateService.incCrowd('3');
      expect(result).toBe(3);
    });

    it('handles invalid input gracefully', () => {
      venueStateService.incCrowd(5);
      const result = venueStateService.incCrowd('invalid');
      expect(result).toBe(5); // Should remain unchanged
    });

    it('handles negative input by treating as 0', () => {
      const result = venueStateService.incCrowd(-5);
      expect(result).toBe(0);
    });

    it('accumulates multiple increments', () => {
      venueStateService.incCrowd(10);
      venueStateService.incCrowd(5);
      const result = venueStateService.incCrowd(3);
      expect(result).toBe(18);
    });
  });

  describe('decCrowd', () => {
    beforeEach(() => {
      // Start with some count to decrement from
      venueStateService.incCrowd(50);
    });

    it('decrements crowd count by specified amount', () => {
      const result = venueStateService.decCrowd(5);
      expect(result).toBe(45);
      expect(venueStateService.getCurrentCrowd()).toBe(45);
    });

    it('defaults to decrement by 1 when no amount specified', () => {
      const result = venueStateService.decCrowd();
      expect(result).toBe(49);
      expect(venueStateService.getCurrentCrowd()).toBe(49);
    });

    it('does not go below zero', () => {
      venueStateService.adjustCrowd(-venueStateService.getCurrentCrowd()); // Reset to 0
      const result = venueStateService.decCrowd(5);
      expect(result).toBe(0);
      expect(venueStateService.getCurrentCrowd()).toBe(0);
    });

    it('handles string numbers correctly', () => {
      const result = venueStateService.decCrowd('3');
      expect(result).toBe(47); // 50 - 3
    });

    it('handles invalid input gracefully', () => {
      const initialCount = venueStateService.getCurrentCrowd();
      const result = venueStateService.decCrowd('invalid');
      expect(result).toBe(initialCount); // Should remain unchanged
    });

    it('handles negative input by treating as 0', () => {
      const initialCount = venueStateService.getCurrentCrowd();
      const result = venueStateService.decCrowd(-5);
      expect(result).toBe(initialCount); // Should remain unchanged
    });
  });

  describe('adjustCrowd', () => {
    it('increases crowd when positive delta', () => {
      const result = venueStateService.adjustCrowd(10);
      expect(result).toBe(10);
    });

    it('decreases crowd when negative delta', () => {
      venueStateService.incCrowd(20);
      const result = venueStateService.adjustCrowd(-5);
      expect(result).toBe(15);
    });

    it('does not go below zero with large negative delta', () => {
      venueStateService.incCrowd(10);
      const result = venueStateService.adjustCrowd(-20);
      expect(result).toBe(0);
    });

    it('handles zero delta', () => {
      venueStateService.incCrowd(15);
      const result = venueStateService.adjustCrowd(0);
      expect(result).toBe(15);
    });

    it('handles undefined delta', () => {
      venueStateService.incCrowd(15);
      const result = venueStateService.adjustCrowd();
      expect(result).toBe(15);
    });

    it('handles invalid delta', () => {
      venueStateService.incCrowd(15);
      const result = venueStateService.adjustCrowd('invalid');
      expect(result).toBe(15);
    });

    it('handles NaN delta', () => {
      venueStateService.incCrowd(15);
      const result = venueStateService.adjustCrowd(NaN);
      expect(result).toBe(15);
    });

    it('handles Infinity delta', () => {
      venueStateService.incCrowd(15);
      const result = venueStateService.adjustCrowd(Infinity);
      expect(result).toBe(15);
    });
  });

  describe('Integration scenarios', () => {
    it('handles complex sequence of operations', () => {
      venueStateService.incCrowd(10);
      venueStateService.decCrowd(3);
      venueStateService.adjustCrowd(5);
      venueStateService.decCrowd(2);
      
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(10); // 10 - 3 + 5 - 2 = 10
    });

    it('maintains state across multiple operations', () => {
      const operations = [
        () => venueStateService.incCrowd(1),
        () => venueStateService.incCrowd(2),
        () => venueStateService.decCrowd(1),
        () => venueStateService.adjustCrowd(3),
        () => venueStateService.decCrowd(2)
      ];

      operations.forEach(op => op());
      
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(3); // 1 + 2 - 1 + 3 - 2 = 3
    });

    it('handles rapid consecutive operations', () => {
      for (let i = 0; i < 100; i++) {
        venueStateService.incCrowd(1);
      }
      
      for (let i = 0; i < 30; i++) {
        venueStateService.decCrowd(1);
      }
      
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(70);
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles very large numbers', () => {
      const largeNumber = 999999999;
      const result = venueStateService.incCrowd(largeNumber);
      expect(result).toBe(largeNumber);
    });

    it('maintains consistency with multiple threads simulation', () => {
      // Simulate concurrent operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(() => venueStateService.incCrowd(1));
        operations.push(() => venueStateService.decCrowd(1));
      }
      
      // Execute all operations
      operations.forEach(op => op());
      
      const result = venueStateService.getCurrentCrowd();
      expect(result).toBe(0); // Should balance out
    });

    it('handles decimal numbers by storing as-is', () => {
      const result = venueStateService.incCrowd(5.7);
      expect(result).toBe(5.7); // Stores decimal as-is
    });

    it('handles boolean values', () => {
      venueStateService.incCrowd(10);
      const result = venueStateService.adjustCrowd(true); // true converts to 1
      expect(result).toBe(11);
    });
  });
});