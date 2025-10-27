const { Client } = require('pg');

// Mock pg Client
jest.mock('pg', () => ({
  Client: jest.fn()
}));

// Mock master-config
jest.mock('../../../../config/master-config', () => ({
  getDatabaseUrl: jest.fn(() => 'postgresql://test:test@localhost:5432/rfid_test')
}));

const { startReader1ClusterBus, subscribe } = require('../../src/realtime/reader1ClusterBus');

describe('Reader1ClusterBus', () => {
  let mockClient;
  let mockEventHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    console.error = jest.fn();

    // Mock event handlers storage
    mockEventHandlers = {};

    // Create mock PostgreSQL client
    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      on: jest.fn((event, handler) => {
        mockEventHandlers[event] = handler;
      })
    };

    Client.mockImplementation(() => mockClient);
  });

  describe('startReader1ClusterBus', () => {
    it('should create and configure PostgreSQL client', async () => {
      await startReader1ClusterBus();

      expect(Client).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/rfid_test'
      });
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('LISTEN logs_reader1_cluster');
    });

    it('should use process.env.DATABASE_URL when available', async () => {
      process.env.DATABASE_URL = 'postgresql://override:pass@localhost:5432/override';
      
      await startReader1ClusterBus();

      expect(Client).toHaveBeenCalledWith({
        connectionString: 'postgresql://override:pass@localhost:5432/override'
      });

      delete process.env.DATABASE_URL;
    });

    it('should register error handler', async () => {
      await startReader1ClusterBus();

      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('notification', expect.any(Function));
    });

    it('should handle client errors', async () => {
      await startReader1ClusterBus();

      const error = new Error('Connection lost');
      mockEventHandlers.error(error);

      expect(console.error).toHaveBeenCalledWith(
        'reader1ClusterBus error:',
        'Connection lost'
      );
    });

    it('should return the client instance', async () => {
      const result = await startReader1ClusterBus();
      expect(result).toBe(mockClient);
    });
  });

  describe('subscribe function', () => {
    let mockSubscriber1, mockSubscriber2;

    beforeEach(() => {
      mockSubscriber1 = jest.fn();
      mockSubscriber2 = jest.fn();
    });

    it('should add subscriber to the set', () => {
      const unsubscribe = subscribe(mockSubscriber1);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const unsubscribe = subscribe(mockSubscriber1);
      
      // Unsubscribe should work without throwing
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle multiple subscribers', () => {
      const unsubscribe1 = subscribe(mockSubscriber1);
      const unsubscribe2 = subscribe(mockSubscriber2);
      
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
    });
  });

  describe('notification handling', () => {
    let mockSubscriber1, mockSubscriber2;

    beforeEach(async () => {
      mockSubscriber1 = jest.fn();
      mockSubscriber2 = jest.fn();
      
      // Start the bus to set up notification handler
      await startReader1ClusterBus();
    });

    it('should notify all subscribers with valid JSON', () => {
      subscribe(mockSubscriber1);
      subscribe(mockSubscriber2);

      const testData = { reader: 'Reader1', tag_id: 'ABC123', action: 'checkin' };
      const notification = {
        payload: JSON.stringify(testData)
      };

      mockEventHandlers.notification(notification);

      expect(mockSubscriber1).toHaveBeenCalledWith(testData);
      expect(mockSubscriber2).toHaveBeenCalledWith(testData);
    });

    it('should handle invalid JSON gracefully', () => {
      subscribe(mockSubscriber1);

      const notification = {
        payload: 'invalid json'
      };

      // Should not throw error
      expect(() => mockEventHandlers.notification(notification)).not.toThrow();
      expect(mockSubscriber1).not.toHaveBeenCalled();
    });

    it('should handle subscriber errors gracefully', () => {
      const faultySubscriber = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      subscribe(faultySubscriber);
      subscribe(mockSubscriber1);

      const testData = { reader: 'Reader1', tag_id: 'ABC123' };
      const notification = {
        payload: JSON.stringify(testData)
      };

      // Should not throw error and should still call other subscribers
      expect(() => mockEventHandlers.notification(notification)).not.toThrow();
      expect(faultySubscriber).toHaveBeenCalledWith(testData);
      expect(mockSubscriber1).toHaveBeenCalledWith(testData);
    });

    it('should not notify unsubscribed functions', () => {
      const unsubscribe = subscribe(mockSubscriber1);
      subscribe(mockSubscriber2);

      // Unsubscribe the first one
      unsubscribe();

      const testData = { reader: 'Reader1', tag_id: 'ABC123' };
      const notification = {
        payload: JSON.stringify(testData)
      };

      mockEventHandlers.notification(notification);

      expect(mockSubscriber1).not.toHaveBeenCalled();
      expect(mockSubscriber2).toHaveBeenCalledWith(testData);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical RFID notification flow', async () => {
      const mockSubscriber = jest.fn();
      await startReader1ClusterBus();
      subscribe(mockSubscriber);

      const rfidData = {
        reader: 'Reader1',
        tag_id: 'ABCD1234',
        timestamp: '2025-10-26T12:00:00Z',
        action: 'checkin'
      };

      const notification = {
        payload: JSON.stringify(rfidData)
      };

      mockEventHandlers.notification(notification);

      expect(mockSubscriber).toHaveBeenCalledWith(rfidData);
    });

    it('should handle empty payload', async () => {
      // Initialize the bus to ensure handlers are registered
      await startReader1ClusterBus();
      
      const mockSubscriber = jest.fn();
      subscribe(mockSubscriber);

      const notification = { payload: '' };

      expect(() => mockEventHandlers.notification(notification)).not.toThrow();
      expect(mockSubscriber).not.toHaveBeenCalled();
    });
  });
});