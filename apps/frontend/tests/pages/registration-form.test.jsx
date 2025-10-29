/**
 * Unit Tests for Registration Form Component
 * Tests form validation, submission, and error handling
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegistrationForm from '../../src/pages/registration/RegistrationForm.jsx';

describe('RegistrationForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRegistrationForm = () => {
    return render(
      <MemoryRouter>
        <RegistrationForm />
      </MemoryRouter>
    );
  };

  test('should render registration form with all required fields', () => {
    // Act
    renderRegistrationForm();

    // Assert
    expect(screen.getByText('RFID Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Portal name (e.g., portal1)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Leader/Individual name')).toBeInTheDocument();
    expect(screen.getByText('Submit & Assign Tag')).toBeInTheDocument();
    expect(screen.getByText('Confirm and Exit')).toBeInTheDocument();
  });

  test('should display name input field', () => {
    // Act
    renderRegistrationForm();

    // Assert
    expect(screen.getByPlaceholderText('Leader/Individual name')).toBeInTheDocument();
    expect(screen.getByText('Tags assigned:')).toBeInTheDocument();
  });

  test('should validate required fields', () => {
    // Act
    renderRegistrationForm();

    const submitButton = screen.getByText('Submit & Assign Tag');
    
    // Assert - Submit button should be disabled when name is empty
    expect(submitButton).toBeDisabled();
  });

  test('should enable submit when fields are filled', () => {
    // Act
    renderRegistrationForm();

    const portalInput = screen.getByPlaceholderText('Portal name (e.g., portal1)');
    const nameInput = screen.getByPlaceholderText('Leader/Individual name');
    
    fireEvent.change(portalInput, { target: { value: 'portal1' } });
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    const submitButton = screen.getByText('Submit & Assign Tag');

    // Assert - Submit button should be enabled
    expect(submitButton).toBeEnabled();
  });

  test('should show tags assigned counter', () => {
    // Act
    renderRegistrationForm();

    // Assert
    expect(screen.getByText('Tags assigned:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Initial count
  });

  test('should disable confirm and exit when no tags assigned', () => {
    // Act
    renderRegistrationForm();

    const confirmButton = screen.getByText('Confirm and Exit');

    // Assert
    expect(confirmButton).toBeDisabled();
  });
});