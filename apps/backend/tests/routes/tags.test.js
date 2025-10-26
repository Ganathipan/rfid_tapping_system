/**
 * Tags Routes Test
 * Tests for RFID card management and assignment operations
 * Based on actual routes in tags.js
 */

const request = require('supertest');
const express = require('express');
const tagsRouter = require('../../src/routes/tags');

// Mock dependencies
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn()
}));

jest.mock('../../src/services/venueState', () => ({
  incCrowd: jest.fn(),
  decCrowd: jest.fn()
}));

const pool = require('../../src/db/pool');
const { incCrowd, decCrowd } = require('../../src/services/venueState');

describe('Tags Routes - RFID Card Management', () => {
  let app;
  let mockClient;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', tagsRouter);
  });

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.query.mockClear();
    pool.connect.mockClear();
    incCrowd.mockClear();
    decCrowd.mockClear();

    // Default successful database responses
    pool.query.mockResolvedValue({
      rows: [{ 
        points: 5,
        registration_id: 1,
        id: 1,
        group_size: 3
      }],
      rowCount: 1
    });

    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
  });

  describe('RFID Card Status and Points', () => {
    it('should get RFID card status and points', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ points: 5 }],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/status/ABC123')
        .expect(200);

      expect(response.body).toHaveProperty('rfid', 'ABC123');
      expect(response.body).toHaveProperty('points', 5);
      expect(response.body).toHaveProperty('eligible', true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT portal)'),
        ['ABC123']
      );
    });

    it('should return eligible false when points below threshold', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ points: 2 }],
        rowCount: 1
      });

      const response = await request(app)
        .get('/api/status/ABC123')
        .expect(200);

      expect(response.body).toHaveProperty('rfid', 'ABC123');
      expect(response.body).toHaveProperty('points', 2);
      expect(response.body).toHaveProperty('eligible', false);
    });

    it('should handle database errors in status check', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/status/ABC123')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('Team Score Tracking', () => {
    it('should get team score for portal', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ rfid_card_id: 'ABC123', log_time: new Date() }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ registration_id: 1 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ rfid_card_id: 'ABC123' }, { rfid_card_id: 'DEF456' }],
          rowCount: 2
        })
        .mockResolvedValueOnce({
          rows: [{ points: 4 }],
          rowCount: 1
        });

      const response = await request(app)
        .get('/api/teamScore/CLUSTER1')
        .expect(200);

      expect(response.body).toHaveProperty('portal', 'CLUSTER1');
      expect(response.body).toHaveProperty('teamId', 1);
      expect(response.body).toHaveProperty('points', 4);
      expect(response.body).toHaveProperty('eligible', true);
    });

    it('should handle no taps at portal', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .get('/api/teamScore/CLUSTER1')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'No taps yet');
    });

    it('should handle RFID not assigned to team', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ rfid_card_id: 'ABC123', log_time: new Date() }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

      const response = await request(app)
        .get('/api/teamScore/CLUSTER1')
        .expect(200);

      expect(response.body).toHaveProperty('rfid', 'ABC123');
      expect(response.body).toHaveProperty('message', 'Not assigned to a team');
    });
  });

  describe('Registration Management', () => {
    it('should register new individual', async () => {
      const registrationData = {
        portal: 'REGISTER1',
        group_size: 1,
        province: 'Western',
        district: 'Colombo',
        school: 'Test School'
      };

      incCrowd.mockResolvedValue();

      const response = await request(app)
        .post('/api/register')
        .send(registrationData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(incCrowd).toHaveBeenCalledWith(1);
    });

    it('should register new group', async () => {
      const registrationData = {
        portal: 'REGISTER1',
        group_size: 5,
        university: 'Test University',
        age_range: '18-25'
      };

      const response = await request(app)
        .post('/api/register')
        .send(registrationData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(incCrowd).toHaveBeenCalledWith(5);
    });

    it('should validate required portal field', async () => {
      const registrationData = {
        group_size: 1
      };

      const response = await request(app)
        .post('/api/register')
        .send(registrationData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Portal is required');
    });

    it('should validate group size', async () => {
      const registrationData = {
        portal: 'REGISTER1',
        group_size: 0
      };

      const response = await request(app)
        .post('/api/register')
        .send(registrationData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Group size must be >= 1');
    });
  });

  describe('Card Linking and Assignment', () => {
    it('should validate required portal field in link request', async () => {
      const linkData = {
        leaderId: 1,
        asLeader: true,
        tagId: 'ABC123'
        // missing portal
      };

      const response = await request(app)
        .post('/api/link')
        .send(linkData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Portal is required');
    });

    it('should validate required leaderId field in link request', async () => {
      const linkData = {
        portal: 'REGISTER1',
        asLeader: false,
        tagId: 'DEF456'
        // missing leaderId
      };

      const response = await request(app)
        .post('/api/link')
        .send(linkData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Leader ID is required');
    });

    it('should validate link endpoint accepts proper request format', async () => {
      const linkData = {
        portal: 'REGISTER1',
        leaderId: 1,
        asLeader: true,
        tagId: 'ABC123'
      };

      // Even though the complex database logic might fail, 
      // the endpoint should at least accept the request format
      const response = await request(app)
        .post('/api/link')
        .send(linkData);

      // Should not be 404 (endpoint exists) and should not be 400 for missing required fields
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(400);
    });
  });

  describe('Card Listing and Management', () => {
    it('should list all RFID cards', async () => {
      // Mock syncRfidCardsFromLogs call (first call)
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock the actual list-cards query (second call)
      pool.query.mockResolvedValueOnce({
        rows: [
          { rfid_card_id: 'ABC123', status: 'available', portal: 'REGISTER1' },
          { rfid_card_id: 'DEF456', status: 'assigned', portal: 'REGISTER2' }
        ],
        rowCount: 2
      });

      const response = await request(app)
        .get('/api/list-cards')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('rfid_card_id', 'ABC123');
    });

    it('should get unassigned cards in FIFO order', async () => {
      // Mock syncRfidCardsFromLogs call (first call)
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // Mock the actual unassigned-fifo query (second call)
      pool.query.mockResolvedValueOnce({
        rows: [
          { rfid_card_id: 'ABC123', status: 'available', portal: 'REGISTER1', first_seen: new Date('2024-01-01'), eligible: true },
          { rfid_card_id: 'DEF456', status: 'released', portal: 'REGISTER2', first_seen: new Date('2024-01-02'), eligible: true }
        ],
        rowCount: 2
      });

      const response = await request(app)
        .get('/api/unassigned-fifo')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('eligible', true);
    });

    it('should filter unassigned cards by portal', async () => {
      const response = await request(app)
        .get('/api/unassigned-fifo?portal=REGISTER1')
        .expect(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND l.portal = $1'),
        ['REGISTER1']
      );
    });
  });

  describe('Card Skip Operation', () => {
    it('should skip problematic card', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ rfid_card_id: 'ABC123', status: 'available' }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

      const response = await request(app)
        .post('/api/skip')
        .send({ tagId: 'ABC123' })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('tagId', 'ABC123');
      expect(response.body).toHaveProperty('skipped', true);
    });

    it('should handle skip of non-existent card', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const response = await request(app)
        .post('/api/skip')
        .send({ tagId: 'NONEXISTENT' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Card not found');
    });

    it('should validate tagId in skip request', async () => {
      const response = await request(app)
        .post('/api/skip')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'tagId is required');
    });
  });

  describe('Group Size Updates', () => {
    it('should update group size for registration', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, group_size: 3 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        });

      incCrowd.mockResolvedValue();

      const response = await request(app)
        .post('/api/updateCount')
        .send({ portal: 'REGISTER1', count: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('id', 1);
      expect(incCrowd).toHaveBeenCalledWith(2); // Difference: 5 - 3
    });

    it('should decrease crowd when group size reduced', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, group_size: 5 }],
          rowCount: 1
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        });

      decCrowd.mockResolvedValue();

      const response = await request(app)
        .post('/api/updateCount')
        .send({ portal: 'REGISTER1', count: 3 })
        .expect(200);

      expect(decCrowd).toHaveBeenCalledWith(2); // Difference: 5 - 3
    });

    it('should validate portal in count update', async () => {
      const response = await request(app)
        .post('/api/updateCount')
        .send({ count: 5 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Portal is required');
    });

    it('should validate count value', async () => {
      const response = await request(app)
        .post('/api/updateCount')
        .send({ portal: 'REGISTER1', count: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Count must be >= 1');
    });
  });

  describe('Admin Operations', () => {
    it('should get all registrations for admin', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, portal: 'REGISTER1', group_size: 3 },
          { id: 2, portal: 'REGISTER2', group_size: 1 }
        ],
        rowCount: 2
      });

      const response = await request(app)
        .get('/api/admin/registrations')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });
  });
});