const request = require('supertest');
const express = require('express');

// Mock database pool
const mockPool = {
  query: jest.fn()
};
jest.mock('../../src/db/pool', () => mockPool);

// Create Express app with the route
const app = express();
app.use(express.json());
app.use('/api', require('../../src/routes/readerConfig'));

describe('Reader Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reader-config/:rIndex', () => {
    it('should return reader config for valid rIndex', async () => {
      const mockResult = {
        rows: [{ reader_id: 'REGISTER', portal: 'portal1' }]
      };
      mockPool.query.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/reader-config/1')
        .expect(200);

      expect(response.body).toEqual({
        readerID: 'REGISTER',
        portal: 'portal1'
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT reader_id, portal FROM reader_config WHERE r_index = $1',
        [1]
      );
    });

    it('should return default config when no config found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/reader-config/999')
        .expect(200);

      expect(response.body).toEqual({
        readerID: 'REGISTER',
        portal: 'portal1'
      });
    });

    it('should return 400 for invalid rIndex (negative)', async () => {
      const response = await request(app)
        .get('/api/reader-config/-1')
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid rIndex' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid rIndex (non-integer)', async () => {
      const response = await request(app)
        .get('/api/reader-config/abc')
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid rIndex' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 500 for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/reader-config/1')
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[reader-config] error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/reader-config', () => {
    it('should return all reader configs', async () => {
      const mockResult = {
        rows: [
          { r_index: 1, reader_id: 'REGISTER', portal: 'portal1' },
          { r_index: 2, reader_id: 'CHECKIN', portal: 'portal2' }
        ]
      };
      mockPool.query.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/reader-config')
        .expect(200);

      expect(response.body).toEqual([
        { r_index: 1, reader_id: 'REGISTER', portal: 'portal1' },
        { r_index: 2, reader_id: 'CHECKIN', portal: 'portal2' }
      ]);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT r_index, reader_id, portal FROM reader_config ORDER BY r_index'
      );
    });

    it('should return empty array when no configs found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/reader-config')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 500 for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/reader-config')
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[reader-config:list] error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/reader-config', () => {
    it('should create/update reader config successfully', async () => {
      mockPool.query.mockResolvedValue({});

      const response = await request(app)
        .post('/api/reader-config')
        .send({
          r_index: 1,
          reader_id: 'REGISTER',
          portal: 'portal1'
        })
        .expect(200);

      expect(response.body).toEqual({ ok: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO reader_config (r_index, reader_id, portal)
       VALUES ($1, $2, $3)
       ON CONFLICT (r_index) DO UPDATE
       SET reader_id = EXCLUDED.reader_id,
           portal = EXCLUDED.portal`,
        [1, 'REGISTER', 'portal1']
      );
    });

    it('should convert reader_id to uppercase', async () => {
      mockPool.query.mockResolvedValue({});

      await request(app)
        .post('/api/reader-config')
        .send({
          r_index: 1,
          reader_id: 'register',
          portal: 'portal1'
        })
        .expect(200);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'REGISTER', 'portal1']
      );
    });

    it('should return 400 for invalid r_index', async () => {
      const response = await request(app)
        .post('/api/reader-config')
        .send({
          r_index: -1,
          reader_id: 'REGISTER',
          portal: 'portal1'
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid r_index' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/reader-config')
        .send({
          r_index: 1
          // Missing reader_id and portal
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'reader_id and portal are required' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 for empty reader_id', async () => {
      const response = await request(app)
        .post('/api/reader-config')
        .send({
          r_index: 1,
          reader_id: '   ',
          portal: 'portal1'
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'reader_id and portal are required' });
    });

    it('should return 500 for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .post('/api/reader-config')
        .send({
          r_index: 1,
          reader_id: 'REGISTER',
          portal: 'portal1'
        })
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[reader-config:upsert] error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('PUT /api/reader-config/:rIndex', () => {
    it('should update reader_id only', async () => {
      mockPool.query.mockResolvedValue({});

      const response = await request(app)
        .put('/api/reader-config/1')
        .send({ reader_id: 'CHECKIN' })
        .expect(200);

      expect(response.body).toEqual({ ok: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE reader_config SET reader_id = $2 WHERE r_index = $1',
        [1, 'CHECKIN']
      );
    });

    it('should update portal only', async () => {
      mockPool.query.mockResolvedValue({});

      const response = await request(app)
        .put('/api/reader-config/1')
        .send({ portal: 'portal2' })
        .expect(200);

      expect(response.body).toEqual({ ok: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE reader_config SET portal = $2 WHERE r_index = $1',
        [1, 'portal2']
      );
    });

    it('should update both reader_id and portal', async () => {
      mockPool.query.mockResolvedValue({});

      const response = await request(app)
        .put('/api/reader-config/1')
        .send({ reader_id: 'CHECKOUT', portal: 'portal3' })
        .expect(200);

      expect(response.body).toEqual({ ok: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE reader_config SET reader_id = $2, portal = $3 WHERE r_index = $1',
        [1, 'CHECKOUT', 'portal3']
      );
    });

    it('should return 400 for invalid rIndex', async () => {
      const response = await request(app)
        .put('/api/reader-config/abc')
        .send({ reader_id: 'REGISTER' })
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid rIndex' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 400 when nothing to update', async () => {
      const response = await request(app)
        .put('/api/reader-config/1')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'nothing to update' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 500 for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .put('/api/reader-config/1')
        .send({ reader_id: 'REGISTER' })
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[reader-config:update] error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('DELETE /api/reader-config/:rIndex', () => {
    it('should delete reader config successfully', async () => {
      mockPool.query.mockResolvedValue({});

      const response = await request(app)
        .delete('/api/reader-config/1')
        .expect(200);

      expect(response.body).toEqual({ ok: true });
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM reader_config WHERE r_index = $1',
        [1]
      );
    });

    it('should return 400 for invalid rIndex', async () => {
      const response = await request(app)
        .delete('/api/reader-config/-1')
        .expect(400);

      expect(response.body).toEqual({ error: 'invalid rIndex' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return 500 for database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .delete('/api/reader-config/1')
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[reader-config:delete] error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});