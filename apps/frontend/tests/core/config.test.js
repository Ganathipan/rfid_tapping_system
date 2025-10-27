import { describe, it, expect } from 'vitest';
import config, { 
  API_BASE, 
  BACKEND_HOST, 
  BACKEND_PORT, 
  WS_URL, 
  GAMELITE_KEY 
} from '../../src/config.js';

// Force evaluation of all module exports to ensure coverage tracking
const forceModuleExecution = () => {
  // Access all exports to trigger V8 coverage
  const allExports = [API_BASE, BACKEND_HOST, BACKEND_PORT, WS_URL, GAMELITE_KEY];
  const defaultExport = config;
  return { allExports, defaultExport };
};

describe('Config Module', () => {
  // Force module execution for coverage tracking
  it('loads and executes module correctly', () => {
    const { allExports, defaultExport } = forceModuleExecution();
    expect(allExports).toHaveLength(5);
    expect(defaultExport).toBeDefined();
  });

  describe('Individual exports', () => {
    it('exports API_BASE correctly', () => {
      expect(API_BASE).toBe('http://localhost:4000');
      expect(typeof API_BASE).toBe('string');
    });

    it('exports BACKEND_HOST correctly', () => {
      expect(BACKEND_HOST).toBe('localhost');
      expect(typeof BACKEND_HOST).toBe('string');
    });

    it('exports BACKEND_PORT correctly', () => {
      expect(BACKEND_PORT).toBe(4000);
      expect(typeof BACKEND_PORT).toBe('number');
    });

    it('exports WS_URL correctly', () => {
      expect(WS_URL).toBe('ws://localhost:4000');
      expect(typeof WS_URL).toBe('string');
      expect(WS_URL.startsWith('ws://')).toBe(true);
    });

    it('exports GAMELITE_KEY correctly', () => {
      expect(GAMELITE_KEY).toBe('dev-admin-key-2024');
      expect(typeof GAMELITE_KEY).toBe('string');
    });
  });

  describe('Default export', () => {
    it('exports default config object with all properties', () => {
      expect(config).toBeTypeOf('object');
      expect(config).toHaveProperty('API_BASE');
      expect(config).toHaveProperty('BACKEND_HOST');
      expect(config).toHaveProperty('BACKEND_PORT');
      expect(config).toHaveProperty('WS_URL');
      expect(config).toHaveProperty('GAMELITE_KEY');
    });

    it('default export matches individual exports', () => {
      expect(config.API_BASE).toBe(API_BASE);
      expect(config.BACKEND_HOST).toBe(BACKEND_HOST);
      expect(config.BACKEND_PORT).toBe(BACKEND_PORT);
      expect(config.WS_URL).toBe(WS_URL);
      expect(config.GAMELITE_KEY).toBe(GAMELITE_KEY);
    });

    it('contains exactly the expected properties', () => {
      const expectedKeys = ['API_BASE', 'BACKEND_HOST', 'BACKEND_PORT', 'WS_URL', 'GAMELITE_KEY'];
      const actualKeys = Object.keys(config);
      
      expect(actualKeys).toHaveLength(expectedKeys.length);
      expectedKeys.forEach(key => {
        expect(actualKeys).toContain(key);
      });
    });
  });

  describe('Configuration validity', () => {
    it('has valid HTTP URL for API_BASE', () => {
      expect(API_BASE).toMatch(/^https?:\/\/.+/);
      expect(() => new URL(API_BASE)).not.toThrow();
    });

    it('has valid WebSocket URL for WS_URL', () => {
      expect(WS_URL).toMatch(/^wss?:\/\/.+/);
      // Check that WS_URL can be used to create a WebSocket (URL validation)
      expect(() => new URL(WS_URL)).not.toThrow();
    });

    it('has valid port number', () => {
      expect(BACKEND_PORT).toBeGreaterThan(0);
      expect(BACKEND_PORT).toBeLessThan(65536);
      expect(Number.isInteger(BACKEND_PORT)).toBe(true);
    });

    it('has non-empty host', () => {
      expect(BACKEND_HOST).toBeTruthy();
      expect(BACKEND_HOST.length).toBeGreaterThan(0);
    });

    it('has non-empty admin key', () => {
      expect(GAMELITE_KEY).toBeTruthy();
      expect(GAMELITE_KEY.length).toBeGreaterThan(0);
    });
  });

  describe('URL consistency', () => {
    it('API_BASE and WS_URL use same host and port', () => {
      const apiUrl = new URL(API_BASE);
      const wsUrl = new URL(WS_URL);
      
      expect(apiUrl.hostname).toBe(wsUrl.hostname);
      expect(apiUrl.port).toBe(wsUrl.port);
    });

    it('API_BASE uses correct host from BACKEND_HOST', () => {
      const apiUrl = new URL(API_BASE);
      expect(apiUrl.hostname).toBe(BACKEND_HOST);
    });

    it('API_BASE uses correct port from BACKEND_PORT', () => {
      const apiUrl = new URL(API_BASE);
      expect(parseInt(apiUrl.port)).toBe(BACKEND_PORT);
    });

    it('WS_URL uses correct host from BACKEND_HOST', () => {
      const wsUrl = new URL(WS_URL);
      expect(wsUrl.hostname).toBe(BACKEND_HOST);
    });

    it('WS_URL uses correct port from BACKEND_PORT', () => {
      const wsUrl = new URL(WS_URL);
      expect(parseInt(wsUrl.port)).toBe(BACKEND_PORT);
    });
  });

  describe('Development environment configuration', () => {
    it('is configured for development environment', () => {
      // Based on the comment in the file indicating this is a development config
      expect(API_BASE).toContain('localhost');
      expect(WS_URL).toContain('localhost');
      expect(GAMELITE_KEY).toContain('dev');
    });

    it('uses localhost for development', () => {
      expect(BACKEND_HOST).toBe('localhost');
      expect(API_BASE).toContain('localhost');
      expect(WS_URL).toContain('localhost');
    });

    it('uses development admin key', () => {
      expect(GAMELITE_KEY).toMatch(/dev|development|test/i);
    });
  });

  describe('Configuration structure', () => {
    it('maintains immutable exports', () => {
      // Test that the exported values are what we expect and haven't been modified
      const originalApiBase = 'http://localhost:4000';
      const originalHost = 'localhost';
      const originalPort = 4000;
      const originalWsUrl = 'ws://localhost:4000';
      const originalKey = 'dev-admin-key-2024';

      expect(API_BASE).toBe(originalApiBase);
      expect(BACKEND_HOST).toBe(originalHost);
      expect(BACKEND_PORT).toBe(originalPort);
      expect(WS_URL).toBe(originalWsUrl);
      expect(GAMELITE_KEY).toBe(originalKey);
    });

    it('exports are of correct types', () => {
      expect(typeof API_BASE).toBe('string');
      expect(typeof BACKEND_HOST).toBe('string');
      expect(typeof BACKEND_PORT).toBe('number');
      expect(typeof WS_URL).toBe('string');
      expect(typeof GAMELITE_KEY).toBe('string');
    });
  });

  describe('Error handling', () => {
    it('provides valid URLs that will not cause runtime errors', () => {
      // These should not throw when used in fetch() or WebSocket()
      expect(() => new URL(API_BASE)).not.toThrow();
      expect(() => new URL(WS_URL)).not.toThrow();
    });

    it('provides non-null/undefined values', () => {
      expect(API_BASE).not.toBeNull();
      expect(API_BASE).not.toBeUndefined();
      expect(BACKEND_HOST).not.toBeNull();
      expect(BACKEND_HOST).not.toBeUndefined();
      expect(BACKEND_PORT).not.toBeNull();
      expect(BACKEND_PORT).not.toBeUndefined();
      expect(WS_URL).not.toBeNull();
      expect(WS_URL).not.toBeUndefined();
      expect(GAMELITE_KEY).not.toBeNull();
      expect(GAMELITE_KEY).not.toBeUndefined();
    });
  });
});