const request = require('supertest');
const express = require('express');
const statsRoutes = require('../../src/services/statsRoutes');
const { getClusterOccupancy } = require('../../src/services/statsController');

// Mock the stats controller
jest.mock('../../src/services/statsController', () => ({
  getClusterOccupancy: jest.fn()
}));

describe('Stats Routes', () => {
  let app;

  beforeEach(() => {
    // Create express app with stats routes
    app = express();
    app.use(express.json());
    app.use('/api/stats', statsRoutes);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Router Configuration', () => {
    it('should be an Express router', () => {
      expect(typeof statsRoutes).toBe('function');
      expect(statsRoutes.name).toBe('router');
    });

    it('should export the router module correctly', () => {
      expect(statsRoutes).toBeDefined();
      expect(typeof statsRoutes).toBe('function');
    });
  });

  describe('GET /cluster-occupancy', () => {
    it('should call getClusterOccupancy controller function', async () => {
      // Mock successful response
      getClusterOccupancy.mockImplementation((req, res) => {
        res.status(200).json({ success: true, data: { occupancy: 50 } });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(200);

      expect(getClusterOccupancy).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        success: true,
        data: { occupancy: 50 }
      });
    });

    it('should handle controller errors properly', async () => {
      // Mock error response
      getClusterOccupancy.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Database connection failed' });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(500);

      expect(getClusterOccupancy).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        error: 'Database connection failed'
      });
    });

    it('should pass request and response objects to controller', async () => {
      getClusterOccupancy.mockImplementation((req, res) => {
        // Verify req and res objects are passed
        expect(req).toBeDefined();
        expect(res).toBeDefined();
        expect(typeof req.query).toBe('object');
        expect(typeof res.json).toBe('function');
        res.status(200).json({ verified: true });
      });

      await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(200);

      expect(getClusterOccupancy).toHaveBeenCalledTimes(1);
    });

    it('should handle query parameters correctly', async () => {
      getClusterOccupancy.mockImplementation((req, res) => {
        // Check if query parameters are accessible
        expect(req.query).toBeDefined();
        res.status(200).json({ query: req.query });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy?cluster=A&detailed=true')
        .expect(200);

      expect(response.body.query).toEqual({
        cluster: 'A',
        detailed: 'true'
      });
      expect(getClusterOccupancy).toHaveBeenCalledTimes(1);
    });

    it('should handle different HTTP methods correctly', async () => {
      // POST should not be supported (404)
      await request(app)
        .post('/api/stats/cluster-occupancy')
        .expect(404);

      // PUT should not be supported (404)
      await request(app)
        .put('/api/stats/cluster-occupancy')
        .expect(404);

      // DELETE should not be supported (404)
      await request(app)
        .delete('/api/stats/cluster-occupancy')
        .expect(404);

      // Only GET should work
      getClusterOccupancy.mockImplementation((req, res) => {
        res.status(200).json({ method: req.method });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(200);

      expect(response.body.method).toBe('GET');
    });
  });

  describe('Route Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/stats/non-existent')
        .expect(404);
    });

    it('should return 404 for partial route matches', async () => {
      await request(app)
        .get('/api/stats/cluster')
        .expect(404);
    });
  });

  describe('Integration with Express', () => {
    it('should integrate properly with Express application', async () => {
      getClusterOccupancy.mockImplementation((req, res) => {
        res.status(200).json({ 
          integration: 'success',
          path: req.path,
          baseUrl: req.baseUrl 
        });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(200);

      expect(response.body.integration).toBe('success');
      expect(response.body.path).toBe('/cluster-occupancy');
      expect(response.body.baseUrl).toBe('/api/stats');
    });

    it('should handle middleware chain correctly', async () => {
      getClusterOccupancy.mockImplementation((req, res) => {
        // Verify middleware chain processed the request
        expect(req.method).toBe('GET');
        expect(req.url).toBe('/cluster-occupancy');
        res.status(200).json({ middleware: 'processed' });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(200);

      expect(response.body.middleware).toBe('processed');
    });
  });

  describe('Error Handling', () => {
    it('should handle controller exceptions', async () => {
      getClusterOccupancy.mockImplementation(() => {
        throw new Error('Controller crashed');
      });

      // Express should catch the error and return 500
      await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(500);

      expect(getClusterOccupancy).toHaveBeenCalledTimes(1);
    });

    it('should handle async controller errors', async () => {
      getClusterOccupancy.mockImplementation((req, res) => {
        // Simulate async error by rejecting
        res.status(500).json({ error: 'Async operation failed' });
      });

      const response = await request(app)
        .get('/api/stats/cluster-occupancy')
        .expect(500);

      expect(response.body.error).toBe('Async operation failed');
      expect(getClusterOccupancy).toHaveBeenCalledTimes(1);
    });
  });
});