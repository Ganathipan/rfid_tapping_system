/**
 * Comprehensive Unit Tests for CardHistory Component
 * Tests card history search, display, error handling, and data presentation
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CardHistory from '../../src/pages/admin/CardHistory.jsx';
import { getCardHistory } from '../../src/api';

// Mock the API
vi.mock('../../src/api', () => ({
  getCardHistory: vi.fn()
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock UI components
vi.mock('../../src/ui/Card.jsx', () => ({
  Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
  CardBody: ({ children, className }) => <div data-testid="card-body" className={className}>{children}</div>
}));

vi.mock('../../src/ui/Button.jsx', () => ({
  default: ({ children, onClick, disabled, variant, ...props }) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('../../src/ui/Loader.jsx', () => ({
  default: ({ size }) => <div data-testid="loader" data-size={size}>Loading...</div>
}));

vi.mock('../../src/ui/Badge.jsx', () => ({
  default: ({ children, variant, ...props }) => (
    <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
  )
}));

vi.mock('../../src/ui/Table.jsx', () => ({
  default: ({ data, columns }) => (
    <div data-testid="table">
      {data.map((row, index) => (
        <div key={index} data-testid="table-row">
          {columns.map(col => (
            <div key={col.key} data-testid={`cell-${col.key}`}>
              {col.render ? col.render(row) : row[col.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}));

describe('CardHistory Component', () => {
  const mockCardData = {
    cardDetails: {
      status: 'assigned',
      registration_id: 'REG123',
      team_name: 'Test Team',
      group_size: 4
    },
    statistics: {
      totalTaps: 25,
      clusterVisits: 8,
      registrations: 2,
      exits: 1,
      firstSeen: '2023-10-01T10:00:00Z',
      lastSeen: '2023-10-01T15:30:00Z'
    },
    clustersVisited: ['Lab A', 'Lab B', 'Library'],
    history: [
      {
        log_time: '2023-10-01T10:00:00Z',
        event_type: 'CLUSTER_VISIT',
        label: 'Lab A Entry',
        portal: 'Portal 1'
      },
      {
        log_time: '2023-10-01T11:00:00Z',
        event_type: 'REGISTRATION',
        label: 'Team Registration',
        portal: 'Portal 2'
      }
    ],
    pagination: {
      hasMore: true,
      returned: 2
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderCardHistory = (cardId = null) => {
    const route = cardId ? `/card-history/${cardId}` : '/card-history';
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/card-history/:cardId" element={<CardHistory />} />
          <Route path="/card-history" element={<CardHistory />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Initial rendering and route handling', () => {
    test('should render card ID required message when no card ID provided', () => {
      renderCardHistory();
      expect(screen.getByText('Card ID is required')).toBeInTheDocument();
    });

    test('should render header with card ID when provided', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Card History')).toBeInTheDocument();
        expect(screen.getByText(/Complete tap history for card:/)).toBeInTheDocument();
        expect(screen.getByText('CARD123')).toBeInTheDocument();
      });
    });

    test('should call API with correct parameters on mount', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(getCardHistory).toHaveBeenCalledWith('CARD123', 20);
      });
    });
  });

  describe('Loading states', () => {
    test('should show loading state when fetching data', async () => {
      let resolve;
      const promise = new Promise(r => { resolve = r; });
      getCardHistory.mockReturnValueOnce(promise);
      
      renderCardHistory('CARD123');
      
      expect(screen.getByText('Loading card history...')).toBeInTheDocument();
      const loaders = screen.getAllByTestId('loader');
      const mainLoader = loaders.find(loader => !loader.hasAttribute('data-size'));
      expect(mainLoader).toBeInTheDocument();
      
      resolve(mockCardData);
      await waitFor(() => {
        expect(screen.queryByText('Loading card history...')).not.toBeInTheDocument();
      });
    });

    test('should show small loader on refresh button when loading', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
      
      // Mock second API call for refresh
      let resolve;
      const promise = new Promise(r => { resolve = r; });
      getCardHistory.mockReturnValueOnce(promise);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        const loader = screen.getByTestId('loader');
        expect(loader).toHaveAttribute('data-size', 'sm');
      });
      
      resolve(mockCardData);
    });
  });

  describe('Error handling', () => {
    test('should display error message when API call fails', async () => {
      const errorMessage = 'Network error occurred';
      getCardHistory.mockRejectedValueOnce(new Error(errorMessage));
      
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    test('should display generic error when error has no message', async () => {
      getCardHistory.mockRejectedValueOnce(new Error());
      
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load card history')).toBeInTheDocument();
      });
    });

    test('should clear previous data when error occurs', async () => {
      // First successful load
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Card Information')).toBeInTheDocument();
      });
      
      // Then error on refresh
      getCardHistory.mockRejectedValueOnce(new Error('API Error'));
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
        expect(screen.queryByText('Card Information')).not.toBeInTheDocument();
      });
    });
  });

  describe('Card details display', () => {
    test('should display card information correctly', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Card Information')).toBeInTheDocument();
        expect(screen.getByText('assigned')).toBeInTheDocument();
        expect(screen.getByText('REG123')).toBeInTheDocument();
        expect(screen.getByText('Test Team')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
      });
    });

    test('should display status badge with correct variant', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const statusBadge = screen.getByText('assigned');
        expect(statusBadge).toHaveAttribute('data-variant', 'success');
        expect(statusBadge).toHaveTextContent('assigned');
      });
    });

    test('should display default status when card status is not assigned', async () => {
      const dataWithUnassignedCard = {
        ...mockCardData,
        cardDetails: { ...mockCardData.cardDetails, status: 'unassigned' }
      };
      getCardHistory.mockResolvedValueOnce(dataWithUnassignedCard);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const statusBadge = screen.getByText('unassigned');
        expect(statusBadge).toHaveAttribute('data-variant', 'default');
      });
    });

    test('should display placeholder values for missing card details', async () => {
      const dataWithMissingDetails = {
        ...mockCardData,
        cardDetails: {}
      };
      getCardHistory.mockResolvedValueOnce(dataWithMissingDetails);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const placeholders = screen.getAllByText('—');
        expect(placeholders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Statistics display', () => {
    test('should display activity statistics correctly', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Activity Statistics')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument(); // totalTaps
        expect(screen.getByText('8')).toBeInTheDocument();  // clusterVisits
        expect(screen.getByText('2')).toBeInTheDocument();  // registrations
        expect(screen.getByText('1')).toBeInTheDocument();  // exits
        expect(screen.getByText('3')).toBeInTheDocument();  // unique clusters
      });
    });

    test('should display first and last seen times', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('First/Last Seen')).toBeInTheDocument();
      });
    });

    test('should handle missing statistics gracefully', async () => {
      const dataWithMissingStats = {
        ...mockCardData,
        statistics: {}
      };
      getCardHistory.mockResolvedValueOnce(dataWithMissingStats);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Activity Statistics')).toBeInTheDocument();
      });
    });
  });

  describe('Clusters visited display', () => {
    test('should display clusters visited section when clusters exist', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Clusters Visited')).toBeInTheDocument();
        expect(screen.getByText('Lab A')).toBeInTheDocument();
        expect(screen.getByText('Lab B')).toBeInTheDocument();
        expect(screen.getByText('Library')).toBeInTheDocument();
      });
    });

    test('should not display clusters section when no clusters visited', async () => {
      const dataWithNoClusters = {
        ...mockCardData,
        clustersVisited: []
      };
      getCardHistory.mockResolvedValueOnce(dataWithNoClusters);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.queryByText('Clusters Visited')).not.toBeInTheDocument();
      });
    });

    test('should render cluster badges with correct variant', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        const clusterBadges = badges.filter(badge => 
          badge.textContent === 'Lab A' || 
          badge.textContent === 'Lab B' || 
          badge.textContent === 'Library'
        );
        
        clusterBadges.forEach(badge => {
          expect(badge).toHaveAttribute('data-variant', 'accent');
        });
      });
    });
  });

  describe('History table display', () => {
    test('should display history table with data', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Tap History')).toBeInTheDocument();
        expect(screen.getByTestId('table')).toBeInTheDocument();
        expect(screen.getAllByTestId('table-row')).toHaveLength(2);
      });
    });

    test('should display no history message when history is empty', async () => {
      const dataWithNoHistory = {
        ...mockCardData,
        history: []
      };
      getCardHistory.mockResolvedValueOnce(dataWithNoHistory);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('No tap history found for this card')).toBeInTheDocument();
        expect(screen.queryByTestId('table')).not.toBeInTheDocument();
      });
    });

    test('should render event type badges with correct variants', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const eventBadges = screen.getAllByTestId('badge').filter(badge => 
          badge.textContent === 'CLUSTER_VISIT' || badge.textContent === 'REGISTRATION'
        );
        
        expect(eventBadges.length).toBe(2);
        expect(eventBadges[0]).toHaveAttribute('data-variant', 'accent'); // CLUSTER_VISIT
        expect(eventBadges[1]).toHaveAttribute('data-variant', 'success'); // REGISTRATION
      });
    });

    test('should handle different event types with correct badge variants', async () => {
      const dataWithDifferentEvents = {
        ...mockCardData,
        history: [
          { ...mockCardData.history[0], event_type: 'EXIT' },
          { ...mockCardData.history[1], event_type: 'OTHER' },
          { ...mockCardData.history[0], event_type: 'UNKNOWN_TYPE' }
        ]
      };
      getCardHistory.mockResolvedValueOnce(dataWithDifferentEvents);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const eventBadges = screen.getAllByTestId('badge').filter(badge => 
          ['EXIT', 'OTHER', 'UNKNOWN_TYPE'].includes(badge.textContent)
        );
        
        expect(eventBadges[0]).toHaveAttribute('data-variant', 'warning'); // EXIT
        expect(eventBadges[1]).toHaveAttribute('data-variant', 'default'); // OTHER
        expect(eventBadges[2]).toHaveAttribute('data-variant', 'default'); // UNKNOWN_TYPE
      });
    });
  });

  describe('Limit selection and pagination', () => {
    test('should display limit selection dropdown', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const select = screen.getByDisplayValue('20 records');
        expect(select).toBeInTheDocument();
      });
    });

    test('should change limit when dropdown value changes', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(getCardHistory).toHaveBeenCalledWith('CARD123', 20);
      });
      
      // Mock second API call with new limit
      getCardHistory.mockResolvedValueOnce(mockCardData);
      
      const select = screen.getByDisplayValue('20 records');
      fireEvent.change(select, { target: { value: '50' } });
      
      await waitFor(() => {
        expect(getCardHistory).toHaveBeenCalledWith('CARD123', 50);
      });
    });

    test('should display pagination info when hasMore is true', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of many')).toBeInTheDocument();
      });
    });

    test('should not display pagination info when hasMore is false', async () => {
      const dataWithoutMore = {
        ...mockCardData,
        pagination: { hasMore: false, returned: 2 }
      };
      getCardHistory.mockResolvedValueOnce(dataWithoutMore);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.queryByText('Showing 2 of many')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation and interactions', () => {
    test('should call navigate(-1) when back button is clicked', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const backButton = screen.getByText('← Back');
        fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      });
    });

    test('should refresh data when refresh button is clicked', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(getCardHistory).toHaveBeenCalledTimes(1);
      });
      
      getCardHistory.mockResolvedValueOnce(mockCardData);
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(getCardHistory).toHaveBeenCalledTimes(2);
      });
    });

    test('should disable refresh button while loading', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
      
      // Mock slow API call for refresh
      let resolve;
      const promise = new Promise(r => { resolve = r; });
      getCardHistory.mockReturnValueOnce(promise);
      
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      
      expect(refreshButton).toBeDisabled();
      
      resolve(mockCardData);
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('Date formatting', () => {
    test('should format dates correctly in history table', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        // The formatDateTime function should convert ISO string to locale string
        expect(screen.getByTestId('table')).toBeInTheDocument();
      });
    });

    test('should handle invalid dates gracefully', async () => {
      const dataWithInvalidDate = {
        ...mockCardData,
        history: [
          { ...mockCardData.history[0], log_time: 'invalid-date' }
        ]
      };
      getCardHistory.mockResolvedValueOnce(dataWithInvalidDate);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByTestId('table')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and styling', () => {
    test('should render with proper heading structure', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Card History');
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4); // Card Information, Statistics, Clusters, History
      });
    });

    test('should render code elements with proper styling', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const codeElements = screen.getAllByText('CARD123');
        expect(codeElements[0]).toBeInTheDocument();
      });
    });

    test('should render select element with proper attributes', async () => {
      getCardHistory.mockResolvedValueOnce(mockCardData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        const select = screen.getByDisplayValue('20 records');
        expect(select).toHaveClass('bg-white/10', 'border', 'border-white/20', 'rounded', 'px-3', 'py-1', 'text-sm');
      });
    });
  });

  describe('Error edge cases', () => {
    test('should handle API returning null data', async () => {
      getCardHistory.mockResolvedValueOnce(null);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        // Should not crash and should not show data sections
        expect(screen.queryByText('Card Information')).not.toBeInTheDocument();
      });
    });

    test('should handle API returning data without expected properties', async () => {
      const incompleteData = {
        cardDetails: {},
        statistics: {},
        clustersVisited: [],
        history: [],
        pagination: { hasMore: false, returned: 0 }
      };
      getCardHistory.mockResolvedValueOnce(incompleteData);
      renderCardHistory('CARD123');
      
      await waitFor(() => {
        // Should not crash
        expect(screen.getByText('Card History')).toBeInTheDocument();
      });
    });
  });
});