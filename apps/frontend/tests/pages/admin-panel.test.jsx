import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPanel from '../../src/pages/AdminPanel.jsx';
import { api } from '../../src/api.js';

// Mock the API
vi.mock('../../src/api.js', () => ({
  api: vi.fn()
}));

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCards = [
    {
      rfid_card_id: 'CARD001',
      status: 'active',
      user_id: 123,
      user_name: 'John Doe',
      group_id: null,
      organization: null
    },
    {
      rfid_card_id: 'CARD002',
      status: 'inactive',
      user_id: null,
      user_name: null,
      group_id: 456,
      organization: 'Test Organization'
    },
    {
      rfid_card_id: 'CARD003',
      status: 'pending',
      user_id: null,
      user_name: null,
      group_id: null,
      organization: null
    }
  ];

  it('renders admin panel with title and list button', () => {
    render(<AdminPanel />);
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('List Cards')).toBeInTheDocument();
  });

  it('displays no cards message initially', () => {
    render(<AdminPanel />);
    
    expect(screen.getByText('No cards yet.')).toBeInTheDocument();
  });

  it('loads and displays cards when list button is clicked', async () => {
    api.mockResolvedValue(mockCards);
    
    render(<AdminPanel />);
    
    const listButton = screen.getByText('List Cards');
    fireEvent.click(listButton);
    
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/tags/list-cards');
      expect(screen.getByText('CARD001')).toBeInTheDocument();
      expect(screen.getByText('CARD002')).toBeInTheDocument();
      expect(screen.getByText('CARD003')).toBeInTheDocument();
    });
  });

  it('displays table headers when cards are loaded', async () => {
    api.mockResolvedValue(mockCards);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('Card')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Holder')).toBeInTheDocument();
    });
  });

  it('displays card information correctly for user card', async () => {
    api.mockResolvedValue([mockCards[0]]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('CARD001')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('User #123 (John Doe)')).toBeInTheDocument();
    });
  });

  it('displays card information correctly for group card', async () => {
    api.mockResolvedValue([mockCards[1]]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('CARD002')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
      expect(screen.getByText('Group #456 (Test Organization)')).toBeInTheDocument();
    });
  });

  it('displays dash for unassigned card', async () => {
    api.mockResolvedValue([mockCards[2]]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('CARD003')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      // Should show dash for unassigned card
      const holderCells = screen.getAllByText('—');
      expect(holderCells.length).toBeGreaterThan(0);
    });
  });

  it('handles user card without name', async () => {
    const cardWithoutName = {
      rfid_card_id: 'CARD004',
      status: 'active',
      user_id: 789,
      user_name: null,
      group_id: null,
      organization: null
    };
    
    api.mockResolvedValue([cardWithoutName]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('User #789 (—)')).toBeInTheDocument();
    });
  });

  it('handles group card without organization', async () => {
    const groupCardWithoutOrg = {
      rfid_card_id: 'CARD005',
      status: 'active',
      user_id: null,
      user_name: null,
      group_id: 999,
      organization: null
    };
    
    api.mockResolvedValue([groupCardWithoutOrg]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('Group #999 (—)')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = 'Failed to fetch cards';
    api.mockRejectedValue(new Error(errorMessage));
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('clears error message when list cards is called again', async () => {
    // First call fails
    api.mockRejectedValueOnce(new Error('Network error'));
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    
    // Second call succeeds
    api.mockResolvedValue(mockCards);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      expect(screen.getByText('CARD001')).toBeInTheDocument();
    });
  });

  it('handles empty response from API', async () => {
    api.mockResolvedValue([]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/tags/list-cards');
      expect(screen.getByText('No cards yet.')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes and styling', () => {
    const { container } = render(<AdminPanel />);
    
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('card');
    
    const hr = container.querySelector('.hr');
    expect(hr).toBeInTheDocument();
    
    const list = container.querySelector('.list');
    expect(list).toHaveClass('small');
  });

  it('displays card IDs with monospace font', async () => {
    api.mockResolvedValue([mockCards[0]]);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      const cardCell = screen.getByText('CARD001');
      expect(cardCell).toHaveClass('mono');
    });
  });

  it('handles multiple API calls correctly', async () => {
    api.mockResolvedValueOnce([mockCards[0]]);
    
    render(<AdminPanel />);
    
    // First call
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('CARD001')).toBeInTheDocument();
    });
    
    // Second call with different data
    api.mockResolvedValueOnce([mockCards[1]]);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('CARD002')).toBeInTheDocument();
      expect(screen.queryByText('CARD001')).not.toBeInTheDocument();
    });
  });

  it('maintains proper table structure', async () => {
    api.mockResolvedValue(mockCards);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const thead = table.querySelector('thead');
      expect(thead).toBeInTheDocument();
      
      const tbody = table.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      
      const rows = tbody.querySelectorAll('tr');
      expect(rows).toHaveLength(mockCards.length);
    });
  });

  it('renders all card statuses correctly', async () => {
    const cardsWithDifferentStatuses = [
      { ...mockCards[0], status: 'active' },
      { ...mockCards[1], status: 'inactive' },
      { ...mockCards[2], status: 'pending' },
      { rfid_card_id: 'CARD004', status: 'blocked', user_id: null, group_id: null }
    ];
    
    api.mockResolvedValue(cardsWithDifferentStatuses);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('blocked')).toBeInTheDocument();
    });
  });

  it('handles cards with unique key correctly', async () => {
    const cardsWithSameId = [
      { rfid_card_id: 'DUPLICATE', status: 'active', user_id: 1, group_id: null },
      { rfid_card_id: 'DUPLICATE', status: 'inactive', user_id: 2, group_id: null }
    ];
    
    api.mockResolvedValue(cardsWithSameId);
    
    render(<AdminPanel />);
    
    fireEvent.click(screen.getByText('List Cards'));
    
    await waitFor(() => {
      const duplicateCards = screen.getAllByText('DUPLICATE');
      expect(duplicateCards).toHaveLength(2);
    });
  });
});