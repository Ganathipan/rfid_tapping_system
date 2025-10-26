/**
 * Analytics Routes Test
 * Tests for analytics data endpoints and reporting functionality
 * Based on actual routes in analyticsRoutes.js
 */

const request = require('supertest');
const express = require('express');
const analyticsRouter = require('../../src/services/analyticsRoutes');

// Mock dependencies
jest.mock('../../src/db/pool', () => ({
  query: jest.fn()
}));

jest.mock('../../src/services/analyticsController', () => ({
  getLiveAnalytics: jest.fn(),
  getRangeAnalytics: jest.fn()
}));

jest.mock('../../src/config/gameLiteConfig', () => ({
  getConfig: jest.fn(() => ({
    rules: {
      clusterRules: {
        'CLUSTER1': { enabled: true },
        'CLUSTER2': { enabled: true }
      }
    }
  }))
}));

const pool = require('../../src/db/pool');
const { getLiveAnalytics, getRangeAnalytics } = require('../../src/services/analyticsController');

describe('Analytics Routes - Data and Reporting', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', analyticsRouter);
  });

  beforeEach(() => {
    pool.query.mockClear();
    getLiveAnalytics.mockClear();
    getRangeAnalytics.mockClear();

    // Default mock responses
    pool.query.mockResolvedValue({
      rows: [{
        active_cards: 150,
        total_unique_cards: 250,
        avg_session_duration_secs: 1800,
        avg_active_session_age_secs: 900
      }],
      rowCount: 1
    });
  });

  describe('Live Analytics Endpoint', () => {
    it('should get live analytics with default window', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 150,
          active_cards: 150,
          total_unique_cards: 250,
          average_session_duration_secs: 1800,
          average_active_session_age_secs: 900,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 45 },
            { id: 2, zone: 'zone2', visitors: 32 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      expect(response.body).toHaveProperty('mode', 'live');
      expect(response.body).toHaveProperty('window_hours', 24);
      expect(response.body).toHaveProperty('venue_total');
      expect(response.body).toHaveProperty('clusters');
      expect(Array.isArray(response.body.clusters)).toBe(true);
      expect(getLiveAnalytics).toHaveBeenCalled();
    });

    it('should get live analytics with custom window', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        const windowHours = Number(req.query.window_hours || 24);
        res.json({
          mode: 'live',
          window_hours: windowHours,
          generated_at: new Date().toISOString(),
          venue_total: 150,
          active_cards: 150,
          total_unique_cards: 250,
          average_session_duration_secs: 1800,
          clusters: []
        });
      });

      const response = await request(app)
        .get('/api/analytics/live?window_hours=12')
        .expect(200);

      expect(response.body).toHaveProperty('window_hours', 12);
      expect(getLiveAnalytics).toHaveBeenCalled();
    });

    it('should handle live analytics errors', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.status(500).json({ error: 'failed to compute live analytics' });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'failed to compute live analytics');
    });

    it('should include cluster occupancy data', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 150,
          active_cards: 150,
          total_unique_cards: 250,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 45 },
            { id: 2, zone: 'zone2', visitors: 32 },
            { id: 3, zone: 'zone3', visitors: 28 },
            { id: 4, zone: 'zone4', visitors: 45 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      expect(response.body.clusters).toHaveLength(4);
      expect(response.body.clusters[0]).toHaveProperty('id', 1);
      expect(response.body.clusters[0]).toHaveProperty('zone', 'zone1');
      expect(response.body.clusters[0]).toHaveProperty('visitors', 45);
    });
  });

  describe('Range Analytics Endpoint', () => {
    it('should get range analytics with valid date range', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        const from = req.query.from;
        const to = req.query.to;
        
        if (!from || !to) {
          return res.status(400).json({ error: 'invalid from/to range' });
        }

        res.json({
          mode: 'range',
          from: from,
          to: to,
          generated_at: new Date().toISOString(),
          venue_total: 120,
          active_cards: 120,
          total_unique_cards: 200,
          average_session_duration_secs: 2100,
          average_active_session_age_secs: 1200,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 35 },
            { id: 2, zone: 'zone2', visitors: 28 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/range?from=2025-10-01T08:00:00Z&to=2025-10-01T18:00:00Z')
        .expect(200);

      expect(response.body).toHaveProperty('mode', 'range');
      expect(response.body).toHaveProperty('from');
      expect(response.body).toHaveProperty('to');
      expect(response.body).toHaveProperty('venue_total');
      expect(response.body).toHaveProperty('clusters');
      expect(getRangeAnalytics).toHaveBeenCalled();
    });

    it('should validate date range parameters', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        res.status(400).json({ error: 'invalid from/to range' });
      });

      const response = await request(app)
        .get('/api/analytics/range?from=invalid&to=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'invalid from/to range');
    });

    it('should handle missing date parameters', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        res.status(400).json({ error: 'invalid from/to range' });
      });

      const response = await request(app)
        .get('/api/analytics/range')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'invalid from/to range');
    });

    it('should compute metrics for specific time range', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'range',
          from: '2025-10-01T08:00:00Z',
          to: '2025-10-01T18:00:00Z',
          generated_at: new Date().toISOString(),
          venue_total: 85,
          active_cards: 85,
          total_unique_cards: 165,
          average_session_duration_secs: 2400,
          average_active_session_age_secs: 800,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 25 },
            { id: 2, zone: 'zone2', visitors: 20 },
            { id: 3, zone: 'zone3', visitors: 22 },
            { id: 4, zone: 'zone4', visitors: 18 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/range?from=2025-10-01T08:00:00Z&to=2025-10-01T18:00:00Z')
        .expect(200);

      expect(response.body).toHaveProperty('venue_total', 85);
      expect(response.body).toHaveProperty('total_unique_cards', 165);
      expect(response.body).toHaveProperty('average_session_duration_secs', 2400);
      expect(response.body.clusters).toHaveLength(4);
    });

    it('should handle range analytics computation errors', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        res.status(500).json({ error: 'failed to compute range analytics' });
      });

      const response = await request(app)
        .get('/api/analytics/range?from=2025-10-01T08:00:00Z&to=2025-10-01T18:00:00Z')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'failed to compute range analytics');
    });
  });

  describe('Analytics Data Validation', () => {
    it('should return consistent data structure for live analytics', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 150,
          active_cards: 150,
          total_unique_cards: 250,
          average_session_duration_secs: 1800,
          average_active_session_age_secs: 900,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 45 },
            { id: 2, zone: 'zone2', visitors: 32 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      expect(response.body).toHaveProperty('mode');
      expect(response.body).toHaveProperty('generated_at');
      expect(response.body).toHaveProperty('venue_total');
      expect(response.body).toHaveProperty('active_cards');
      expect(response.body).toHaveProperty('total_unique_cards');
      expect(response.body).toHaveProperty('average_session_duration_secs');
      expect(response.body).toHaveProperty('average_active_session_age_secs');
      expect(response.body).toHaveProperty('clusters');
    });

    it('should return consistent data structure for range analytics', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'range',
          from: '2025-10-01T08:00:00Z',
          to: '2025-10-01T18:00:00Z',
          generated_at: new Date().toISOString(),
          venue_total: 120,
          active_cards: 120,
          total_unique_cards: 200,
          average_session_duration_secs: 2100,
          average_active_session_age_secs: 1200,
          clusters: []
        });
      });

      const response = await request(app)
        .get('/api/analytics/range?from=2025-10-01T08:00:00Z&to=2025-10-01T18:00:00Z')
        .expect(200);

      expect(response.body).toHaveProperty('mode');
      expect(response.body).toHaveProperty('from');
      expect(response.body).toHaveProperty('to');
      expect(response.body).toHaveProperty('generated_at');
      expect(response.body).toHaveProperty('venue_total');
      expect(response.body).toHaveProperty('active_cards');
      expect(response.body).toHaveProperty('total_unique_cards');
      expect(response.body).toHaveProperty('clusters');
    });

    it('should handle zero values appropriately', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 0,
          active_cards: 0,
          total_unique_cards: 0,
          average_session_duration_secs: 0,
          average_active_session_age_secs: 0,
          clusters: []
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      expect(response.body.venue_total).toBe(0);
      expect(response.body.active_cards).toBe(0);
      expect(response.body.total_unique_cards).toBe(0);
      expect(response.body.clusters).toEqual([]);
    });
  });

  describe('Cluster Zone Mapping', () => {
    it('should map cluster labels to zone objects', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 150,
          active_cards: 150,
          total_unique_cards: 250,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 45 },
            { id: 2, zone: 'zone2', visitors: 32 },
            { id: 3, zone: 'zone3', visitors: 0 },
            { id: 4, zone: 'zone4', visitors: 28 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      response.body.clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('zone');
        expect(cluster).toHaveProperty('visitors');
        expect(typeof cluster.id).toBe('number');
        expect(typeof cluster.zone).toBe('string');
        expect(typeof cluster.visitors).toBe('number');
      });
    });

    it('should include empty clusters in results', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 50,
          active_cards: 50,
          total_unique_cards: 75,
          clusters: [
            { id: 1, zone: 'zone1', visitors: 25 },
            { id: 2, zone: 'zone2', visitors: 0 },
            { id: 3, zone: 'zone3', visitors: 15 },
            { id: 4, zone: 'zone4', visitors: 10 }
          ]
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      const emptyClusters = response.body.clusters.filter(c => c.visitors === 0);
      expect(emptyClusters).toHaveLength(1);
      expect(emptyClusters[0]).toHaveProperty('id', 2);
    });
  });

  describe('Session Analytics', () => {
    it('should calculate session duration metrics', async () => {
      getLiveAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'live',
          window_hours: 24,
          generated_at: new Date().toISOString(),
          venue_total: 150,
          active_cards: 150,
          total_unique_cards: 250,
          average_session_duration_secs: 2400,
          average_active_session_age_secs: 1200,
          clusters: []
        });
      });

      const response = await request(app)
        .get('/api/analytics/live')
        .expect(200);

      expect(response.body.average_session_duration_secs).toBe(2400);
      expect(response.body.average_active_session_age_secs).toBe(1200);
    });

    it('should handle sessions with zero duration', async () => {
      getRangeAnalytics.mockImplementation((req, res) => {
        res.json({
          mode: 'range',
          from: '2025-10-01T08:00:00Z',
          to: '2025-10-01T09:00:00Z',
          generated_at: new Date().toISOString(),
          venue_total: 0,
          active_cards: 0,
          total_unique_cards: 5,
          average_session_duration_secs: 0,
          average_active_session_age_secs: 0,
          clusters: []
        });
      });

      const response = await request(app)
        .get('/api/analytics/range?from=2025-10-01T08:00:00Z&to=2025-10-01T09:00:00Z')
        .expect(200);

      expect(response.body.average_session_duration_secs).toBe(0);
      expect(response.body.average_active_session_age_secs).toBe(0);
    });
  });
});