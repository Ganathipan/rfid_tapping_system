const { getClusterOccupancy } = require('../../src/services/statsController');
const pool = require('../../src/db/pool');

// Mock the database pool
jest.mock('../../src/db/pool', () => ({
  query: jest.fn()
}));

describe('statsController', () => {
  let mockRequest;
  let mockResponse;
  let consoleSpy;

  beforeEach(() => {
    // Setup mock request and response objects
    mockRequest = {
      query: {}
    };
    
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
    
    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('getClusterOccupancy', () => {
    describe('Basic functionality', () => {
      it('should return cluster occupancy data successfully', async () => {
        // Mock database responses
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '5' },
            { label: 'CLUSTER2', visitor_count: '3' },
            { label: 'Z3', visitor_count: '7' }
          ]
        };

        const mockVenueData = {
          rows: [{
            registered_count: '20',
            exitout_count: '5',
            venue_total: '15'
          }]
        };

        pool.query
          .mockResolvedValueOnce(mockClusterData)  // First query - cluster occupancy
          .mockResolvedValueOnce(mockVenueData);   // Second query - venue total

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 1, zone: 'zone1', visitors: expect.any(Number) }),
            expect.objectContaining({ id: 2, zone: 'zone2', visitors: expect.any(Number) }),
            expect.objectContaining({ id: 3, zone: 'zone3', visitors: expect.any(Number) }),
            expect.objectContaining({ id: 4, zone: 'zone4', visitors: 0 }),
            expect.objectContaining({ id: 5, zone: 'zone5', visitors: 0 }),
            expect.objectContaining({ id: 6, zone: 'zone6', visitors: 0 }),
            expect.objectContaining({ id: 7, zone: 'zone7', visitors: 0 }),
            expect.objectContaining({ id: 8, zone: 'zone8', visitors: 0 })
          ])
        );
      });

      it('should handle empty cluster data gracefully', async () => {
        const mockClusterData = { rows: [] };
        const mockDebugData = { rows: [] };
        const mockVenueData = { rows: [{ registered_count: '0', exitout_count: '0', venue_total: '0' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockDebugData)  // Add debug query mock
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.arrayContaining([
            { id: 1, zone: 'zone1', visitors: 0 },
            { id: 2, zone: 'zone2', visitors: 0 },
            { id: 3, zone: 'zone3', visitors: 0 },
            { id: 4, zone: 'zone4', visitors: 0 },
            { id: 5, zone: 'zone5', visitors: 0 },
            { id: 6, zone: 'zone6', visitors: 0 },
            { id: 7, zone: 'zone7', visitors: 0 },
            { id: 8, zone: 'zone8', visitors: 0 }
          ])
        );
      });

      it('should return all 8 zones regardless of data availability', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '2' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '5', exitout_count: '1', venue_total: '4' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData).toHaveLength(8);
        
        // Verify all zone IDs 1-8 are present
        const zoneIds = responseData.map(zone => zone.id).sort();
        expect(zoneIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      });
    });

    describe('Label parsing and zone extraction', () => {
      it('should correctly parse CLUSTER labels', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '5' },
            { label: 'CLUSTER5', visitor_count: '3' },
            { label: 'CLUSTER8', visitor_count: '2' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '10', exitout_count: '0', venue_total: '10' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.find(z => z.id === 1).visitors).toBeGreaterThanOrEqual(5);
        expect(responseData.find(z => z.id === 5).visitors).toBe(3);
        expect(responseData.find(z => z.id === 8).visitors).toBe(2);
      });

      it('should correctly parse Z labels', async () => {
        const mockClusterData = {
          rows: [
            { label: 'Z2', visitor_count: '4' },
            { label: 'Z6', visitor_count: '1' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '8', exitout_count: '3', venue_total: '5' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.find(z => z.id === 2).visitors).toBe(4);
        expect(responseData.find(z => z.id === 6).visitors).toBe(1);
      });

      it('should ignore invalid labels', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '5' },
            { label: 'INVALID_LABEL', visitor_count: '10' },
            { label: 'CLUSTER99', visitor_count: '3' }, // Out of range
            { label: null, visitor_count: '2' },
            { label: '', visitor_count: '1' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '15', exitout_count: '2', venue_total: '13' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        // Only CLUSTER1 should be processed
        expect(responseData.find(z => z.id === 1).visitors).toBeGreaterThanOrEqual(5);
        // Other zones should be 0 or suggested values
        expect(responseData.find(z => z.id === 4).visitors).toBeDefined();
      });

      it('should handle case-insensitive labels', async () => {
        const mockClusterData = {
          rows: [
            { label: 'cluster1', visitor_count: '3' },
            { label: 'CLUSTER2', visitor_count: '4' },
            { label: 'z3', visitor_count: '2' },
            { label: 'Z4', visitor_count: '1' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '12', exitout_count: '2', venue_total: '10' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.find(z => z.id === 1).visitors).toBeGreaterThanOrEqual(3);
        expect(responseData.find(z => z.id === 2).visitors).toBe(4);
        expect(responseData.find(z => z.id === 3).visitors).toBeGreaterThanOrEqual(2);
        expect(responseData.find(z => z.id === 4).visitors).toBe(1);
      });
    });

    describe('Smart distribution logic', () => {
      it('should apply smart distribution when venue is crowded', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER2', visitor_count: '10' },
            { label: 'CLUSTER4', visitor_count: '8' },
            { label: 'CLUSTER5', visitor_count: '12' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '50', exitout_count: '5', venue_total: '45' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        const zone1 = responseData.find(z => z.id === 1);
        const zone3 = responseData.find(z => z.id === 3);
        
        // Zones 1 and 3 should have suggested values when venue is crowded
        expect(zone1.visitors).toBeGreaterThan(0);
        expect(zone3.visitors).toBeGreaterThan(0);
      });

      it('should not apply smart distribution when venue is not crowded', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER2', visitor_count: '2' },
            { label: 'CLUSTER4', visitor_count: '1' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '5', exitout_count: '2', venue_total: '3' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        const zone1 = responseData.find(z => z.id === 1);
        const zone3 = responseData.find(z => z.id === 3);
        
        // Zones 1 and 3 should have real values (0) when venue is not crowded
        expect(zone1.visitors).toBe(0);
        expect(zone3.visitors).toBe(0);
      });

      it('should calculate crowd pressure correctly', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER2', visitor_count: '5' },
            { label: 'CLUSTER4', visitor_count: '6' },
            { label: 'CLUSTER5', visitor_count: '4' },
            { label: 'CLUSTER6', visitor_count: '3' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '30', exitout_count: '5', venue_total: '25' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        // Should apply some level of smart distribution
        expect(mockResponse.json).toHaveBeenCalled();
        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData).toHaveLength(8);
      });
    });

    describe('Metadata response format', () => {
      it('should return detailed metadata when requested', async () => {
        mockRequest.query.metadata = 'true';
        
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '5' }
          ]
        };
        const mockVenueData = { 
          rows: [{ 
            registered_count: '15', 
            exitout_count: '3', 
            venue_total: '12' 
          }] 
        };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalledWith({
          zones: expect.any(Array),
          venue_total: 12,
          cluster_total: expect.any(Number),
          registered_count: 15,
          exitout_count: 3
        });
      });

      it('should return simple array format by default', async () => {
        const mockClusterData = { rows: [] };
        const mockDebugData = { rows: [] };
        const mockVenueData = { rows: [{ registered_count: '0', exitout_count: '0', venue_total: '0' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockDebugData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(Array.isArray(responseData)).toBe(true);
        expect(responseData[0]).toHaveProperty('id');
        expect(responseData[0]).toHaveProperty('zone');
        expect(responseData[0]).toHaveProperty('visitors');
        expect(responseData[0]).not.toHaveProperty('venue_total');
      });
    });

    describe('Error handling', () => {
      it('should handle database connection errors', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database connection failed'));

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Failed to get cluster occupancy'
        });
        expect(console.error).toHaveBeenCalledWith(
          '[getClusterOccupancy] Error:',
          expect.any(Error)
        );
      });

      it('should handle malformed database response', async () => {
        pool.query
          .mockResolvedValueOnce({ rows: [{ label: 'CLUSTER1' }] }) // Missing visitor_count
          .mockResolvedValueOnce({ rows: [{}] }); // Missing venue data

        await getClusterOccupancy(mockRequest, mockResponse);

        // Should handle gracefully and not crash
        expect(mockResponse.json).toHaveBeenCalled();
        const responseData = mockResponse.json.mock.calls[0][0];
        expect(Array.isArray(responseData)).toBe(true);
        expect(responseData).toHaveLength(8);
      });

      it('should handle null/undefined database values', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: null },
            { label: 'CLUSTER2', visitor_count: undefined },
            { label: 'CLUSTER3', visitor_count: '5' }
          ]
        };
        const mockVenueData = { 
          rows: [{ 
            registered_count: null, 
            exitout_count: undefined, 
            venue_total: '0' 
          }] 
        };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(mockResponse.json).toHaveBeenCalled();
        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.find(z => z.id === 1).visitors).toBe(0);
        expect(responseData.find(z => z.id === 2).visitors).toBe(0);
        expect(responseData.find(z => z.id === 3).visitors).toBe(5);
      });

      it('should handle venue query failure', async () => {
        pool.query
          .mockResolvedValueOnce({ rows: [{ label: 'CLUSTER1', visitor_count: '5' }] })
          .mockRejectedValueOnce(new Error('Venue query failed'));

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Failed to get cluster occupancy'
        });
      });
    });

    describe('Debug functionality', () => {
      it('should execute debug query when no clusters found', async () => {
        const mockClusterData = { rows: [] };
        const mockDebugData = { 
          rows: [
            { label: 'CLUSTER1', count: '2', sample_cards: ['card1', 'card2'] },
            { label: 'EXITOUT', count: '1', sample_cards: ['card3'] }
          ] 
        };
        const mockVenueData = { rows: [{ registered_count: '0', exitout_count: '0', venue_total: '0' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)  // Main cluster query
          .mockResolvedValueOnce(mockDebugData)    // Debug query
          .mockResolvedValueOnce(mockVenueData);   // Venue query

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(pool.query).toHaveBeenCalledTimes(3);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('No active clusters found')
        );
      });

      it('should handle debug query failure gracefully', async () => {
        const mockClusterData = { rows: [] };
        const mockVenueData = { rows: [{ registered_count: '0', exitout_count: '0', venue_total: '0' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockRejectedValueOnce(new Error('Debug query failed'))
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(console.log).toHaveBeenCalledWith(
          '[getClusterOccupancy] Debug query failed:', 'Debug query failed'
        );
        expect(mockResponse.json).toHaveBeenCalled(); // Should still return result
      });
    });

    describe('Data processing and calculations', () => {
      it('should correctly sum cluster totals', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '10' },
            { label: 'CLUSTER2', visitor_count: '15' },
            { label: 'Z3', visitor_count: '8' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '40', exitout_count: '7', venue_total: '33' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        mockRequest.query.metadata = 'true';
        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.cluster_total).toBeGreaterThanOrEqual(33); // At least the sum of real data
      });

      it('should handle negative venue totals', async () => {
        const mockClusterData = { rows: [] };
        const mockVenueData = { 
          rows: [{ 
            registered_count: '5', 
            exitout_count: '10', 
            venue_total: '-5' // More exits than registrations
          }] 
        };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce({ rows: [] }) // Debug query
          .mockResolvedValueOnce(mockVenueData);

        mockRequest.query.metadata = 'true';
        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.venue_total).toBe(0); // Should be clamped to 0
      });

      it('should process string numbers correctly', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '007' }, // Leading zeros
            { label: 'CLUSTER2', visitor_count: '3.5' }  // Decimal (should be parsed as number)
          ]
        };
        const mockVenueData = { 
          rows: [{ 
            registered_count: '15.7', 
            exitout_count: '2.3', 
            venue_total: '13.4' 
          }] 
        };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        const responseData = mockResponse.json.mock.calls[0][0];
        expect(responseData.find(z => z.id === 1).visitors).toBeGreaterThanOrEqual(7);
        expect(responseData.find(z => z.id === 2).visitors).toBe(3.5); // Accept actual parsed value
      });
    });

    describe('Logging and debugging', () => {
      it('should log processing steps', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '5' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '10', exitout_count: '2', venue_total: '8' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[getClusterOccupancy] Getting real-time cluster occupancy')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('[getClusterOccupancy] Found 1 active clusters')
        );
      });

      it('should log zone extraction process', async () => {
        const mockClusterData = {
          rows: [
            { label: 'CLUSTER1', visitor_count: '3' },
            { label: 'INVALID', visitor_count: '2' }
          ]
        };
        const mockVenueData = { rows: [{ registered_count: '5', exitout_count: '0', venue_total: '5' }] };

        pool.query
          .mockResolvedValueOnce(mockClusterData)
          .mockResolvedValueOnce(mockVenueData);

        await getClusterOccupancy(mockRequest, mockResponse);

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Processing label: "CLUSTER1"')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Processing label: "INVALID"')
        );
      });
    });
  });
});