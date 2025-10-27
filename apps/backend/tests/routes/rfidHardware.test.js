const request = require('supertest');
const express = require('express');
const rfidHardwareRouter = require('../../src/routes/rfidHardware');

// Mock dependencies
jest.mock('../../src/db/pool', () => ({
  query: jest.fn()
}));

jest.mock('../../src/services/gameLiteService', () => ({
  handlePostLogInserted: jest.fn()
}));

jest.mock('../../src/services/exitoutStackService', () => ({
  addToStack: jest.fn()
}));

jest.mock('../../src/services/venueState', () => ({
  decCrowd: jest.fn()
}));

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/rfid', rfidHardwareRouter);

describe('RFID Hardware Routes', () => {
  let mockPool;
  let mockHandlePostLogInserted;
  let mockAddToStack;
  let mockDecCrowd;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // Get the mocked services
    mockPool = require('../../src/db/pool');
    const { handlePostLogInserted } = require('../../src/services/gameLiteService');
    const { addToStack } = require('../../src/services/exitoutStackService');
    const { decCrowd } = require('../../src/services/venueState');
    
    mockHandlePostLogInserted = handlePostLogInserted;
    mockAddToStack = addToStack;
    mockDecCrowd = decCrowd;
  });

  describe('POST /rfid/rfidRead', () => {
    const mockLogEntry = {
      id: 1,
      log_time: new Date('2025-10-26T12:00:00Z'),
      rfid_card_id: 'ABC123',
      portal: 'portal1',
      label: 'REGISTER'
    };

    describe('Input Validation', () => {
      it('should return 400 if reader is missing', async () => {
        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            portal: 'portal1',
            tag: 'ABC123'
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing reader, portal or tag' });
      });

      it('should return 400 if portal is missing', async () => {
        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            tag: 'ABC123'
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing reader, portal or tag' });
      });

      it('should return 400 if tag is missing', async () => {
        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'portal1'
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing reader, portal or tag' });
      });
    });

    describe('Normal Registration Flow', () => {
      it('should process normal registration tap successfully', async () => {
        mockPool.query.mockResolvedValue({ rows: [mockLogEntry] });
        mockHandlePostLogInserted.mockResolvedValue();

        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'portal1',
            tag: 'abc123'
          });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          status: 'success',
          entry: {
            ...mockLogEntry,
            log_time: mockLogEntry.log_time.toISOString()
          }
        });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO logs'),
          ['ABC123', 'portal1', 'REGISTER']
        );
        expect(mockHandlePostLogInserted).toHaveBeenCalledWith(mockLogEntry);
      });

      it('should normalize tag to uppercase', async () => {
        mockPool.query.mockResolvedValue({ rows: [mockLogEntry] });

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'register',
            portal: 'portal1',
            tag: 'abc123'
          });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO logs'),
          ['ABC123', 'portal1', 'REGISTER']
        );
      });

      it('should handle cluster taps', async () => {
        const clusterEntry = { ...mockLogEntry, label: 'CLUSTER1' };
        mockPool.query.mockResolvedValue({ rows: [clusterEntry] });

        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'cluster1',
            portal: 'reader1',
            tag: 'ABC123'
          });

        expect(response.status).toBe(200);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO logs'),
          ['ABC123', 'reader1', 'CLUSTER1']
        );
      });
    });

    describe('EXITOUT Flow', () => {
      it('should transform REGISTER at exitout portal to EXITOUT', async () => {
        const exitoutEntry = { ...mockLogEntry, portal: 'exitout', label: 'EXITOUT' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [exitoutEntry] }) // Initial log insert
          .mockResolvedValueOnce({ rows: [{ registration_id: 'TEAM001' }], rowCount: 1 }); // Team lookup
        
        mockAddToStack.mockResolvedValue();

        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'exitout',
            tag: 'ABC123'
          });

        expect(response.status).toBe(200);
        expect(mockPool.query).toHaveBeenNthCalledWith(1,
          expect.stringContaining('INSERT INTO logs'),
          ['ABC123', 'exitout', 'EXITOUT']
        );
        expect(mockAddToStack).toHaveBeenCalledWith('TEAM001', 'ABC123');
      });

      it('should handle exitout with team found', async () => {
        const exitoutEntry = { ...mockLogEntry, portal: 'exitout', label: 'EXITOUT' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [exitoutEntry] })
          .mockResolvedValueOnce({ rows: [{ registration_id: 'TEAM001' }], rowCount: 1 });
        
        mockAddToStack.mockResolvedValue();

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'exitout',
            tag: 'ABC123'
          });

        expect(mockPool.query).toHaveBeenNthCalledWith(2,
          'SELECT registration_id FROM members WHERE rfid_card_id = $1 LIMIT 1',
          ['ABC123']
        );
        expect(mockAddToStack).toHaveBeenCalledWith('TEAM001', 'ABC123');
        expect(console.log).toHaveBeenCalledWith(
          '[RFID Hardware] Added ABC123 to exitout stack for team TEAM001'
        );
      });

      it('should handle exitout with no team found (legacy processing)', async () => {
        const exitoutEntry = { ...mockLogEntry, portal: 'exitout', label: 'EXITOUT' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [exitoutEntry] })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No team found
          .mockResolvedValueOnce({ rows: [{ last_assigned_time: new Date('2025-10-26T11:00:00Z') }], rowCount: 1 }) // Card lookup
          .mockResolvedValueOnce({ rows: [{ log_time: new Date('2025-10-26T12:00:00Z') }] }) // Log time lookup
          .mockResolvedValueOnce({}); // Card status update

        mockDecCrowd.mockResolvedValue();

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'exitout',
            tag: 'ABC123'
          });

        expect(console.warn).toHaveBeenCalledWith(
          '[RFID Hardware] EXITOUT tap for ABC123 but no team found - using legacy processing'
        );
        expect(mockPool.query).toHaveBeenCalledWith(
          'UPDATE rfid_cards SET status=\'released\' WHERE rfid_card_id = $1',
          ['ABC123']
        );
        expect(mockDecCrowd).toHaveBeenCalledWith(1);
      });

      it('should handle stack service error with fallback', async () => {
        const exitoutEntry = { ...mockLogEntry, portal: 'exitout', label: 'EXITOUT' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [exitoutEntry] })
          .mockResolvedValueOnce({ rows: [{ registration_id: 'TEAM001' }], rowCount: 1 });
        
        mockAddToStack.mockRejectedValue(new Error('Stack service error'));
        
        // Mock fallback queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ last_assigned_time: null }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ log_time: new Date('2025-10-26T12:00:00Z') }] })
          .mockResolvedValueOnce({});

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'exitout',
            tag: 'ABC123'
          });

        expect(console.error).toHaveBeenCalledWith(
          '[RFID Hardware] Error adding to exitout stack:',
          expect.any(Error)
        );
        expect(mockPool.query).toHaveBeenCalledWith(
          'UPDATE rfid_cards SET status=\'released\' WHERE rfid_card_id = $1',
          ['ABC123']
        );
      });
    });

    describe('GameLite Hook', () => {
      it('should call GameLite hook successfully', async () => {
        mockPool.query.mockResolvedValue({ rows: [mockLogEntry] });
        mockHandlePostLogInserted.mockResolvedValue();

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'portal1',
            tag: 'ABC123'
          });

        expect(mockHandlePostLogInserted).toHaveBeenCalledWith(mockLogEntry);
      });

      it('should handle GameLite hook error gracefully', async () => {
        mockPool.query.mockResolvedValue({ rows: [mockLogEntry] });
        mockHandlePostLogInserted.mockRejectedValue(new Error('GameLite error'));

        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'portal1',
            tag: 'ABC123'
          });

        expect(response.status).toBe(200);
        expect(console.warn).toHaveBeenCalledWith(
          '[GameLite hook] error:',
          'GameLite error'
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle database error', async () => {
        mockPool.query.mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'portal1',
            tag: 'ABC123'
          });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Database insert failed' });
        expect(console.error).toHaveBeenCalledWith('DB Error:', expect.any(Error));
      });

      it('should handle venue state service error gracefully', async () => {
        const exitoutEntry = { ...mockLogEntry, portal: 'exitout', label: 'EXITOUT' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [exitoutEntry] })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [{ last_assigned_time: null }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ log_time: new Date('2025-10-26T12:00:00Z') }] })
          .mockResolvedValueOnce({});

        mockDecCrowd.mockRejectedValue(new Error('Venue state error'));

        const response = await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'exitout',
            tag: 'ABC123'
          });

        expect(response.status).toBe(200);
        // Should not throw error despite venue state failure
      });
    });

    describe('Data Normalization', () => {
      it('should trim whitespace from inputs', async () => {
        mockPool.query.mockResolvedValue({ rows: [mockLogEntry] });

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: '  REGISTER  ',
            portal: '  portal1  ',
            tag: '  ABC123  '
          });

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO logs'),
          ['  ABC123  ', 'portal1', 'REGISTER']
        );
      });

      it('should handle case insensitive portal matching for exitout', async () => {
        const exitoutEntry = { ...mockLogEntry, portal: 'EXITOUT', label: 'EXITOUT' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [exitoutEntry] })
          .mockResolvedValueOnce({ rows: [{ registration_id: 'TEAM001' }], rowCount: 1 });

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'EXITOUT',
            tag: 'ABC123'
          });

        expect(mockPool.query).toHaveBeenNthCalledWith(1,
          expect.stringContaining('INSERT INTO logs'),
          ['ABC123', 'EXITOUT', 'EXITOUT']
        );
      });
    });

    describe('Console Logging', () => {
      it('should log received data', async () => {
        mockPool.query.mockResolvedValue({ rows: [mockLogEntry] });

        await request(app)
          .post('/rfid/rfidRead')
          .send({
            reader: 'REGISTER',
            portal: 'portal1',
            tag: 'ABC123'
          });

        expect(console.log).toHaveBeenCalledWith(
          '[RFID DECODE] Received:',
          { reader: 'REGISTER', portal: 'portal1', tag: 'ABC123' }
        );
      });
    });
  });
});
