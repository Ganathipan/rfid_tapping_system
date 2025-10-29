/**
 * Comprehensive Unit Tests for Registration Form Component
 * Tests form validation, submission, error handling, and edge cases
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegistrationForm from '../../src/pages/registration/RegistrationForm.jsx';
import { api } from '../../src/api.js';

// Mock the API
vi.mock('../../src/api.js', () => ({
  api: vi.fn()
}));

// Mock MemberAssignment component
vi.mock('../../src/pages/registration/MemberAssignment', () => ({
  default: ({ portal, leaderId, memberCount, onDone }) => (
    <div data-testid="member-assignment">
      <div>Portal: {portal}</div>
      <div>Leader ID: {leaderId}</div>
      <div>Member Count: {memberCount}</div>
      <button onClick={onDone}>Done</button>
    </div>
  )
}));

describe('RegistrationForm Component - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Don't use fake timers globally as they interfere with async operations
  });

  afterEach(() => {
    // Clean up any remaining timers
    vi.useRealTimers();
  });

  const renderRegistrationForm = () => {
    return render(
      <MemoryRouter>
        <RegistrationForm />
      </MemoryRouter>
    );
  };

  describe('Form Rendering and Initial State', () => {
    test('should render all form elements with correct initial values', () => {
      renderRegistrationForm();

      expect(screen.getByText('RFID Registration')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Portal name (e.g., portal1)')).toHaveValue('');
      expect(screen.getByPlaceholderText('Leader/Individual name')).toHaveValue('');
      expect(screen.getByText('Tags assigned:')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('should have correct placeholder texts', () => {
      renderRegistrationForm();

      expect(screen.getByPlaceholderText('Portal name (e.g., portal1)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Leader/Individual name')).toBeInTheDocument();
    });

    test('should have correct button labels and initial states', () => {
      renderRegistrationForm();

      const submitButton = screen.getByText('Submit & Assign Tag');
      const confirmButton = screen.getByText('Confirm and Exit');

      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    test('should enable submit button when name is filled', () => {
      renderRegistrationForm();

      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      expect(submitButton).toBeEnabled();
    });

    test('should disable submit button when name is empty or whitespace only', () => {
      renderRegistrationForm();

      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      const submitButton = screen.getByText('Submit & Assign Tag');

      // Empty name
      fireEvent.change(nameInput, { target: { value: '' } });
      expect(submitButton).toBeDisabled();

      // Whitespace only
      fireEvent.change(nameInput, { target: { value: '   ' } });
      expect(submitButton).toBeDisabled();
    });

    test('should enable confirm button when tags are assigned', async () => {
      api.mockResolvedValueOnce({ id: 123 }) // register
         .mockResolvedValueOnce({ tagId: 'TAG001' }); // link

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      // Wait for the success message to appear
      await waitFor(() => {
        const elements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('✅ Tag #123 linked with tag TAG001') ?? false;
        });
        expect(elements.length).toBeGreaterThan(0);
      });

      // Verify count updated to 1
      expect(screen.getByText('1')).toBeInTheDocument();

      // Verify confirm button is now enabled
      const confirmButton = screen.getByText('Confirm and Exit');
      expect(confirmButton).toBeEnabled();
    });
  });

  describe('Registration and Linking Process', () => {
    test('should handle successful registration and linking', async () => {
      api.mockResolvedValueOnce({ id: 123 }) // register
         .mockResolvedValueOnce({ tagId: 'TAG001' }); // link

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      // Wait for the success message
      await waitFor(() => {
        const elements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('✅ Tag #123 linked with tag TAG001') ?? false;
        });
        expect(elements.length).toBeGreaterThan(0);
      });

      // Verify the API calls were made correctly
      expect(api).toHaveBeenCalledWith('/api/tags/register', {
        method: 'POST',
        body: {
          portal: 'portal1',
          name: 'John Doe',
          group_size: 1,
          province: null,
          district: null,
          school: null,
          university: null,
          age_range: null,
          sex: null,
          lang: null
        }
      });

      expect(api).toHaveBeenCalledWith('/api/tags/link', {
        method: 'POST',
        body: { portal: 'portal1', leaderId: 123, asLeader: true }
      });

      expect(screen.getByText('1')).toBeInTheDocument(); // Count should be updated
    });

    test('should handle registration failure', async () => {
      api.mockRejectedValueOnce(new Error('Portal is required'));

      renderRegistrationForm();

      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('❌ Portal is required')).toBeInTheDocument();
      });
    });

    test('should handle linking failure after successful registration', async () => {
      let callCount = 0;
      api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ id: 123 }); // register succeeds
        if (callCount === 2) return Promise.reject(new Error('Tag linking failed')); // link fails
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        // The component shows either a portal validation error or link failure
        const errorElements = screen.queryAllByText((content, element) => {
          return element?.textContent?.includes('❌') ?? false;
        });
        expect(errorElements.length).toBeGreaterThan(0);
        expect(screen.getByText('Retry Linking')).toBeInTheDocument();
      });
    });

    test('should retry linking with existing leader ID', async () => {
      // Set up mock calls: register succeeds, first link fails, retry link succeeds
      let callCount = 0;
      api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ id: 123 }); // register
        if (callCount === 2) return Promise.reject(new Error('Network error')); // first link fails
        if (callCount === 3) return Promise.resolve({ tagId: 'TAG001' }); // retry link succeeds
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const networkErrorElements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('❌ Network error') ?? false;
        });
        expect(networkErrorElements.length).toBeGreaterThan(0);
        expect(screen.getByText('Retry Linking')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry Linking');
      fireEvent.click(retryButton);

      await waitFor(() => {
        const successElements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('✅ Tag #123 linked with tag TAG001') ?? false;
        });
        expect(successElements.length).toBeGreaterThan(0);
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    test('should disable inputs after pending registration', async () => {
      api.mockResolvedValueOnce({ id: 123 }) // register
         .mockRejectedValueOnce(new Error('Link failed')); // link fails

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(portalInput).toBeDisabled();
        expect(nameInput).toBeDisabled();
        expect(screen.getByText('Start New Registration')).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset Functionality', () => {
    test('should reset form when Start New Registration is clicked', async () => {
      let callCount = 0;
      api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ id: 123 }); // register succeeds
        if (callCount === 2) return Promise.reject(new Error('Link failed')); // link fails
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      // First wait for the error state (which means registration succeeded but linking failed)
      await waitFor(() => {
        const linkFailedElements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('❌ Link failed') ?? false;
        });
        expect(linkFailedElements.length).toBeGreaterThan(0);
      });

      // Now the Start New Registration button should be visible
      await waitFor(() => {
        expect(screen.getByText('Start New Registration')).toBeInTheDocument();
      });

      const resetButton = screen.getByText('Start New Registration');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(portalInput).toBeEnabled();
        expect(nameInput).toBeEnabled();
        expect(nameInput).toHaveValue('');
        expect(screen.getByText('0')).toBeInTheDocument(); // Count reset
        expect(screen.getByText(/🔁 Reset — you can create a new registration now/)).toBeInTheDocument();
      });
    });
  });

  describe('Confirm and Exit Process', () => {
    test('should handle successful confirm and exit', async () => {
      // Set up mock calls in order: register, link, updateCount
      let callCount = 0;
      api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ id: 123 }); // register
        if (callCount === 2) return Promise.resolve({ tagId: 'TAG001' }); // link
        if (callCount === 3) return Promise.resolve({}); // updateCount
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      // Register and link first
      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      // Wait for successful registration and linking
      await waitFor(() => {
        const elements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('✅ Tag #123 linked with tag TAG001') ?? false;
        });
        expect(elements.length).toBeGreaterThan(0);
      });
      
      // Verify count updated to 1
      expect(screen.getByText('1')).toBeInTheDocument();

      // Now confirm and exit
      const confirmButton = screen.getByText('Confirm and Exit');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/✅ Count updated and exiting/)).toBeInTheDocument();
      });

      expect(api).toHaveBeenCalledWith('/api/tags/updateCount', {
        method: 'POST',
        body: { portal: 'portal1', count: 1 }
      });

      // Wait for the setTimeout reset to complete (1500ms)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Portal name (e.g., portal1)')).toHaveValue('');
        expect(screen.getByPlaceholderText('Leader/Individual name')).toHaveValue('');
        expect(screen.getByText('0')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should handle confirm and exit failure', async () => {
      // Set up mock calls in order: register, link, updateCount (fails)
      let callCount = 0;
      api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ id: 123 }); // register
        if (callCount === 2) return Promise.resolve({ tagId: 'TAG001' }); // link
        if (callCount === 3) return Promise.reject(new Error('Database error')); // updateCount fails
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      // Register and link first
      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      // Wait for successful registration and linking
      await waitFor(() => {
        const elements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('✅ Tag #123 linked with tag TAG001') ?? false;
        });
        expect(elements.length).toBeGreaterThan(0);
      });
      
      // Verify count updated to 1
      expect(screen.getByText('1')).toBeInTheDocument();

      // Now confirm and exit
      const confirmButton = screen.getByText('Confirm and Exit');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Error updating count: Database error/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States and Button Disabling', () => {
    test('should disable buttons during async operations', async () => {
      api.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    test('should prevent double submission', async () => {
      let resolveFirst;
      api.mockImplementation(() => new Promise(resolve => { resolveFirst = resolve; }));

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      
      // Click multiple times quickly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      // Should only be called once
      expect(api).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty portal validation during registration', async () => {
      renderRegistrationForm();

      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('❌ Portal is required') ?? false;
        })[0]; // Get the first occurrence
        expect(errorMessage).toBeInTheDocument();
      });
    });

    test('should handle empty name validation during registration', async () => {
      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      fireEvent.change(portalInput, { target: { value: 'portal1' } });

      // Don't set name - button should be disabled
      const submitButton = screen.getByText('Submit & Assign Tag');
      expect(submitButton).toBeDisabled();
    });

    test('should handle multiple tag assignments', async () => {
      // Set up successful registration and two linking calls
      let callCount = 0;
      api.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ id: 123 }); // register
        if (callCount === 2) return Promise.resolve({ tagId: 'TAG001' }); // first link
        if (callCount === 3) return Promise.resolve({ tagId: 'TAG002' }); // second link
        return Promise.reject(new Error('Unexpected API call'));
      });

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      // First assignment - this does register + link
      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // Second assignment - this should only do link (no register since pendingLeaderId exists)
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Message Display and Styling', () => {
    test('should display pending registration info', async () => {
      // Set up successful registration but failed linking
      api
        .mockResolvedValueOnce({ id: 123 }) // first call: register succeeds
        .mockRejectedValueOnce(new Error('Link failed')); // second call: link fails

      renderRegistrationForm();

      const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
      const nameInput = screen.getByPlaceholderText('Leader/Individual name');
      fireEvent.change(portalInput, { target: { value: 'portal1' } });
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      const submitButton = screen.getByText('Submit & Assign Tag');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const elements = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('Pending Registration:') ?? false;
        });
        expect(elements[0]).toBeInTheDocument();
        expect(screen.getByText('#123')).toBeInTheDocument();
      });
    });

    test('should show correct tag count styling', () => {
      renderRegistrationForm();

      const countElement = screen.getByText('0');
      expect(countElement.closest('span')).toHaveStyle({ color: 'rgb(0, 0, 255)' });
    });

    test('should apply correct CSS classes', () => {
      const { container } = renderRegistrationForm();

      expect(container.querySelector('.btn.primary')).toBeInTheDocument();
      expect(container.querySelector('.row')).toBeInTheDocument();
      expect(container.querySelector('.hr')).toBeInTheDocument();
      expect(container.querySelector('.small.mut')).toBeInTheDocument();
    });
  });

  describe('Member Assignment Integration', () => {
    test('should not show member assignment initially', () => {
      renderRegistrationForm();

      expect(screen.queryByTestId('member-assignment')).not.toBeInTheDocument();
    });

    // Note: Full member assignment testing would require more complex state manipulation
    // that goes beyond the current component's visible interface
  });
});