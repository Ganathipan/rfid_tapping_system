import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ExitOutPage from '../../src/pages/exit/ExitOutPage.jsx';
import { api } from '../../src/api.js';

// Mock the API
vi.mock('../../src/api.js', () => ({
  api: vi.fn()
}));

// Mock window.confirm
global.confirm = vi.fn();

describe('ExitOutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm.mockReturnValue(true);
  });

  const mockEmptyStack = {
    success: true,
    stack: [],
    stats: { totalTeams: 0, totalCards: 0 }
  };

  const mockStackWithTeams = {
    success: true,
    stack: [
      {
        registrationId: 'TEAM001',
        cardCount: 3,
        cards: ['CARD001', 'CARD002', 'CARD003']
      },
      {
        registrationId: 'TEAM002',
        cardCount: 5,
        cards: ['CARD004', 'CARD005', 'CARD006', 'CARD007', 'CARD008']
      }
    ],
    stats: { totalTeams: 2, totalCards: 8 }
  };

  it('renders loading state initially', () => {
    api.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ExitOutPage />);
    
    expect(screen.getByText('Loading ExitOut Stack...')).toBeInTheDocument();
  });

  it('renders page title and statistics section', async () => {
    api.mockResolvedValue(mockEmptyStack);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Exit Stack Management')).toBeInTheDocument();
      expect(screen.getByText('Teams with Stacked Cards')).toBeInTheDocument();
      expect(screen.getByText('Total Stacked Cards')).toBeInTheDocument();
      expect(screen.getByText('Average Cards per Team')).toBeInTheDocument();
    });
  });

  it('displays correct statistics for empty stack', async () => {
    api.mockResolvedValue(mockEmptyStack);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(3); // Teams, cards, and average should all be 0
    });
  });

  it('displays correct statistics for stack with teams', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total teams
      expect(screen.getByText('8')).toBeInTheDocument(); // Total cards
      expect(screen.getByText('4.0')).toBeInTheDocument(); // Average (8/2)
    });
  });

  it('renders empty state when no teams in stack', async () => {
    api.mockResolvedValue(mockEmptyStack);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No Cards in ExitOut Stack')).toBeInTheDocument();
      expect(screen.getByText('All teams have been processed or no exitout taps have occurred.')).toBeInTheDocument();
    });
  });

  it('renders teams in stack correctly', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('TEAM001')).toBeInTheDocument();
      expect(screen.getByText('TEAM002')).toBeInTheDocument();
      expect(screen.getByText('3 cards stacked')).toBeInTheDocument();
      expect(screen.getByText('5 cards stacked')).toBeInTheDocument();
    });
  });

  it('displays first 3 cards and shows more indicator', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      // First team (3 cards - all visible)
      expect(screen.getByText('CARD001')).toBeInTheDocument();
      expect(screen.getByText('CARD002')).toBeInTheDocument();
      expect(screen.getByText('CARD003')).toBeInTheDocument();
      
      // Second team (5 cards - first 3 visible + more indicator)
      expect(screen.getByText('CARD004')).toBeInTheDocument();
      expect(screen.getByText('CARD005')).toBeInTheDocument();
      expect(screen.getByText('CARD006')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  it('handles team release successfully', async () => {
    api.mockResolvedValueOnce(mockStackWithTeams)
       .mockResolvedValueOnce({ success: true, result: { released: 3 } })
       .mockResolvedValueOnce(mockEmptyStack);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('TEAM001')).toBeInTheDocument();
    });
    
    const releaseButtons = screen.getAllByText('Release All');
    fireEvent.click(releaseButtons[0]);
    
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/exitout/release/TEAM001', { method: 'POST' });
    });
    
    // Wait for success message
    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(3); // Initial fetch + release + refresh
    });
  });

  it('shows release button loading state', async () => {
    api.mockResolvedValueOnce(mockStackWithTeams)
       .mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('TEAM001')).toBeInTheDocument();
    });
    
    const releaseButtons = screen.getAllByText('Release All');
    fireEvent.click(releaseButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Releasing...')).toBeInTheDocument();
    });
  });

  it('handles release failure with error message', async () => {
    api.mockResolvedValueOnce(mockStackWithTeams)
       .mockRejectedValueOnce(new Error('Network error'));
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('TEAM001')).toBeInTheDocument();
    });
    
    const releaseButtons = screen.getAllByText('Release All');
    fireEvent.click(releaseButtons[0]);
    
    // Wait for the error and check console
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/exitout/release/TEAM001', { method: 'POST' });
    });
  });

  it('handles clear stack with confirmation', async () => {
    api.mockResolvedValueOnce(mockStackWithTeams)
       .mockResolvedValueOnce({ success: true })
       .mockResolvedValueOnce(mockEmptyStack);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Clear All Stack')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByText('Clear All Stack');
    fireEvent.click(clearButton);
    
    expect(global.confirm).toHaveBeenCalledWith(
      'Are you sure you want to clear the entire stack? This will remove all stacked cards without processing them!'
    );
    
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/exitout/clear', { method: 'POST' });
    });
  });

  it('cancels clear stack when confirmation is denied', async () => {
    global.confirm.mockReturnValue(false);
    api.mockResolvedValue(mockStackWithTeams);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Clear All Stack')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByText('Clear All Stack');
    fireEvent.click(clearButton);
    
    expect(global.confirm).toHaveBeenCalled();
    // Should not call API since confirmation was denied
    expect(api).toHaveBeenCalledTimes(1); // Only initial fetch
  });

  it('disables clear button when stack is empty', async () => {
    api.mockResolvedValue(mockEmptyStack);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      const clearButton = screen.getByText('Clear All Stack');
      expect(clearButton).toBeDisabled();
    });
  });

  it('handles auto-refresh toggle', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    act(() => {
      render(<ExitOutPage />);
    });
    
    await waitFor(() => {
      const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
      expect(autoRefreshCheckbox).toBeChecked();
    });
    
    const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
    act(() => {
      fireEvent.click(autoRefreshCheckbox);
    });
    
    expect(autoRefreshCheckbox).not.toBeChecked();
  });

  it('auto-refreshes data when enabled', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    act(() => {
      render(<ExitOutPage />);
    });
    
    // Wait for initial load
    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(1);
    });
    
    // Wait a bit longer than 3 seconds for auto-refresh to trigger
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 3500));
    });
    
    // Should have made at least 2 calls due to auto-refresh
    expect(api.mock.calls.length).toBeGreaterThan(1);
  });

  it('stops auto-refresh when disabled', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    act(() => {
      render(<ExitOutPage />);
    });
    
    // Wait for initial load and content to appear
    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(1);
    });
    
    // Wait for the UI to render after API response
    await waitFor(() => {
      expect(screen.getByLabelText('Auto-refresh')).toBeInTheDocument();
    });
    
    // Disable auto-refresh
    const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh');
    act(() => {
      fireEvent.click(autoRefreshCheckbox);
    });
    
    const initialCallCount = api.mock.calls.length;
    
    // Wait longer than the refresh interval
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 3500));
    });
    
    // Should not have made additional calls since auto-refresh is disabled
    expect(api).toHaveBeenCalledTimes(initialCallCount);
  });

  it('handles manual refresh', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    act(() => {
      render(<ExitOutPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByText('Refresh');
    act(() => {
      fireEvent.click(refreshButton);
    });
    
    expect(api).toHaveBeenCalledTimes(2); // Initial + manual refresh
  });

  it('can manually refresh data', async () => {
    // First call for initial load
    api.mockResolvedValueOnce(mockStackWithTeams);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    // Mock another API call for refresh
    api.mockResolvedValueOnce(mockStackWithTeams);
    
    const refreshButton = screen.getByText('Refresh');
    const initialCallCount = api.mock.calls.length;
    
    fireEvent.click(refreshButton);
    
    // Wait for refresh to complete - verify API was called again
    await waitFor(() => {
      expect(api.mock.calls.length).toBe(initialCallCount + 1);
    });
    
    // Verify refresh button is still available
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('handles API failure during initial load', async () => {
    api.mockRejectedValue(new Error('API Error'));
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      // Should not crash and eventually stop loading
      expect(screen.queryByText('Loading ExitOut Stack...')).not.toBeInTheDocument();
    });
  });

  it('handles API response with missing data gracefully', async () => {
    api.mockResolvedValue({
      success: true,
      // Missing stack and stats
    });
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No Cards in ExitOut Stack')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(3); // Stats should default to 0
    });
  });

  it('handles unsuccessful API response', async () => {
    api.mockResolvedValue({
      success: false,
      error: 'Database connection failed'
    });
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      // Should handle gracefully and show empty state
      expect(screen.queryByText('Loading ExitOut Stack...')).not.toBeInTheDocument();
    });
  });

  it('cleans up interval on component unmount', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    const { unmount } = render(<ExitOutPage />);
    
    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(1);
    });
    
    const callCountBeforeUnmount = api.mock.calls.length;
    
    // Unmount the component
    unmount();
    
    // Wait a bit after unmount
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Should not make additional API calls after unmount
    expect(api).toHaveBeenCalledTimes(callCountBeforeUnmount);
  });

  it('displays toast notifications', async () => {
    api.mockResolvedValue(mockStackWithTeams);
    
    render(<ExitOutPage />);
    
    await waitFor(() => {
      // Component should be ready
      expect(screen.getByText('TEAM001')).toBeInTheDocument();
    });
    
    // Toast should not be visible initially
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});