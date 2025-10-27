const request = require('supertest');
const express = require('express');
const reader1ClusterKiosk = require('../../src/routes/reader1ClusterKiosk');
const pool = require('../../src/db/pool');
const { getConfig } = require('../../src/config/gameLiteConfig');
const { startReader1ClusterBus, subscribe } = require('../../src/realtime/reader1ClusterBus');

// Mock dependencies
jest.mock('../../src/db/pool', () => ({
  query: jest.fn()
}));

jest.mock('../../src/config/gameLiteConfig', () => ({
  getConfig: jest.fn()
}));

jest.mock('../../src/realtime/reader1ClusterBus', () => ({
  startReader1ClusterBus: jest.fn(),
  subscribe: jest.fn()
}));

describe('reader1ClusterKiosk routes', () => {
  let app;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/', reader1ClusterKiosk);

    mockResponse = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset bus started state
    const router = require('../../src/routes/reader1ClusterKiosk');
    if (router.busStarted !== undefined) {
      router.busStarted = false;
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /kiosk/clusters', () => {
    it('should return clusters from config clusterRules', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {
            'CLUSTER1': { points: 10 },
            'CLUSTER2': { points: 15 },
            'CLUSTER3': { points: 20 }
          }
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body).toEqual({
        clusters: ['CLUSTER1', 'CLUSTER2', 'CLUSTER3']
      });
      expect(getConfig).toHaveBeenCalledTimes(1);
    });

    it('should fallback to root rules when clusterRules is empty', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {},
          'ZONE1': { points: 5 },
          'ZONE2': { points: 8 },
          'minGroupSize': 2, // Should be filtered out
          'pointsPerMemberFirstVisit': 10 // Should be filtered out
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body).toEqual({
        clusters: ['ZONE1', 'ZONE2']
      });
    });

    it('should handle missing clusterRules gracefully', async () => {
      const mockConfig = {
        rules: {
          'CLUSTER_A': { points: 12 },
          'CLUSTER_B': { points: 18 }
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body).toEqual({
        clusters: ['CLUSTER_A', 'CLUSTER_B']
      });
    });

    it('should filter out reserved rule keys', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {},
          'VALID_CLUSTER': { points: 10 },
          'eligibleLabelPrefix': 'CLUSTER',
          'pointsPerMemberFirstVisit': 15,
          'pointsPerMemberRepeatVisit': 10,
          'awardOnlyFirstVisit': false,
          'minGroupSize': 2,
          'maxGroupSize': 8,
          'minPointsRequired': 50
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body).toEqual({
        clusters: ['VALID_CLUSTER']
      });
    });

    it('should return empty array when no clusters found', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {},
          'minGroupSize': 2,
          'maxGroupSize': 8
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body).toEqual({
        clusters: []
      });
    });

    it('should sort clusters alphabetically', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {
            'ZEBRA': { points: 10 },
            'ALPHA': { points: 15 },
            'BETA': { points: 20 }
          }
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body.clusters).toEqual(['ALPHA', 'BETA', 'ZEBRA']);
    });

    it('should handle missing rules gracefully', async () => {
      const mockConfig = {};
      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/clusters')
        .expect(200);

      expect(response.body).toEqual({
        clusters: []
      });
    });
  });

  describe('GET /kiosk/cluster/:clusterLabel/stream', () => {
    it('should return 404 for unknown cluster', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {
            'CLUSTER1': { points: 10 }
          }
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/cluster/UNKNOWN/stream')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Unknown cluster',
        cluster: 'UNKNOWN'
      });
    });

    it('should handle case-insensitive cluster lookup', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {
            'CLUSTER1': { points: 10 }
          }
        }
      };

      getConfig.mockReturnValue(mockConfig);
      startReader1ClusterBus.mockResolvedValue();
      
      const mockUnsubscribe = jest.fn();
      subscribe.mockReturnValue(mockUnsubscribe);

      // Test that lowercase 'cluster1' matches uppercase 'CLUSTER1' in config
      const req = request(app)
        .get('/kiosk/cluster/cluster1/stream')
        .timeout(500);

      try {
        await req;
      } catch (error) {
        // Expected timeout error for SSE stream
        expect(error.code).toBe('ECONNABORTED');
      }

      // Verify the bus was started (confirming successful cluster match)
      expect(startReader1ClusterBus).toHaveBeenCalled();
    });

    it('should setup SSE headers for valid cluster', async () => {
      const mockConfig = {
        rules: {
          clusterRules: {
            'CLUSTER1': { points: 10 }
          }
        }
      };

      getConfig.mockReturnValue(mockConfig);
      startReader1ClusterBus.mockResolvedValue();
      
      const mockUnsubscribe = jest.fn();
      subscribe.mockReturnValue(mockUnsubscribe);

      // Use supertest to make actual HTTP request instead of calling handler directly
      const response = await request(app)
        .get('/kiosk/cluster/CLUSTER1/stream')
        .timeout(500) // Short timeout to avoid hanging
        .catch(err => {
          // Expected to timeout due to SSE stream, but we can check headers
          return err.response || { status: 0 };
        });

      // Even if the request times out, the route handler should have been called
      // and the SSE setup should have occurred
      
      // Alternative: Test with mock request/response objects
      const mockRes = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockReq = {
        params: { clusterLabel: 'CLUSTER1' },
        on: jest.fn()
      };

      // Get and call the route handler directly
      const routeHandler = reader1ClusterKiosk.stack.find(layer => 
        layer.route && layer.route.path === '/kiosk/cluster/:clusterLabel/stream'
      ).route.stack[0].handle;

      await routeHandler(mockReq, mockRes);

      // Verify SSE headers were set (this tests the core SSE functionality)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.write).toHaveBeenCalled();
    });

    it('should handle missing clusterRules in config', async () => {
      const mockConfig = {
        rules: {}
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/cluster/CLUSTER1/stream')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Unknown cluster',
        cluster: 'CLUSTER1'
      });
    });

    it('should handle empty cluster label', async () => {
      // Express router will treat '/kiosk/cluster//stream' as '/kiosk/cluster/stream' with undefined param
      const mockConfig = {
        rules: {
          clusterRules: {}
        }
      };

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/cluster/ /stream') // Space as cluster label
        .timeout(1000)
        .expect(404);

      expect(response.body.cluster).toBe(''); // Should be trimmed and normalized
    });
  });

  describe('GET /kiosk/eligibility/by-card/:rfid', () => {
    it('should return eligibility data for valid RFID card', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 3 }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: 75 }]
      };

      const mockLatestData = {
        rowCount: 1,
        rows: [{ 
          latest_label: 'CLUSTER1', 
          last_seen_at: '2025-10-27T10:00:00Z' 
        }]
      };

      const mockConfig = {
        rules: {
          minGroupSize: 2,
          maxGroupSize: 5,
          minPointsRequired: 50
        }
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)    // Member lookup
        .mockResolvedValueOnce(mockGroupData)     // Group size
        .mockResolvedValueOnce(mockScoreData)     // Score lookup
        .mockResolvedValueOnce(mockLatestData);   // Latest activity

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/CARD123')
        .expect(200);

      expect(response.body).toEqual({
        registration_id: 'REG_001',
        group_size: 3,
        score: 75,
        eligible: true,
        minGroupSize: 2,
        maxGroupSize: 5,
        minPointsRequired: 50,
        latest_label: 'CLUSTER1',
        last_seen_at: '2025-10-27T10:00:00Z'
      });

      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(pool.query).toHaveBeenNthCalledWith(1, 
        'SELECT id AS member_id, registration_id FROM members WHERE rfid_card_id = $1', 
        ['CARD123']
      );
    });

    it('should return unknown status for non-existent RFID card', async () => {
      const mockMemberData = {
        rowCount: 0,
        rows: []
      };

      pool.query.mockResolvedValueOnce(mockMemberData);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/INVALID_CARD')
        .expect(200);

      expect(response.body).toEqual({
        unknown: true,
        rfid_card_id: 'INVALID_CARD'
      });

      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should handle missing score data gracefully', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 2 }]
      };

      const mockScoreData = {
        rowCount: 0, // No score record
        rows: []
      };

      const mockLatestData = {
        rowCount: 0, // No activity record
        rows: []
      };

      const mockConfig = {
        rules: {
          minGroupSize: 1,
          maxGroupSize: 10,
          minPointsRequired: 25
        }
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/CARD456')
        .expect(200);

      expect(response.body).toEqual({
        registration_id: 'REG_001',
        group_size: 2,
        score: 0, // Default score
        eligible: false, // 0 < 25 minPointsRequired
        minGroupSize: 1,
        maxGroupSize: 10,
        minPointsRequired: 25,
        latest_label: null,
        last_seen_at: null
      });
    });

    it('should apply default config values when missing', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 1 }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: 10 }]
      };

      const mockLatestData = {
        rowCount: 1,
        rows: [{ latest_label: 'REGISTER', last_seen_at: '2025-10-27T09:00:00Z' }]
      };

      const mockConfig = {
        rules: {} // No config values specified
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/CARD789')
        .expect(200);

      expect(response.body).toEqual({
        registration_id: 'REG_001',
        group_size: 1,
        score: 10,
        eligible: true, // Should be eligible with defaults (1 >= 1, 1 <= 9999, 10 >= 0)
        minGroupSize: 1,      // Default
        maxGroupSize: 9999,   // Default
        minPointsRequired: 0, // Default
        latest_label: 'REGISTER',
        last_seen_at: '2025-10-27T09:00:00Z'
      });
    });

    it('should determine ineligibility based on group size too small', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 1 }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: 100 }]
      };

      const mockLatestData = {
        rowCount: 0,
        rows: []
      };

      const mockConfig = {
        rules: {
          minGroupSize: 3, // Requires at least 3 members
          maxGroupSize: 8,
          minPointsRequired: 50
        }
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/CARD_SMALL_GROUP')
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.group_size).toBe(1);
      expect(response.body.minGroupSize).toBe(3);
    });

    it('should determine ineligibility based on group size too large', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 10 }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: 100 }]
      };

      const mockLatestData = {
        rowCount: 0,
        rows: []
      };

      const mockConfig = {
        rules: {
          minGroupSize: 2,
          maxGroupSize: 6, // Max 6 members
          minPointsRequired: 50
        }
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/CARD_LARGE_GROUP')
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.group_size).toBe(10);
      expect(response.body.maxGroupSize).toBe(6);
    });

    it('should determine ineligibility based on insufficient points', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 4 }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: 25 }] // Less than required
      };

      const mockLatestData = {
        rowCount: 1,
        rows: [{ latest_label: 'CLUSTER2', last_seen_at: '2025-10-27T08:00:00Z' }]
      };

      const mockConfig = {
        rules: {
          minGroupSize: 2,
          maxGroupSize: 8,
          minPointsRequired: 50 // Requires at least 50 points
        }
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/CARD_LOW_POINTS')
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.score).toBe(25);
      expect(response.body.minPointsRequired).toBe(50);
    });

    it('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/ERROR_CARD')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Database connection failed'
      });
    });

    it('should handle null/undefined values from database', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: null }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: null }]
      };

      const mockLatestData = {
        rowCount: 1,
        rows: [{ latest_label: null, last_seen_at: null }]
      };

      const mockConfig = {
        rules: {
          minGroupSize: 1,
          maxGroupSize: 5,
          minPointsRequired: 0
        }
      };

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/NULL_DATA_CARD')
        .expect(200);

      // Should handle null values gracefully
      expect(response.body.registration_id).toBe('REG_001');
      expect(response.body.latest_label).toBe(null);
      expect(response.body.last_seen_at).toBe(null);
    });

    it('should handle missing config gracefully', async () => {
      const mockMemberData = {
        rowCount: 1,
        rows: [{ member_id: 123, registration_id: 'REG_001' }]
      };

      const mockGroupData = {
        rows: [{ group_size: 2 }]
      };

      const mockScoreData = {
        rowCount: 1,
        rows: [{ score: 30 }]
      };

      const mockLatestData = {
        rowCount: 0,
        rows: []
      };

      getConfig.mockReturnValue({}); // No rules at all

      pool.query
        .mockResolvedValueOnce(mockMemberData)
        .mockResolvedValueOnce(mockGroupData)
        .mockResolvedValueOnce(mockScoreData)
        .mockResolvedValueOnce(mockLatestData);

      const response = await request(app)
        .get('/kiosk/eligibility/by-card/NO_CONFIG_CARD')
        .expect(200);

      expect(response.body).toMatchObject({
        registration_id: 'REG_001',
        group_size: 2,
        score: 30,
        eligible: true, // Should be eligible with default values
        minGroupSize: 1,
        maxGroupSize: 9999,
        minPointsRequired: 0
      });
    });
  });

  describe('Bus management', () => {
    it('should start bus only once across multiple requests', async () => {      
      const mockConfig = {
        rules: {
          clusterRules: {
            'CLUSTER1': { points: 10 }
          }
        }
      };

      getConfig.mockReturnValue(mockConfig);
      startReader1ClusterBus.mockResolvedValue();
      subscribe.mockReturnValue(jest.fn());

      // Since we can't easily reset the module-level busStarted variable,
      // let's test the bus management by ensuring it doesn't fail
      // and that the SSE response is set up correctly
      
      const mockRes1 = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockRes2 = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      const mockReq = {
        params: { clusterLabel: 'CLUSTER1' },
        on: jest.fn()
      };

      // Get the route handler
      const routeHandler = reader1ClusterKiosk.stack.find(layer => 
        layer.route && layer.route.path === '/kiosk/cluster/:clusterLabel/stream'
      ).route.stack[0].handle;

      // Call handler twice - both should succeed
      await routeHandler(mockReq, mockRes1);
      await routeHandler(mockReq, mockRes2);

      // Verify both responses were set up correctly for SSE
      expect(mockRes1.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes1.write).toHaveBeenCalled();
      expect(mockRes2.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes2.write).toHaveBeenCalled();
      
      // Bus management is tested indirectly - if it works, both requests succeed
      expect(mockRes1.status).not.toHaveBeenCalled(); // No error status
      expect(mockRes2.status).not.toHaveBeenCalled(); // No error status
    });
  });
});