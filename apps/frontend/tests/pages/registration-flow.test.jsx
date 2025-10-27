import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationFlow from '../../src/pages/RegistrationFlow.jsx';
import { api } from '../../src/api';

// Mock the API module
vi.mock('../../src/api', () => ({
  api: vi.fn()
}));

// Mock AdminPortal component
vi.mock('../../src/pages/AdminPortal', () => ({
  default: () => <div data-testid="admin-portal">Admin Portal</div>
}));

// Mock SelectField component
vi.mock('../../src/components/SelectField', () => ({
  default: ({ label, options, value, onChange, disabled }) => (
    <div data-testid="select-field">
      <label>{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={`select-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}));

// Mock Skeleton component
vi.mock('../../src/ui/Skeleton.jsx', () => ({
  Skeleton: ({ children, className, height }) => (
    <div 
      data-testid="skeleton" 
      className={className}
      style={{ height }}
    >
      {children}
    </div>
  )
}));

// Mock fetch for data loading
global.fetch = vi.fn();

describe('RegistrationFlow', () => {
  const mockProps = {
    selectedPortal: 'Portal-1',
    onRegistrationComplete: vi.fn(),
    onBack: vi.fn()
  };

  const mockProvinces = ['Western', 'Central', 'Southern'];
  const mockDistricts = { 'Western': ['Colombo', 'Gampaha'], 'Central': ['Kandy', 'Matale'] };
  const mockSchools = ['Royal College', 'Trinity College'];
  const mockUniversities = ['University of Colombo', 'University of Peradeniya'];
  const mockCardQueue = [
    { rfid_card_id: 'CARD001', first_seen: '2025-10-27T10:00:00Z', status: 'unassigned', portal: 'Portal-1' },
    { rfid_card_id: 'CARD002', first_seen: '2025-10-27T10:01:00Z', status: 'unassigned', portal: 'Portal-1' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful data fetches
    fetch.mockImplementation((url) => {
      if (url.includes('provinces.json')) {
        return Promise.resolve({ json: () => Promise.resolve(mockProvinces) });
      }
      if (url.includes('districts_by_province.json')) {
        return Promise.resolve({ json: () => Promise.resolve(mockDistricts) });
      }
      if (url.includes('universities.json')) {
        return Promise.resolve({ json: () => Promise.resolve(mockUniversities) });
      }
      if (url.includes('schools/')) {
        return Promise.resolve({ json: () => Promise.resolve(mockSchools) });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Mock API calls
    api.mockImplementation((endpoint) => {
      if (endpoint.includes('/api/tags/unassigned-fifo')) {
        return Promise.resolve(mockCardQueue);
      }
      if (endpoint.includes('/api/tags/register')) {
        return Promise.resolve({ id: 'REG123' });
      }
      if (endpoint.includes('/api/tags/link')) {
        return Promise.resolve({ tagId: 'CARD001' });
      }
      if (endpoint.includes('/api/tags/updateCount')) {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial rendering and data loading', () => {
    it('renders without crashing', () => {
      render(<RegistrationFlow {...mockProps} />);
      expect(screen.getByText('Registration Type')).toBeInTheDocument();
    });

    it('displays selected portal', () => {
      render(<RegistrationFlow {...mockProps} />);
      expect(screen.getByText('Portal-1')).toBeInTheDocument();
    });

    it('shows loading skeletons initially', () => {
      render(<RegistrationFlow {...mockProps} />);
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });

    it('loads provinces on mount', async () => {
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/data/provinces.json');
      });
    });

    it('loads universities on mount', async () => {
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/data/universities.json');
      });
    });

    it('hides loading skeletons after data loads', async () => {
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('Type selection', () => {
    it('renders registration type buttons', async () => {
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
        expect(screen.getByText('Batch Registration')).toBeInTheDocument();
        expect(screen.getByText('Admin Portal')).toBeInTheDocument();
      });
    });

    it('has back button', async () => {
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
    });

    it('calls onBack when back button clicked', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Back'));
      });
      
      expect(mockProps.onBack).toHaveBeenCalled();
    });

    it('navigates to individual form when individual selected', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      expect(screen.getByText('Province')).toBeInTheDocument();
    });

    it('navigates to batch form when batch selected', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Batch Registration'));
      });
      
      expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      expect(screen.getByText('Select Type')).toBeInTheDocument();
    });

    it('navigates to admin portal when admin selected', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Admin Portal'));
      });
      
      expect(screen.getByTestId('admin-portal')).toBeInTheDocument();
    });
  });

  describe('Individual registration form', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
    });

    it('renders individual form fields', () => {
      expect(screen.getByText('Province')).toBeInTheDocument();
      expect(screen.getByText('Age Range')).toBeInTheDocument();
      expect(screen.getByText('Sex')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('displays province buttons', async () => {
      await waitFor(() => {
        expect(screen.getByText('Western')).toBeInTheDocument();
        expect(screen.getByText('Central')).toBeInTheDocument();
        expect(screen.getByText('Southern')).toBeInTheDocument();
      });
    });

    it('displays age range options', () => {
      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.getByText('Teenager')).toBeInTheDocument();
      expect(screen.getByText('Adult')).toBeInTheDocument();
      expect(screen.getByText('Senior')).toBeInTheDocument();
    });

    it('displays sex options', () => {
      expect(screen.getByText('Male')).toBeInTheDocument();
      expect(screen.getByText('Female')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('displays language options', () => {
      expect(screen.getByText('Tamil')).toBeInTheDocument();
      expect(screen.getByText('Sinhala')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('has register button', () => {
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('has back button that returns to type selection', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        await user.click(screen.getByText('Back'));
      });
      
      expect(screen.getByText('Registration Type')).toBeInTheDocument();
    });

    it('loads districts when province selected', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Western')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Western'));
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/data/districts_by_province.json');
      });
    });

    it('allows selecting province, age, sex, and language', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Western')).toBeInTheDocument();
      });
      
      // Select province
      await act(async () => {
        await user.click(screen.getByText('Western'));
      });
      
      // Select age range
      await act(async () => {
        await user.click(screen.getByText('Adult'));
      });
      
      // Select sex
      await act(async () => {
        await user.click(screen.getByText('Male'));
      });
      
      // Select language
      await act(async () => {
        await user.click(screen.getByText('English'));
      });
      
      // Verify selections are highlighted (would have 'primary' class in real component)
      expect(screen.getByText('Western')).toBeInTheDocument();
      expect(screen.getByText('Adult')).toBeInTheDocument();
      expect(screen.getByText('Male')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('Batch registration form', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Batch Registration'));
      });
    });

    it('renders batch form fields', () => {
      expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      expect(screen.getByText('Select Type')).toBeInTheDocument();
    });

    it('displays batch type options', () => {
      expect(screen.getByText('School')).toBeInTheDocument();
      expect(screen.getByText('University')).toBeInTheDocument();
      expect(screen.getByText('General People')).toBeInTheDocument();
    });

    it('shows school fields when school type selected', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        await user.click(screen.getByText('School'));
      });
      
      expect(screen.getByText('Province')).toBeInTheDocument();
      expect(screen.getByText('Languages (Select up to 2)')).toBeInTheDocument();
    });

    it('shows university field when university type selected', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        await user.click(screen.getByText('University'));
      });
      
      expect(screen.getAllByText('University').length).toBeGreaterThan(1);
      expect(screen.getByText('Languages (Select up to 2)')).toBeInTheDocument();
    });

    it('shows general fields when general type selected', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        await user.click(screen.getByText('General People'));
      });
      
      expect(screen.getByText('Province')).toBeInTheDocument();
      expect(screen.getByText('Languages (Select up to 2)')).toBeInTheDocument();
    });

    it('has continue button', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        await user.click(screen.getByText('School'));
      });
      
      expect(screen.getByText('Continue to RFID Count')).toBeInTheDocument();
    });

    it('allows selecting multiple languages up to 2', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        await user.click(screen.getByText('School'));
      });
      
      // Select first language
      await act(async () => {
        await user.click(screen.getByText('Tamil'));
      });
      
      // Select second language
      await act(async () => {
        await user.click(screen.getByText('English'));
      });
      
      // Verify both languages are available
      expect(screen.getByText('Tamil')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('SearchableSelect component', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Batch Registration'));
      });
      
      await act(async () => {
        await user.click(screen.getByText('University'));
      });
    });

    it('renders searchable select for university', async () => {
      await waitFor(() => {
        expect(screen.getAllByText('University').length).toBeGreaterThan(1);
        expect(screen.getByPlaceholderText('Search for a university...')).toBeInTheDocument();
      });
    });

    it('allows typing in search input', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search for a university...')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Search for a university...');
      
      await act(async () => {
        await user.type(input, 'Colombo');
      });
      
      expect(input.value).toBe('Colombo');
    });

    it('opens dropdown when input focused', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search for a university...')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Search for a university...');
      
      await act(async () => {
        await user.click(input);
      });
      
      // The dropdown should open (though we can't easily test the CSS-based visibility)
      expect(input).toBe(document.activeElement);
    });
  });

  describe('RFID card queue', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      // Fill out form
      await waitFor(() => {
        expect(screen.getByText('Western')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Western'));
        await user.click(screen.getByText('Adult'));
        await user.click(screen.getByText('Male'));
        await user.click(screen.getByText('English'));
      });
      
      // Submit form to go to tap step
      await act(async () => {
        await user.click(screen.getByText('Register'));
      });
    });

    it('displays queue title', async () => {
      await waitFor(() => {
        expect(screen.getByText('Tapped Cards Queue (FIFO)')).toBeInTheDocument();
      });
    });

    it('shows refresh button for queue', async () => {
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });

    it('displays card queue items', async () => {
      await waitFor(() => {
        expect(screen.getByText('NEXT: CARD001')).toBeInTheDocument();
        expect(screen.getByText('CARD002')).toBeInTheDocument();
      });
    });

    it('shows tap RFID card button', async () => {
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Tap RFID Card' })).toBeInTheDocument();
      });
    });

    it('fetches queue data on load', async () => {
      await waitFor(() => {
        expect(api).toHaveBeenCalledWith('/api/tags/unassigned-fifo?portal=Portal-1');
      });
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors gracefully for provinces', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText('Registration Type')).toBeInTheDocument();
      });
    });

    it('handles API errors for card queue', async () => {
      api.mockRejectedValueOnce(new Error('API Error'));
      
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      // Component should handle API error gracefully - it stays on individual form
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('displays error message when queue fetch fails', async () => {
      api.mockRejectedValueOnce(new Error('Failed to load queue'));
      
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      // Fill out form and submit to trigger queue fetch
      await waitFor(() => {
        expect(screen.getByText('Western')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Western'));
        await user.click(screen.getByText('Adult'));
        await user.click(screen.getByText('Male'));
        await user.click(screen.getByText('English'));
        await user.click(screen.getByText('Register'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('allows back navigation from individual form', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      
      await act(async () => {
        await user.click(screen.getByText('Back'));
      });
      
      expect(screen.getByText('Registration Type')).toBeInTheDocument();
    });

    it('allows back navigation from batch form', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Batch Registration'));
      });
      
      expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      
      await act(async () => {
        await user.click(screen.getByText('Back'));
      });
      
      expect(screen.getByText('Registration Type')).toBeInTheDocument();
    });

    it('allows back navigation from admin portal', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Portal')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Admin Portal'));
      });
      
      expect(screen.getByTestId('admin-portal')).toBeInTheDocument();
      
      await act(async () => {
        await user.click(screen.getByText('Back'));
      });
      
      expect(screen.getByText('Registration Type')).toBeInTheDocument();
    });
  });

  describe('Form validation and submission', () => {
    it('allows form submission with valid individual data', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Western')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Western'));
        await user.click(screen.getByText('Adult'));
        await user.click(screen.getByText('Male'));
        await user.click(screen.getByText('English'));
        await user.click(screen.getByText('Register'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Please tap RFID card to complete registration.')).toBeInTheDocument();
      });
    });

    it('allows batch form submission', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Batch Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Batch Registration'));
      });
      
      await act(async () => {
        await user.click(screen.getByText('School'));
        await user.click(screen.getByText('Western'));
        await user.click(screen.getByText('Tamil'));
        await user.click(screen.getByText('Continue to RFID Count'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Count Batch Members')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', async () => {
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Individual Registration' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Batch Registration' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      });
    });

    it('provides proper labels for form elements', async () => {
      const user = userEvent.setup();
      render(<RegistrationFlow {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Individual Registration')).toBeInTheDocument();
      });
      
      await act(async () => {
        await user.click(screen.getByText('Individual Registration'));
      });
      
      expect(screen.getByText('Province')).toBeInTheDocument();
      expect(screen.getByText('Age Range')).toBeInTheDocument();
      expect(screen.getByText('Sex')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
    });
  });
});