import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Unmock the API module for this test file to test actual implementations
vi.doUnmock('../../src/api.js');

// Import the actual API functions after unmocking
const { api, getStatus, getCardHistory, gameLite, readerConfig } = await import('../../src/api.js');

// Mock fetch globally
global.fetch = vi.fn();

describe('API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    vi.stubEnv('VITE_API_BASE', '');
    vi.stubEnv('VITE_GAMELITE_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('api function', () => {
    it('makes successful API call with default options', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await api('/test');
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/test', {
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles full URL paths', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await api('https://example.com/api/test');
      
      expect(fetch).toHaveBeenCalledWith('https://example.com/api/test', expect.any(Object));
    });

    it('handles /api paths with proxy', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await api('/api/test');
      
      expect(fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    });

    it('uses API_BASE for relative paths', async () => {
      vi.stubEnv('VITE_API_BASE', 'http://localhost:4000');
      
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await api('/test');
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/test', expect.any(Object));
    });

    it('serializes request body as JSON', async () => {
      const mockResponse = { success: true };
      const requestBody = { name: 'test', value: 123 };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await api('/test', { 
        method: 'POST',
        body: requestBody 
      });
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    });

    it('merges custom headers', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await api('/test', {
        headers: {
          'Authorization': 'Bearer token',
          'Custom-Header': 'value'
        }
      });
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
          'Custom-Header': 'value'
        },
        body: undefined
      });
    });

    it('throws error for non-ok responses with error message', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' })
      });

      await expect(api('/test')).rejects.toThrow('Bad Request');
    });

    it('throws error for non-ok responses with status code', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({})
      });

      await expect(api('/test')).rejects.toThrow('HTTP 500');
    });

    it('handles JSON parsing errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await api('/test');
      expect(result).toEqual({});
    });
  });

  describe('getStatus function', () => {
    it('calls correct endpoint for RFID status', async () => {
      const mockResponse = { status: 'active', card: '12345' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getStatus('12345');
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/tags/status/12345', {
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles special characters in RFID', async () => {
      const mockResponse = { status: 'active' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await getStatus('RFID-123/456');
      
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/tags/status/RFID-123/456', {
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
    });
  });

  describe('getCardHistory function', () => {
    it('calls correct endpoint with default limit', async () => {
      const mockResponse = { history: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await getCardHistory('card123');
      
      expect(fetch).toHaveBeenCalledWith('/api/exitout/card-history/card123?limit=20', expect.any(Object));
      expect(result).toEqual(mockResponse);
    });

    it('calls correct endpoint with custom limit', async () => {
      const mockResponse = { history: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await getCardHistory('card123', 50);
      
      expect(fetch).toHaveBeenCalledWith('/api/exitout/card-history/card123?limit=50', expect.any(Object));
    });

    it('encodes special characters in card ID', async () => {
      const mockResponse = { history: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await getCardHistory('card/123 special');
      
      expect(fetch).toHaveBeenCalledWith('/api/exitout/card-history/card%2F123%20special?limit=20', expect.any(Object));
    });
  });

  describe('gameLite API', () => {
    it('calls status endpoint', async () => {
      const mockResponse = { gameActive: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await gameLite.status();
      
      expect(fetch).toHaveBeenCalledWith('/api/game-lite/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
      expect(result).toEqual(mockResponse);
    });

    it('calls leaderboard with custom limit', async () => {
      const mockResponse = { leaderboard: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await gameLite.getLeaderboard(5);
      
      expect(fetch).toHaveBeenCalledWith('/api/game-lite/leaderboard?limit=5', expect.any(Object));
    });

    it('calls setConfig with admin key', async () => {
      const mockResponse = { success: true };
      const configPatch = { gameMode: 'test' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await gameLite.setConfig(configPatch);
      
      expect(fetch).toHaveBeenCalledWith('/api/game-lite/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'dev-admin-key-2024'
        },
        body: JSON.stringify(configPatch)
      });
    });

    it('calls redeem with proper data transformation', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await gameLite.redeem({
        registration_id: '123',
        cluster_label: 'cluster-a'
      });
      
      expect(fetch).toHaveBeenCalledWith('/api/game-lite/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'dev-admin-key-2024'
        },
        body: JSON.stringify({
          registrationId: 123,
          clusterLabel: 'CLUSTER-A'
        })
      });
    });

    it('sets cluster rules correctly', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const rulesArray = [
        { cluster_label: 'A', award_points: 10, redeemable: true, redeem_points: 5 },
        { cluster_label: 'b', award_points: 20, redeemable: false, redeem_points: 0 }
      ];

      await gameLite.setClusterRules(rulesArray);
      
      const expectedRules = {
        'A': { awardPoints: 10, redeemable: true, redeemPoints: 5 },
        'B': { awardPoints: 20, redeemable: false, redeemPoints: 0 }
      };

      expect(fetch).toHaveBeenCalledWith('/api/game-lite/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'dev-admin-key-2024'
        },
        body: JSON.stringify({
          rules: { clusterRules: expectedRules }
        })
      });
    });
  });

  describe('readerConfig API', () => {
    it('lists all reader configurations', async () => {
      const mockResponse = { readers: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await readerConfig.list();
      
      expect(fetch).toHaveBeenCalledWith('/api/reader-config', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
      expect(result).toEqual(mockResponse);
    });

    it('gets specific reader configuration', async () => {
      const mockResponse = { reader: {} };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await readerConfig.get('reader-1');
      
      expect(fetch).toHaveBeenCalledWith('/api/reader-config/reader-1', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
    });

    it('creates/updates reader configuration', async () => {
      const mockResponse = { success: true };
      const readerData = { r_index: 1, reader_id: 'RD001', portal: 'Portal A' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await readerConfig.upsert(readerData);
      
      expect(fetch).toHaveBeenCalledWith('/api/reader-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readerData)
      });
    });

    it('updates reader configuration', async () => {
      const mockResponse = { success: true };
      const patch = { portal: 'Updated Portal' };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await readerConfig.update('reader-1', patch);
      
      expect(fetch).toHaveBeenCalledWith('/api/reader-config/reader-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
    });

    it('removes reader configuration', async () => {
      const mockResponse = { success: true };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await readerConfig.remove('reader-1');
      
      expect(fetch).toHaveBeenCalledWith('/api/reader-config/reader-1', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
    });

    it('encodes special characters in reader index', async () => {
      const mockResponse = { reader: {} };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await readerConfig.get('reader/with spaces');
      
      expect(fetch).toHaveBeenCalledWith('/api/reader-config/reader%2Fwith%20spaces', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined
      });
    });
  });
});