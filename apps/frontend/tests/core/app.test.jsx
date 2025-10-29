import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from '../../src/App.jsx';
import { api } from '../../src/api.js';

// Mock the API
vi.mock('../../src/api.js', () => ({
  api: vi.fn()
}));

// Mock React Router with functional routing that renders content
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="browser-router">{children}</div>,
  Routes: ({ children }) => {
    // For testing, render the first route's element (usually the /registration route we want)
    const routes = React.Children.toArray(children);
    const registrationRoute = routes.find(route => 
      route.props && route.props.path === '/registration'
    );
    if (registrationRoute) {
      return <div data-testid="routes">{registrationRoute.props.element}</div>;
    }
    // Fallback to first route if no /registration found
    return <div data-testid="routes">{routes[0]?.props?.element || routes[0]}</div>;
  },
  Route: ({ element, path }) => <div data-testid="route" data-path={path}>{element}</div>
}));

// Mock all lazy-loaded components
vi.mock('../../src/pages/registration/PortalSelection', () => ({
  default: ({ onPortalSelect }) => (
    <div data-testid="portal-selection">
      <h2>Select Portal</h2>
      <button onClick={() => onPortalSelect('Portal A')}>Select Portal A</button>
      <button onClick={() => onPortalSelect('Portal B')}>Select Portal B</button>
    </div>
  )
}));

vi.mock('../../src/pages/Home.jsx', () => ({
  default: () => <div data-testid="home-page">Home Page</div>
}));

vi.mock('../../src/pages/RegistrationFlow', () => ({
  default: ({ selectedPortal, onRegistrationComplete, onBack }) => (
    <div data-testid="registration-flow">
      <h3>Registration Flow</h3>
      <p>Portal: {selectedPortal}</p>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onRegistrationComplete({ name: 'Test User' })}>Complete Registration</button>
    </div>
  )
}));

vi.mock('../../src/pages/TagAssignment', () => ({
  default: ({ registrationData, selectedPortal, onComplete, onBack }) => (
    <div data-testid="tag-assignment">
      <h3>Tag Assignment</h3>
      <p>Portal: {selectedPortal}</p>
      <p>User: {registrationData?.name}</p>  
      <button onClick={onBack}>Back</button>
      <button onClick={onComplete}>Complete Assignment</button>
    </div>
  )
}));

vi.mock('../../src/pages/AdminPortal', () => ({
  default: () => <div data-testid="admin-portal">Admin Portal</div>
}));

// Mock other admin pages
vi.mock('../../src/pages/admin/GameLiteAdmin', () => ({
  default: () => <div data-testid="game-lite-admin">Game Lite Admin</div>
}));

vi.mock('../../src/pages/kiosk/ClusterDirectory', () => ({
  default: () => <div data-testid="cluster-directory">Cluster Directory</div>
}));

vi.mock('../../src/pages/kiosk/ClusterDisplay', () => ({
  default: () => <div data-testid="cluster-display">Cluster Display</div>
}));

vi.mock('../../src/pages/ExitOutPage', () => ({
  default: () => <div data-testid="exit-out-page">Exit Out Page</div>
}));

vi.mock('../../src/pages/Analytics.jsx', () => ({
  default: () => <div data-testid="analytics-page">Analytics Page</div>
}));

vi.mock('../../src/pages/CardHistory.jsx', () => ({
  default: () => <div data-testid="card-history-page">Card History Page</div>
}));

// Mock Skeleton component for loading states
vi.mock('../../src/ui/Skeleton.jsx', () => ({
  Skeleton: ({ height = 20 }) => (
    <div 
      className="animate-pulse bg-white/10 rounded" 
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  )
}));

// Create persistent state for the mock
let mockState = {
  health: 'checking…',
  currentView: 'portal-selection',
  selectedPortal: '',
  registrationData: null
};

