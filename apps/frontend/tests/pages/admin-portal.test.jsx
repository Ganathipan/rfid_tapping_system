import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminPortal from '../../src/pages/admin/AdminPortal.jsx';
import * as api from '../../src/api.js';

// Mock the API module
vi.mock('../../src/api.js', () => ({
  api: vi.fn(),
  readerConfig: {
    list: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock data
const mockRegistrations = [
  {
    id: 1,
    portal: 'portal1',
    province: 'Western',
    district: 'Colombo',
    school: 'Test School',
    age_range: '18-25',
    sex: 'M',
    group_size: 5
  },
  {
    id: 2,
    portal: 'portal2',
    province: 'Central',
    district: 'Kandy',
    university: 'Test University',
    age_range: '20-25',
    sex: 'F',
    group_size: 3
  },
  {
    id: 3,
    portal: 'portal3',
    province: 'Southern',
    district: 'Galle',
    age_range: '25-30',
    sex: 'M',
    group_size: 1
  }
];

const mockCards = [
  { id: 'CARD001', status: 'assigned' },
  { id: 'CARD002', status: 'available' },
  { id: 'CARD003', status: 'assigned' },
  { id: 'CARD004', status: 'available' }
];

const mockReaderConfig = [
  { r_index: 0, reader_id: 'REGISTER', portal: 'portal1', updated_at: '2025-10-27T00:00:00Z' },
  { r_index: 1, reader_id: 'CLUSTER1', portal: 'portal2', updated_at: '2025-10-27T01:00:00Z' }
];

const renderAdminPortal = () => {
  return render(
    <BrowserRouter>
      <AdminPortal />
    </BrowserRouter>
  );
};

describe('AdminPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.api.mockResolvedValue([]);
    api.readerConfig.list.mockResolvedValue([]);
    api.readerConfig.upsert.mockResolvedValue({});
    api.readerConfig.remove.mockResolvedValue({});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading skeletons initially', () => {
      api.api.mockImplementation(() => new Promise(() => {})); // Never resolves
      api.readerConfig.list.mockImplementation(() => new Promise(() => {}));
      
      renderAdminPortal();
      
      // Should show skeleton loading states
      const skeletons = document.querySelectorAll('.animate-pulse, [class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Loading', () => {
    it('should load and display admin data successfully', async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations) // /api/tags/admin/registrations
        .mockResolvedValueOnce(mockCards) // /api/tags/list-cards
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Card History Lookup')).toBeInTheDocument();
      });

      // Check statistics display - use getAllByText for numbers that appear multiple times
      expect(screen.getByText('Total Records')).toBeInTheDocument();
      expect(screen.getAllByText('3')).toHaveLength(3); // Total records, table rows, group size
      expect(screen.getByText('Total People')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument(); // Total people (5+3+1)
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Failed to load admin data';
      api.api.mockRejectedValue(new Error(errorMessage));
      api.readerConfig.list.mockRejectedValue(new Error('Reader config error'));
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should calculate statistics correctly', async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        // Check that statistics are displayed
        expect(screen.getByText('Total Records')).toBeInTheDocument();
        expect(screen.getByText('Total People')).toBeInTheDocument();
        expect(screen.getByText('Individuals (general)')).toBeInTheDocument();
        expect(screen.getByText('Batches (school+univ)')).toBeInTheDocument();
      });
    });
  });

  describe('Card History Lookup', () => {
    beforeEach(async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Card History Lookup')).toBeInTheDocument();
      });
    });

    it('should handle card ID input and navigation', async () => {
      const cardInput = screen.getByPlaceholderText(/Enter RFID Card ID/);
      const viewButton = screen.getByText('View History');
      
      // Initially button should be disabled
      expect(viewButton).toBeDisabled();
      
      // Enter card ID
      fireEvent.change(cardInput, { target: { value: 'ABC123' } });
      expect(viewButton).not.toBeDisabled();
      
      // Click view history
      fireEvent.click(viewButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/card-history/ABC123');
    });

    it('should handle Enter key press for lookup', async () => {
      const cardInput = screen.getByPlaceholderText(/Enter RFID Card ID/);
      
      fireEvent.change(cardInput, { target: { value: 'TEST123' } });
      fireEvent.keyPress(cardInput, { key: 'Enter', charCode: 13 });
      
      expect(mockNavigate).toHaveBeenCalledWith('/admin/card-history/TEST123');
    });

    it('should not navigate with empty card ID', async () => {
      const cardInput = screen.getByPlaceholderText(/Enter RFID Card ID/);
      const viewButton = screen.getByText('View History');
      
      fireEvent.change(cardInput, { target: { value: '   ' } }); // Only spaces
      fireEvent.click(viewButton);
      
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Registration Filtering', () => {
    beforeEach(async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Filter by type:')).toBeInTheDocument();
      });
    });

    it('should filter registrations by school type', async () => {
      const filterSelect = screen.getByDisplayValue('All');
      
      fireEvent.change(filterSelect, { target: { value: 'school' } });
      
      await waitFor(() => {
        // Should show only school registration
        expect(screen.getByText('Test School')).toBeInTheDocument();
        expect(screen.queryByText('Test University')).not.toBeInTheDocument();
      });
    });

    it('should filter registrations by university type', async () => {
      const filterSelect = screen.getByDisplayValue('All');
      
      fireEvent.change(filterSelect, { target: { value: 'university' } });
      
      await waitFor(() => {
        // Should show only university registration
        expect(screen.getByText('Test University')).toBeInTheDocument();
        expect(screen.queryByText('Test School')).not.toBeInTheDocument();
      });
    });

    it('should filter registrations by general type', async () => {
      const filterSelect = screen.getByDisplayValue('All');
      
      fireEvent.change(filterSelect, { target: { value: 'general' } });
      
      await waitFor(() => {
        // Should show only general registration (no school/university)
        expect(screen.queryByText('Test School')).not.toBeInTheDocument();
        expect(screen.queryByText('Test University')).not.toBeInTheDocument();
        // Should show the general registration row
        expect(screen.getByText('Southern')).toBeInTheDocument();
      });
    });

    it('should show all registrations when filter is cleared', async () => {
      const filterSelect = screen.getByDisplayValue('All');
      
      // First filter
      fireEvent.change(filterSelect, { target: { value: 'school' } });
      
      // Then clear filter
      fireEvent.change(filterSelect, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test School')).toBeInTheDocument();
        expect(screen.getByText('Test University')).toBeInTheDocument();
      });
    });
  });

  describe('Reader Configuration Management', () => {
    beforeEach(async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Reader Configuration')).toBeInTheDocument();
      });
    });

    it('should display reader configuration table', async () => {
      expect(screen.getByText('REGISTER')).toBeInTheDocument();
      expect(screen.getByText('CLUSTER1')).toBeInTheDocument();
      expect(screen.getAllByText('portal1')).toHaveLength(2); // appears in both tables
      expect(screen.getAllByText('portal2')).toHaveLength(2); // appears in both tables
    });

    it('should handle adding new reader configuration', async () => {
      api.readerConfig.upsert.mockResolvedValue({});
      api.readerConfig.list.mockResolvedValue([...mockReaderConfig, 
        { r_index: 2, reader_id: 'CLUSTER2', portal: 'portal3', updated_at: '2025-10-27T02:00:00Z' }
      ]);
      
      // Fill form - use more specific selectors
      const inputs = document.querySelectorAll('input');
      const rIndexInput = inputs[1]; // second input (first is card lookup)
      const readerIdInput = screen.getByPlaceholderText('e.g., REGISTER or CLUSTER1');
      const portalInput = screen.getByPlaceholderText('e.g., portal1 or reader1');
      const saveButton = screen.getByText('Save');
      
      fireEvent.change(rIndexInput, { target: { value: '2' } });
      fireEvent.change(readerIdInput, { target: { value: 'CLUSTER2' } });
      fireEvent.change(portalInput, { target: { value: 'portal3' } });
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(api.readerConfig.upsert).toHaveBeenCalledWith({
          r_index: 2,
          reader_id: 'CLUSTER2',
          portal: 'portal3'
        });
      });
    });

    it('should validate reader configuration form', async () => {
      const saveButton = screen.getByText('Save');
      
      // Try to save with invalid rIndex
      const inputs = document.querySelectorAll('input');
      const rIndexInput = inputs[1]; // second input (first is card lookup)
      fireEvent.change(rIndexInput, { target: { value: '-1' } });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('rIndex must be a non-negative integer')).toBeInTheDocument();
      });
      
      // Try to save with missing fields
      fireEvent.change(rIndexInput, { target: { value: '1' } });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('readerID and portal are required')).toBeInTheDocument();
      });
    });

    it('should handle edit reader configuration', async () => {
      const editButtons = screen.getAllByText('Edit');
      
      fireEvent.click(editButtons[0]);
      
      // Form should be populated with existing values
      const rIndexInput = screen.getByDisplayValue('0');
      const readerIdInput = screen.getByDisplayValue('REGISTER');
      const portalInput = screen.getByDisplayValue('portal1');
      
      expect(rIndexInput.value).toBe('0');
      expect(readerIdInput.value).toBe('REGISTER');
      expect(portalInput.value).toBe('portal1');
    });

    it('should handle delete reader configuration', async () => {
      api.readerConfig.remove.mockResolvedValue({});
      api.readerConfig.list.mockResolvedValue([mockReaderConfig[1]]); // Remove first item
      
      const deleteButtons = screen.getAllByText('Delete');
      
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(api.readerConfig.remove).toHaveBeenCalledWith(0);
      });
    });

    it('should handle reader configuration API errors', async () => {
      api.readerConfig.upsert.mockRejectedValue(new Error('Failed to save config'));
      
      const inputs = document.querySelectorAll('input');
      const rIndexInput = inputs[1]; // second input (first is card lookup)
      const readerIdInput = screen.getByPlaceholderText('e.g., REGISTER or CLUSTER1');
      const portalInput = screen.getByPlaceholderText('e.g., portal1 or reader1');
      const saveButton = screen.getByText('Save');
      
      fireEvent.change(rIndexInput, { target: { value: '2' } });
      fireEvent.change(readerIdInput, { target: { value: 'CLUSTER2' } });
      fireEvent.change(portalInput, { target: { value: 'portal3' } });
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save config')).toBeInTheDocument();
      });
    });

    it('should handle delete configuration errors', async () => {
      api.readerConfig.remove.mockRejectedValue(new Error('Failed to delete'));
      
      const deleteButtons = screen.getAllByText('Delete');
      
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to delete')).toBeInTheDocument();
      });
    });
  });

  describe('Registration Table Display', () => {
    beforeEach(async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Total Records')).toBeInTheDocument();
      });
    });

    it('should display registration table with correct headers', () => {
      const headers = ['#', 'ID', 'Portal', 'Type', 'Province', 'District', 'School/University', 'Age', 'Sex', 'Size'];
      
      headers.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument();
      });
    });

    it('should display registration data correctly', () => {
      // Check first registration (school)
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getAllByText('portal1')).toHaveLength(2); // appears in table and reader config
      expect(screen.getByText('school')).toBeInTheDocument();
      expect(screen.getByText('Test School')).toBeInTheDocument();
      expect(screen.getAllByText('5')).toHaveLength(1); // group size
      
      // Check second registration (university)  
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('university')).toBeInTheDocument();
      expect(screen.getByText('Test University')).toBeInTheDocument();
      expect(screen.getAllByText('3')).toHaveLength(3); // appears in total records, table row, and group size
    });

    it('should handle missing data gracefully', () => {
      // The third registration has no school/university, should show '-'
      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe('RFID Cards Statistics', () => {
    it('should load card data for statistics calculations', async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Total Records')).toBeInTheDocument();
      });
      
      // Verify that API calls were made to fetch card data
      expect(api.api).toHaveBeenCalledWith('/api/tags/list-cards');
    });
  });

  describe('Component Integration', () => {
    it('should handle component unmounting gracefully', async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      
      const { unmount } = renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Card History Lookup')).toBeInTheDocument();
      });
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should clear form after successful save', async () => {
      api.api
        .mockResolvedValueOnce(mockRegistrations)
        .mockResolvedValueOnce(mockCards);
      api.readerConfig.list.mockResolvedValue(mockReaderConfig);
      api.readerConfig.upsert.mockResolvedValue({});
      
      renderAdminPortal();
      
      await waitFor(() => {
        expect(screen.getByText('Reader Configuration')).toBeInTheDocument();
      });
      
      const inputs = document.querySelectorAll('input');
      const rIndexInput = inputs[1]; // second input (first is card lookup)
      const readerIdInput = screen.getByPlaceholderText('e.g., REGISTER or CLUSTER1');
      const portalInput = screen.getByPlaceholderText('e.g., portal1 or reader1');
      const saveButton = screen.getByText('Save');
      
      fireEvent.change(rIndexInput, { target: { value: '2' } });
      fireEvent.change(readerIdInput, { target: { value: 'TEST' } });
      fireEvent.change(portalInput, { target: { value: 'test' } });
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(rIndexInput.value).toBe('');
        expect(readerIdInput.value).toBe('');
        expect(portalInput.value).toBe('');
      });
    });
  });
});