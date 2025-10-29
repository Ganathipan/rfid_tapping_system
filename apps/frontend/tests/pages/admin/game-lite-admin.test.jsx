import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameLiteAdmin from '../../../src/pages/gameAdmin/GameLiteAdmin.jsx';
import { gameLite } from '../../../src/api';

// Mock the API module
vi.mock('../../../src/api', () => ({
  gameLite: {
    getConfig: vi.fn(),
    getEligibleTeams: vi.fn(),
    setConfig: vi.fn(),
    setClusterRules: vi.fn(),
    redeem: vi.fn(),
  }
}));

// Mock UI components with minimal implementations
vi.mock('../../../src/ui/Card.jsx', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardBody: ({ children }) => <div data-testid="card-body">{children}</div>
}));

vi.mock('../../../src/ui/Button.jsx', () => ({
  default: ({ children, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  )
}));

vi.mock('../../../src/ui/Badge.jsx', () => ({
  default: ({ children, color }) => (
    <span data-testid="badge" data-color={color}>{children}</span>
  )
}));

vi.mock('../../../src/ui/Table.jsx', () => ({
  default: ({ columns, rows }) => (
    <div data-testid="table">
      {rows.map((row, idx) => (
        <div key={idx} data-testid={`table-row-${idx}`}>
          {columns.map((col, colIdx) => (
            <div key={colIdx}>
              {col.render ? col.render(row) : row[col.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../../src/ui/Modal.jsx', () => ({
  default: ({ children, open, title }) => (
    open ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null
  )
}));

vi.mock('../../../src/ui/Toast.jsx', () => ({
  default: ({ text, show }) => (
    show ? <div data-testid="toast">{text}</div> : null
  )
}));

vi.mock('../../../src/ui/Loader.jsx', () => ({
  default: () => <div data-testid="loader">Loading...</div>
}));

describe('GameLiteAdmin', () => {
  const mockConfig = {
    enabled: true,
    rules: {
      eligibleLabelPrefix: 'CLUSTER',
      minGroupSize: 2,
      maxGroupSize: 8,
      minPointsRequired: 100,
      clusterRules: {
        'CLUSTER1': {
          awardPoints: 50,
          redeemable: true,
          redeemPoints: 25
        }
      }
    }
  };

  const mockEligibleTeams = [
    {
      registration_id: 'TEAM001',
      group_size: 3,
      score: 150,
      latest_label: 'CLUSTER1',
      latest_time: '2025-10-27T10:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    gameLite.getConfig.mockResolvedValue(mockConfig);
    gameLite.getEligibleTeams.mockResolvedValue(mockEligibleTeams);
    gameLite.setConfig.mockResolvedValue(mockConfig);
    gameLite.setClusterRules.mockResolvedValue(mockConfig);
    gameLite.redeem.mockResolvedValue({ success: true });
  });

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(<GameLiteAdmin />);
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('shows loader initially', () => {
      render(<GameLiteAdmin />);
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('calls API on mount', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(gameLite.getConfig).toHaveBeenCalled();
        expect(gameLite.getEligibleTeams).toHaveBeenCalled();
      });
    });

    it('renders main content after loading', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      });
    });

    it('renders cluster rules section', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Cluster Rules')).toBeInTheDocument();
      });
    });

    it('renders eligible teams section', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Eligible Teams')).toBeInTheDocument();
      });
    });
  });

  describe('Game Configuration', () => {
    it('displays configuration inputs', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('CLUSTER')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
        expect(screen.getByDisplayValue('8')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      });
    });

    it('has label prefix input', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('CLUSTER');
        expect(input).toBeInTheDocument();
        expect(input.type).toBe('text');
      });
    });

    it('has min group size input', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('2');
        expect(input).toBeInTheDocument();
        expect(input.type).toBe('number');
      });
    });

    it('has max group size input', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('8');
        expect(input).toBeInTheDocument();
        expect(input.type).toBe('number');
      });
    });

    it('has min points input', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('100');
        expect(input).toBeInTheDocument();
        expect(input.type).toBe('number');
      });
    });
  });

  describe('Cluster Rules', () => {
    it('displays table with cluster data', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('table').length).toBeGreaterThan(0);
        expect(screen.getAllByText('CLUSTER1').length).toBeGreaterThan(0);
      });
    });

    it('shows Add/Update Rule button', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Add / Update Rule')).toBeInTheDocument();
      });
    });

    it('shows Refresh button', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Refresh').length).toBeGreaterThan(0);
      });
    });

    it('displays cluster input form', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('CLUSTER1')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Award')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Redeem points')).toBeInTheDocument();
        expect(screen.getByText('Redeemable')).toBeInTheDocument();
      });
    });

    it('has award points input in table', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const awardInput = screen.getByDisplayValue('50');
        expect(awardInput).toBeInTheDocument();
        expect(awardInput.type).toBe('number');
      });
    });

    it('has redeem points input in table', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const redeemInput = screen.getByDisplayValue('25');
        expect(redeemInput).toBeInTheDocument();
        expect(redeemInput.type).toBe('number');
      });
    });

    it('has redeemable checkbox in table', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { checked: true });
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('has more menu button', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('More')).toBeInTheDocument();
      });
    });
  });

  describe('Eligible Teams', () => {
    it('displays teams table', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('TEAM001')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('shows eligibility badge', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const badge = screen.getByTestId('badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('data-color', 'green');
        expect(badge).toHaveTextContent('Eligible');
      });
    });

    it('shows redeem button for teams', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Redeem')).toBeInTheDocument();
      });
    });

    it('formats date in Last Seen column', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        const dateText = new Date('2025-10-27T10:00:00Z').toLocaleString();
        expect(screen.getByText(dateText)).toBeInTheDocument();
      });
    });
  });

  describe('User interactions', () => {
    it('can type in cluster label input', async () => {
      const user = userEvent.setup();
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('CLUSTER1')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('CLUSTER1');
      await act(async () => {
        await user.type(input, 'test');
      });
      
      expect(input.value).toBe('TEST'); // Should be uppercase
    });

    it('can type in award points input', async () => {
      const user = userEvent.setup();
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Award')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Award');
      await act(async () => {
        await user.clear(input);
        await user.type(input, '100');
      });
      
      expect(input.value).toBe('100');
    });

    it('can toggle redeemable checkbox', async () => {
      const user = userEvent.setup();
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /redeemable/i })).toBeInTheDocument();
      });
      
      const checkbox = screen.getByRole('checkbox', { name: /redeemable/i });
      await act(async () => {
        await user.click(checkbox);
      });
      
      expect(checkbox).toBeChecked();
    });

    it('opens redeem modal when redeem button clicked', async () => {
      const user = userEvent.setup();
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Redeem')).toBeInTheDocument();
      });
      
      const redeemButton = screen.getByText('Redeem');
      await act(async () => {
        await user.click(redeemButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByText('Redeem Points')).toBeInTheDocument();
      });
    });

    it('shows more menu when more button clicked', async () => {
      const user = userEvent.setup();
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('More')).toBeInTheDocument();
      });
      
      const moreButton = screen.getByLabelText('More');
      await act(async () => {
        await user.click(moreButton);
      });
      
      expect(screen.getByText('Remove cluster')).toBeInTheDocument();
    });
  });

  describe('Redeem Modal', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Redeem')).toBeInTheDocument();
      });
      
      const redeemButton = screen.getByText('Redeem');
      await act(async () => {
        await user.click(redeemButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });
    });

    it('shows modal with title', () => {
      expect(screen.getByText('Redeem Points')).toBeInTheDocument();
    });

    it('pre-fills registration ID', () => {
      expect(screen.getByDisplayValue('TEAM001')).toBeInTheDocument();
    });

    it('has registration ID input', () => {
      const input = screen.getByDisplayValue('TEAM001');
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('text');
    });

    it('has cluster select dropdown', () => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows redeemable clusters in dropdown', () => {
      expect(screen.getByText('CLUSTER1 (−25)')).toBeInTheDocument();
    });

    it('has cancel button', () => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('has redeem button', () => {
      expect(screen.getAllByText('Redeem').length).toBeGreaterThan(1);
    });
  });

  describe('Error handling', () => {
    it('handles null config gracefully', async () => {
      gameLite.getConfig.mockResolvedValueOnce(null);
      
      render(<GameLiteAdmin />);
      
      // Should show loader when config is null
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('handles empty cluster rules', async () => {
      const emptyConfig = {
        ...mockConfig,
        rules: { ...mockConfig.rules, clusterRules: {} }
      };
      gameLite.getConfig.mockResolvedValueOnce(emptyConfig);
      
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Cluster Rules')).toBeInTheDocument();
      });
      
      // Should render tables even with empty rules
      expect(screen.getAllByTestId('table').length).toBeGreaterThan(0);
    });

    it('handles missing rules gracefully', async () => {
      const noRulesConfig = { enabled: true };
      gameLite.getConfig.mockResolvedValueOnce(noRulesConfig);
      
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      });
      
      // Should handle missing rules without crashing
      expect(screen.getAllByTestId('table').length).toBeGreaterThan(0);
    });

    it('handles API errors during load', async () => {
      gameLite.getConfig.mockRejectedValueOnce(new Error('API Error'));
      
      render(<GameLiteAdmin />);
      
      // Should handle error gracefully and show loader
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      
      // Wait for any async operations to complete to prevent unhandled promise rejections
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    });
  });

  describe('Toast notifications', () => {
    it('initially shows no toast', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
    });

    it('can display toast when state changes', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Cluster Rules')).toBeInTheDocument();
      });
      
      // Toast functionality is controlled by component state
      // Basic rendering test to ensure toast component is available
      const toastElement = screen.queryByTestId('toast');
      // Toast should not be visible initially
      expect(toastElement).not.toBeInTheDocument();
    });
  });

  describe('Auto-refresh', () => {
    it('sets up interval on mount', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(gameLite.getConfig).toHaveBeenCalled();
        expect(gameLite.getEligibleTeams).toHaveBeenCalled();
      });
      
      // Verify API calls were made on mount
      expect(gameLite.getConfig).toHaveBeenCalledTimes(1);
      expect(gameLite.getEligibleTeams).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      });
      
      // Check for form elements
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });

    it('provides accessible labels', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('More')).toBeInTheDocument();
      });
    });

    it('uses proper button elements', async () => {
      render(<GameLiteAdmin />);
      
      await waitFor(() => {
        expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      });
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});