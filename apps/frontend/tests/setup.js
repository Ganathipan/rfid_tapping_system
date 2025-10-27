/**
 * Frontend Test Setup Configuration
 * Configures Vitest testing environment for React components
 */

import React from 'react';
import { beforeEach, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { act } from '@testing-library/react';

// Configure React Testing Library to use act by default
global.act = act;

// Handle unhandled promise rejections that are expected in tests
const originalUnhandledRejection = process.listeners('unhandledRejection');
process.removeAllListeners('unhandledRejection');
process.on('unhandledRejection', (reason, promise) => {
  // Suppress expected API errors in tests
  if (reason instanceof Error && 
      (reason.message.includes('API Error') || 
       reason.message.includes('Network error') ||
       reason.message.includes('Database connection failed'))) {
    // These are expected test errors, don't treat as unhandled
    return;
  }
  // Re-throw other unhandled rejections
  throw reason;
});

// Mock environment variables
vi.mock('../src/config.js', () => ({
  default: {
    API_BASE: 'http://localhost:4000',
    BACKEND_HOST: 'localhost',
    BACKEND_PORT: 4000,
    WS_URL: 'ws://localhost:4000',
    GAMELITE_KEY: 'dev-admin-key-2024'
  },
  API_BASE: 'http://localhost:4000',
  BACKEND_HOST: 'localhost',
  BACKEND_PORT: 4000,
  WS_URL: 'ws://localhost:4000',
  GAMELITE_KEY: 'dev-admin-key-2024'
}));

// Mock API module - the main api function
vi.mock('../src/api.js', () => ({
  api: vi.fn((path) => {
    // Mock responses based on the API path
    switch (path) {
      case '/api/analytics/live':
        return Promise.resolve({
          venue_total: 156,
          active_cards: 89,
          total_unique_cards: 245,
          average_session_duration_secs: 1420,
          average_active_session_age_secs: 850,
          window_hours: 24,
          generated_at: '2024-01-15T10:30:00Z',
          clusters: [
            { id: 1, zone: 'CLUSTER1', visitors: 45 },
            { id: 2, zone: 'CLUSTER2', visitors: 38 },
            { id: 3, zone: 'CLUSTER3', visitors: 22 }
          ]
        });
      
      case '/api/tags/admin/registrations':
        return Promise.resolve([
          {
            id: 1,
            portal: 'portal1',
            name: 'Team Alpha',
            group_size: 4,
            school: 'Test School',
            university: null,
            province: 'Western',
            created_at: '2024-01-15T09:00:00Z'
          },
          {
            id: 2,
            portal: 'portal2', 
            name: 'Team Beta',
            group_size: 3,
            school: null,
            university: 'Test University',
            province: 'Central',
            created_at: '2024-01-15T09:15:00Z'
          }
        ]);
      
      case '/api/tags/list-cards':
        return Promise.resolve([
          { id: 'CARD001', status: 'assigned', registration_id: 1 },
          { id: 'CARD002', status: 'assigned', registration_id: 1 },
          { id: 'CARD003', status: 'available', registration_id: null },
          { id: 'CARD004', status: 'available', registration_id: null }
        ]);
      
      default:
        if (path.startsWith('/api/analytics/range')) {
          return Promise.resolve({
            venue_total: 89,
            active_cards: 45,
            total_unique_cards: 123,
            average_session_duration_secs: 1200,
            average_active_session_age_secs: 600,
            generated_at: '2024-01-15T11:00:00Z',
            clusters: [
              { id: 1, zone: 'CLUSTER1', visitors: 25 },
              { id: 2, zone: 'CLUSTER2', visitors: 20 }
            ]
          });
        }
        return Promise.resolve({});
    }
  }),

  getStatus: vi.fn(() => Promise.resolve({ status: 'active', card: '12345' })),

  getCardHistory: vi.fn(() => Promise.resolve({
    cardDetails: {
      status: 'assigned',
      registration_id: 1,
      team_name: 'Team Alpha',
      group_size: 4
    },
    statistics: {
      totalTaps: 12,
      clusterVisits: 8,
      registrations: 1,
      exits: 3,
      firstSeen: '2024-01-15T09:30:00Z',
      lastSeen: '2024-01-15T15:45:00Z'
    },
    clustersVisited: ['CLUSTER1', 'CLUSTER2', 'CLUSTER3'],
    history: [
      {
        log_time: '2024-01-15T15:45:00Z',
        event_type: 'CLUSTER_VISIT',
        label: 'CLUSTER3',
        portal: 'portal1'
      },
      {
        log_time: '2024-01-15T14:30:00Z',
        event_type: 'CLUSTER_VISIT', 
        label: 'CLUSTER2',
        portal: 'portal1'
      },
      {
        log_time: '2024-01-15T09:30:00Z',
        event_type: 'REGISTRATION',
        label: 'REGISTER',
        portal: 'portal1'
      }
    ],
    pagination: {
      returned: 3,
      hasMore: false
    }
  })),

  gameLite: {
    status: vi.fn(() => Promise.resolve({ gameActive: true })),
    getConfig: vi.fn(() => Promise.resolve({ gameMode: 'test' })),
    getEligibleTeams: vi.fn(() => Promise.resolve([])),
    getLeaderboard: vi.fn(() => Promise.resolve({ leaderboard: [] })),
    setConfig: vi.fn(() => Promise.resolve({ success: true })),
    redeem: vi.fn(() => Promise.resolve({ success: true })),
    setClusterRules: vi.fn(() => Promise.resolve({ success: true }))
  },

  readerConfig: {
    list: vi.fn(() => Promise.resolve({ readers: [] })),
    get: vi.fn(() => Promise.resolve({ reader: {} })),
    upsert: vi.fn(() => Promise.resolve({ success: true })),
    update: vi.fn(() => Promise.resolve({ success: true })),
    remove: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

// Mock React Router - render RootFlow component directly for testing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/registration', search: '', hash: '', state: null }),
    useParams: () => ({}),
    BrowserRouter: ({ children }) => {
      // Extract and render RootFlow from the App component structure
      // We know App component has a Routes->Route path="/registration" element={<RootFlow />}
      const routes = React.Children.toArray(children)?.[0]?.props?.children;
      if (routes) {
        const routeArray = React.Children.toArray(routes.props?.children || []);
        const registrationRoute = routeArray.find(route => 
          route.props?.path === '/registration'
        );
        if (registrationRoute && registrationRoute.props.element) {
          return registrationRoute.props.element;
        }
      }
      return children;
    },
    MemoryRouter: ({ children }) => children,
    Routes: ({ children }) => children,
    Route: ({ element, children }) => element || children,
    Outlet: () => React.createElement('div', { 'data-testid': 'mock-outlet-test' }, 'Mock Outlet Working'),
    Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    NavLink: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(), 
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000/',
  hostname: 'localhost',
  pathname: '/',
  search: '',
  hash: '',
  reload: vi.fn(),
  assign: vi.fn()
};

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Test utilities
export const testUtils = {
  // Helper to create mock registration data
  createMockRegistration: (overrides = {}) => ({
    id: 1,
    team_name: 'Test Team',
    university: 'Test University',
    province: 'Western',
    school_type: 'Government',
    leader_name: 'John Doe',
    leader_email: 'john@test.com',
    leader_phone: '0771234567',
    member_names: ['Alice', 'Bob', 'Charlie'],
    created_at: '2024-01-15T10:00:00Z',
    ...overrides
  }),

  // Helper to create mock member data
  createMockMember: (overrides = {}) => ({
    id: 1,
    registration_id: 1,
    name: 'Test Member',
    rfid_card_id: 'TEST123',
    cluster_visits: {},
    created_at: '2024-01-15T10:00:00Z',
    ...overrides
  }),

  // Helper to simulate user interactions
  userEvent: {
    click: async (element) => {
      const event = new MouseEvent('click', { bubbles: true });
      element.dispatchEvent(event);
    },
    type: async (element, text) => {
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    },
    clear: async (element) => {
      element.focus();
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },

  // Helper to wait for async operations
  waitFor: (callback, options = {}) => {
    const { timeout = 1000, interval = 50 } = options;
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
            return;
          }
        } catch (error) {
          // Continue checking
        }
        
        if (Date.now() - startTime >= timeout) {
          reject(new Error('Timeout waiting for condition'));
          return;
        }
        
        setTimeout(check, interval);
      };
      
      check();
    });
  }
};

// Configure console to suppress act warnings in test environment
const originalError = console.error;
const originalWarn = console.warn;

// Suppress specific React warnings that are expected in test environment
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
  
  // Reset window.location
  window.location.pathname = '/';
  window.location.search = '';
  window.location.hash = '';

  // Suppress React act warnings and other test-specific warnings
  console.error = (message, ...args) => {
    // Suppress React act warnings
    if (typeof message === 'string' && message.includes('not wrapped in act')) {
      return;
    }
    // Suppress React Router future flag warnings
    if (typeof message === 'string' && message.includes('React Router Future Flag Warning')) {
      return;
    }
    // Suppress React key warnings in tests
    if (typeof message === 'string' && message.includes('Encountered two children with the same key')) {
      return;
    }
    // Suppress className prop warnings
    if (typeof message === 'string' && message.includes('Invalid value for prop `className`')) {
      return;
    }
    originalError(message, ...args);
  };

  console.warn = (message, ...args) => {
    // Suppress React Router future flag warnings
    if (typeof message === 'string' && message.includes('React Router Future Flag Warning')) {
      return;
    }
    originalWarn(message, ...args);
  };
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Make testUtils available globally
global.testUtils = testUtils;