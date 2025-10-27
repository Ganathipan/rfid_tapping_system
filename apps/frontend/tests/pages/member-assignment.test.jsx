import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MemberAssignment from '../../src/pages/MemberAssignment.jsx';
import { api } from '../../src/api';

// Mock the API
vi.mock('../../src/api', () => ({
  api: vi.fn()
}));

describe('MemberAssignment', () => {
  const defaultProps = {
    portal: 'test-portal',
    leaderId: 'leader123',
    memberCount: 3,
    onDone: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial rendering', () => {
    it('renders without crashing', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      expect(screen.getByText('Assign RFID Tag to Member 1 of 3')).toBeInTheDocument();
    });

    it('displays correct heading with member count', () => {
      render(<MemberAssignment {...defaultProps} memberCount={5} />);
      
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Assign RFID Tag to Member 1 of 5');
    });

    it('shows assign tag button', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('shows empty message initially', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const messageDiv = screen.getByText('', { selector: '.small.mut' });
      expect(messageDiv).toBeInTheDocument();
    });

    it('shows empty error list initially', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const errorList = screen.getByRole('list');
      expect(errorList).toBeInTheDocument();
      expect(errorList).toBeEmptyDOMElement();
    });

    it('renders horizontal divider', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const divider = document.querySelector('.hr');
      expect(divider).toBeInTheDocument();
    });
  });

  describe('Tag assignment process', () => {
    it('calls API with correct parameters on assign tag click', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      expect(api).toHaveBeenCalledWith('/api/tags/link', {
        method: 'POST',
        body: { portal: 'test-portal', leaderId: 'leader123', asLeader: false }
      });
    });

    it('disables button while processing', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      expect(button).toBeDisabled();
    });

    it('shows success message after successful assignment', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('✅ Member 1 assigned tag TAG123')).toBeInTheDocument();
      });
    });

    it('increments member count after successful assignment', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Assign RFID Tag to Member 2 of 3')).toBeInTheDocument();
      });
    });

    it('enables button after successful assignment', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('handles multiple successful assignments', async () => {
      const mockResponse1 = { tagId: 'TAG123' };
      const mockResponse2 = { tagId: 'TAG456' };
      api.mockResolvedValueOnce(mockResponse1);
      api.mockResolvedValueOnce(mockResponse2);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      
      // First assignment
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('✅ Member 1 assigned tag TAG123')).toBeInTheDocument();
      });
      
      // Second assignment
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('✅ Member 2 assigned tag TAG456')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Assign RFID Tag to Member 3 of 3')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows error message when API call fails', async () => {
      const errorMessage = 'Network connection failed';
      api.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(`❌ ${errorMessage}`)).toBeInTheDocument();
      });
    });

    it('adds error to error list when assignment fails', async () => {
      const errorMessage = 'Tag assignment failed';
      api.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Member 1: Tag assignment failed')).toBeInTheDocument();
      });
    });

    it('enables button after error', async () => {
      api.mockRejectedValueOnce(new Error('Test error'));
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('does not increment member count on error', async () => {
      api.mockRejectedValueOnce(new Error('Test error'));
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Test error')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Assign RFID Tag to Member 1 of 3')).toBeInTheDocument();
    });

    it('accumulates multiple errors', async () => {
      api.mockRejectedValueOnce(new Error('First error'));
      api.mockRejectedValueOnce(new Error('Second error'));
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      
      // First error
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('❌ Member 1: First error')).toBeInTheDocument();
      });
      
      // Second error
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('❌ Member 1: Second error')).toBeInTheDocument();
      });
      
      // Both errors should be visible
      expect(screen.getByText('❌ Member 1: First error')).toBeInTheDocument();
      expect(screen.getByText('❌ Member 1: Second error')).toBeInTheDocument();
    });

    it('continues assignment process after error', async () => {
      api.mockRejectedValueOnce(new Error('First assignment failed'));
      api.mockResolvedValueOnce({ tagId: 'TAG456' });
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      
      // First assignment fails
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('❌ Member 1: First assignment failed')).toBeInTheDocument();
      });
      
      // Second assignment succeeds
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('✅ Member 1 assigned tag TAG456')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Assign RFID Tag to Member 2 of 3')).toBeInTheDocument();
    });
  });

  describe('Completion state', () => {
    it('shows completion screen when all members are assigned', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValue(mockResponse);
      
      render(<MemberAssignment {...defaultProps} memberCount={1} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('All members assigned!')).toBeInTheDocument();
      });
    });

    it('shows back to home button in completion state', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValue(mockResponse);
      
      render(<MemberAssignment {...defaultProps} memberCount={1} />);
      
      const assignButton = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: 'Back to Home' });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('calls onDone when back to home button is clicked', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValue(mockResponse);
      const onDoneMock = vi.fn();
      
      render(<MemberAssignment {...defaultProps} memberCount={1} onDone={onDoneMock} />);
      
      const assignButton = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: 'Back to Home' });
        fireEvent.click(backButton);
      });
      
      expect(onDoneMock).toHaveBeenCalledTimes(1);
    });

    it('shows error list in completion state', async () => {
      api.mockRejectedValueOnce(new Error('Assignment failed'));
      api.mockResolvedValueOnce({ tagId: 'TAG456' });
      
      render(<MemberAssignment {...defaultProps} memberCount={1} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      
      // First assignment fails
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('❌ Member 1: Assignment failed')).toBeInTheDocument();
      });
      
      // Second assignment succeeds and completes
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('All members assigned!')).toBeInTheDocument();
      });
      
      // Error should still be visible in completion state
      expect(screen.getByText('❌ Member 1: Assignment failed')).toBeInTheDocument();
    });

    it('does not show assign tag button in completion state', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValue(mockResponse);
      
      render(<MemberAssignment {...defaultProps} memberCount={1} />);
      
      const assignButton = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        expect(screen.getByText('All members assigned!')).toBeInTheDocument();
      });
      
      expect(screen.queryByRole('button', { name: 'Assign Tag' })).not.toBeInTheDocument();
    });
  });

  describe('Component props handling', () => {
    it('uses correct portal in API call', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} portal="custom-portal" />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      expect(api).toHaveBeenCalledWith('/api/tags/link', {
        method: 'POST',
        body: { portal: 'custom-portal', leaderId: 'leader123', asLeader: false }
      });
    });

    it('uses correct leaderId in API call', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} leaderId="custom-leader" />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      expect(api).toHaveBeenCalledWith('/api/tags/link', {
        method: 'POST',
        body: { portal: 'test-portal', leaderId: 'custom-leader', asLeader: false }
      });
    });

    it('always sets asLeader to false in API call', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValueOnce(mockResponse);
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      expect(api).toHaveBeenCalledWith('/api/tags/link', {
        method: 'POST',
        body: { portal: 'test-portal', leaderId: 'leader123', asLeader: false }
      });
    });

    it('handles different member counts correctly', () => {
      render(<MemberAssignment {...defaultProps} memberCount={10} />);
      
      expect(screen.getByText('Assign RFID Tag to Member 1 of 10')).toBeInTheDocument();
    });
  });

  describe('CSS classes and styling', () => {
    it('applies correct CSS classes to completion heading', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValue(mockResponse);
      
      render(<MemberAssignment {...defaultProps} memberCount={1} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 3 });
        expect(heading).toHaveTextContent('All members assigned!');
      });
    });

    it('applies correct CSS classes to assign button', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      expect(button).toHaveClass('btn', 'primary');
    });

    it('applies correct CSS classes to back button', async () => {
      const mockResponse = { tagId: 'TAG123' };
      api.mockResolvedValue(mockResponse);
      
      render(<MemberAssignment {...defaultProps} memberCount={1} />);
      
      const assignButton = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: 'Back to Home' });
        expect(backButton).toHaveClass('btn', 'primary');
      });
    });

    it('applies correct CSS classes to message div', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const messageDiv = document.querySelector('.small.mut');
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveStyle({ marginTop: '10px' });
    });

    it('applies correct CSS classes to row containers', () => {
      render(<MemberAssignment {...defaultProps} />);
      
      const rowDiv = document.querySelector('.row');
      expect(rowDiv).toBeInTheDocument();
      expect(rowDiv).toHaveStyle({ marginTop: '10px' });
    });

    it('styles error list items correctly', async () => {
      api.mockRejectedValueOnce(new Error('Test error'));
      
      render(<MemberAssignment {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Assign Tag' });
      fireEvent.click(button);
      
      await waitFor(() => {
        const errorItem = screen.getByText('❌ Member 1: Test error');
        const listItem = errorItem.closest('li');
        expect(listItem).toHaveAttribute('style', 'color: red;');
      });
    });
  });
});