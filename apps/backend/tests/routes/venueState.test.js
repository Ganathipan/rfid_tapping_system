const request = require('supertest');
const express = require('express');

// Mock venue state service
const mockVenueState = {
  getCurrentCrowd: jest.fn(),
  adjustCrowd: jest.fn()
};
jest.mock('../../src/services/venueState', () => mockVenueState);

// Create Express app with the route
const app = express();
app.use(express.json());
app.use('/api', require('../../src/routes/venueState'));

describe('Venue State Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/venue/current', () => {
    it('should return current crowd count', async () => {
      mockVenueState.getCurrentCrowd.mockResolvedValue(42);

      const response = await request(app)
        .get('/api/venue/current')
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 42 });
      expect(mockVenueState.getCurrentCrowd).toHaveBeenCalledWith();
    });

    it('should return zero when no crowd', async () => {
      mockVenueState.getCurrentCrowd.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/venue/current')
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 0 });
    });

    it('should handle service error gracefully', async () => {
      mockVenueState.getCurrentCrowd.mockRejectedValue(new Error('Service error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/venue/current')
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[venue/current] error', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle null/undefined response from service', async () => {
      mockVenueState.getCurrentCrowd.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/venue/current')
        .expect(200);

      expect(response.body).toEqual({ current_crowd: null });
    });
  });

  describe('POST /api/venue/adjust', () => {
    it('should adjust crowd by positive delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(45);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: 3 })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 45 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(3);
    });

    it('should adjust crowd by negative delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(39);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: -3 })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 39 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(-3);
    });

    it('should handle zero delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(42);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: 0 })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 42 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(0);
    });

    it('should default to zero delta when not provided', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(42);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({})
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 42 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(0);
    });

    it('should default to zero delta when null body', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(42);

      const response = await request(app)
        .post('/api/venue/adjust')
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 42 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(0);
    });

    it('should handle non-numeric delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(42);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: 'abc' })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 42 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(NaN); // 'abc' converts to NaN
    });

    it('should handle string numeric delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(47);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: '5' })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 47 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(5);
    });

    it('should handle service error gracefully', async () => {
      mockVenueState.adjustCrowd.mockRejectedValue(new Error('Service error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: 5 })
        .expect(500);

      expect(response.body).toEqual({ error: 'server error' });
      expect(consoleSpy).toHaveBeenCalledWith('[venue/adjust] error', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle large positive delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(1000);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: 999 })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 1000 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(999);
    });

    it('should handle large negative delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(0);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: -999 })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 0 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(-999);
    });

    it('should handle decimal delta', async () => {
      mockVenueState.adjustCrowd.mockResolvedValue(44);

      const response = await request(app)
        .post('/api/venue/adjust')
        .send({ delta: 2.5 })
        .expect(200);

      expect(response.body).toEqual({ current_crowd: 44 });
      expect(mockVenueState.adjustCrowd).toHaveBeenCalledWith(2.5);
    });
  });
});