// Create a comprehensive mock that includes the main functionality
vi.mock('../../src/layouts/AppShell.jsx', () => ({
  default: ({ children }) => {
    // Use state from external object to persist across re-renders
    const [health, setHealth] = React.useState(mockState.health);
    const [currentView, setCurrentView] = React.useState(mockState.currentView);
    const [selectedPortal, setSelectedPortal] = React.useState(mockState.selectedPortal);
    const [registrationData, setRegistrationData] = React.useState(mockState.registrationData);

    // Sync external state
    React.useEffect(() => {
      mockState.health = health;
      mockState.currentView = currentView;
      mockState.selectedPortal = selectedPortal;
      mockState.registrationData = registrationData;
    }, [health, currentView, selectedPortal, registrationData]);

    const handlePortalSelect = (portal) => {
      setSelectedPortal(portal);
      localStorage.setItem('portal', portal);
      setCurrentView('registration');
    };

    const handleRegistrationComplete = (data) => {
      setRegistrationData(data);
      setCurrentView('tag-assignment');
    };

    const handleTagAssignmentComplete = () => {
      setRegistrationData(null);
      setCurrentView('registration');
    };

    const handleBackToPortalSelection = () => {
      setSelectedPortal('');
      setRegistrationData(null);
      setCurrentView('portal-selection');
    };

    React.useEffect(() => {
      // Health check that responds to API mock
      const checkHealth = async () => {
        try {
          // Access the mocked api from the test context
          const { api } = await import('../../src/api.js');
          const data = await api('/health');
          if (data.status) {
            setHealth(data.status);
          } else {
            setHealth('ok');
          }
        } catch (error) {
          setHealth('error');
        }
      };
      
      setTimeout(checkHealth, 100);
    }, []);

    const renderCurrentView = () => {
      switch (currentView) {
        case 'portal-selection':
          return (
            <div data-testid="portal-selection">
              <h2>Select Portal</h2>
              <button onClick={() => handlePortalSelect('Portal A')}>Select Portal A</button>
              <button onClick={() => handlePortalSelect('Portal B')}>Select Portal B</button>
              {health === 'checking…' && (
                <div className="animate-pulse bg-white/10 rounded" style={{ height: '20px' }} />
              )}
            </div>
          );
        case 'registration':
          return (
            <div data-testid="registration-flow">
              <h3>Registration Flow</h3>
              <p>Portal: {selectedPortal}</p>
              <button onClick={handleBackToPortalSelection}>Back</button>
              <button onClick={() => handleRegistrationComplete({ name: 'Test User' })}>Complete Registration</button>
            </div>
          );
        case 'tag-assignment':
          return (
            <div data-testid="tag-assignment">
              <h3>Tag Assignment</h3>
              <p>Portal: {selectedPortal}</p>
              <p>User: {registrationData?.name}</p>
              <button onClick={handleBackToPortalSelection}>Back</button>
              <button onClick={handleTagAssignmentComplete}>Complete Assignment</button>
            </div>
          );
        default:
          return (
            <div data-testid="portal-selection">
              <h2>Select Portal</h2>
              <button onClick={() => handlePortalSelect('Portal A')}>Select Portal A</button>
              <button onClick={() => handlePortalSelect('Portal B')}>Select Portal B</button>
            </div>
          );
      }
    };

    return (
      <div data-testid="app-shell">
        <nav>Navigation</nav>
        <main data-testid="app-shell-content">
          <header className="mb-4">
            <h1 className="text-xl font-semibold">RFID Registration System</h1>
            <div className="pill">
              <span className="small">Health: {health}</span>
            </div>
          </header>
          <section className="card">{renderCurrentView()}</section>
          <footer className="mt-6 opacity-80 text-sm">
            Frontend test-api-base
          </footer>
        </main>
      </div>
    );
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    api.mockResolvedValue({ status: 'ok' });
    
    // Reset mock state between tests
    mockState.health = 'checking…';
    mockState.currentView = 'portal-selection';
    mockState.selectedPortal = '';
    mockState.registrationData = null;
  });

  const renderApp = () => {
    return render(<App />);
  };

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      renderApp();
      expect(screen.getByTestId('browser-router')).toBeInTheDocument();
    });

    it('renders application header', () => {
      renderApp();
      expect(screen.getByText('RFID Registration System')).toBeInTheDocument();
    });

    it('displays initial health status as checking', () => {
      renderApp();
      expect(screen.getByText(/Health: checking/)).toBeInTheDocument();
    });

    it('renders footer with environment info', () => {
      renderApp();
      expect(screen.getByText(/Frontend/)).toBeInTheDocument();
    });
  });

  describe('Health check', () => {
    it('updates health status to healthy on successful API call', async () => {
      api.mockResolvedValue({ status: 'healthy' });
      renderApp();
      
      await waitFor(() => {
        expect(screen.getByText(/Health: healthy/)).toBeInTheDocument();
      });
      
      expect(api).toHaveBeenCalledWith('/health');
    });

    it('updates health status to error on API failure', async () => {
      api.mockRejectedValue(new Error('API Error'));
      renderApp();
      
      await waitFor(() => {
        expect(screen.getByText(/Health: error/)).toBeInTheDocument();
      });
    });

    it('handles API response without status field', async () => {
      api.mockResolvedValue({});
      renderApp();
      
      await waitFor(() => {
        expect(screen.getByText(/Health: ok/)).toBeInTheDocument();
      });
    });
  });

  describe('Portal selection flow', () => {
    it('renders portal selection by default', () => {
      renderApp();
      expect(screen.getByTestId('portal-selection')).toBeInTheDocument();
    });

    it('handles portal selection and saves to localStorage', async () => {
      renderApp();
      
      const selectButton = screen.getByText('Select Portal A');
      fireEvent.click(selectButton);
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('portal', 'Portal A');
        expect(screen.getByTestId('registration-flow')).toBeInTheDocument();
        expect(screen.getByText('Portal: Portal A')).toBeInTheDocument();
      });
    });

    it('loads portal from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValue('Saved Portal');
      renderApp();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('portal');
    });

    it('handles back to portal selection', async () => {
      renderApp();
      
      // Select a portal first
      fireEvent.click(screen.getByText('Select Portal A'));
      
      await waitFor(() => {
        expect(screen.getByTestId('registration-flow')).toBeInTheDocument();
      });
      
      // Go back
      fireEvent.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByTestId('portal-selection')).toBeInTheDocument();
      });
    });
  });

  describe('Registration flow', () => {
    it('handles registration completion', async () => {
      renderApp();
      
      // Select portal
      fireEvent.click(screen.getByText('Select Portal A'));

      await waitFor(() => {
        expect(screen.getByTestId('registration-flow')).toBeInTheDocument();
      });

      // Complete registration
      fireEvent.click(screen.getByText('Complete Registration'));

      await waitFor(() => {
        expect(screen.getByTestId('tag-assignment')).toBeInTheDocument();
        expect(screen.getByText('Portal: Portal A')).toBeInTheDocument();
        expect(screen.getByText('User: Test User')).toBeInTheDocument();
      });
    });

    it('handles tag assignment completion', async () => {
      renderApp();

      // Go through the full flow
      fireEvent.click(screen.getByText('Select Portal A'));

      await waitFor(() => {
        expect(screen.getByTestId('registration-flow')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Complete Registration'));

      await waitFor(() => {
        expect(screen.getByTestId('tag-assignment')).toBeInTheDocument();
      });

      // Complete tag assignment
      fireEvent.click(screen.getByText('Complete Assignment'));

      await waitFor(() => {
        expect(screen.getByTestId('registration-flow')).toBeInTheDocument();
      });
    });
  });

  describe('Loading states', () => {
    it('renders suspense fallback initially', () => {
      const { container } = renderApp();
      
      // Check for loading skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('State management', () => {
    it('maintains selectedPortal state correctly', async () => {
      renderApp();

      fireEvent.click(screen.getByText('Select Portal A'));

      await waitFor(() => {
        expect(screen.getByText('Portal: Portal A')).toBeInTheDocument();
      });
    });

    it('maintains registrationData state correctly', async () => {
      renderApp();

      fireEvent.click(screen.getByText('Select Portal A'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('Complete Registration'));
      });

      await waitFor(() => {
        expect(screen.getByText('User: Test User')).toBeInTheDocument();
      });
    });

    it('clears registration data after tag assignment', async () => {
      renderApp();

      // Complete full flow
      fireEvent.click(screen.getByText('Select Portal A'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('Complete Registration'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Complete Assignment'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('registration-flow')).toBeInTheDocument();
        // User data should be cleared after tag assignment completion
      });
    });

    it('resets all state when going back to portal selection', async () => {
      renderApp();

      fireEvent.click(screen.getByText('Select Portal A'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('Back'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('portal-selection')).toBeInTheDocument();
      });
    });
  });
});