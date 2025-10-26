/**
 * Unit Tests for CardHistory Component
 * Tests card history search, display, and error handling
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CardHistory from '../../src/pages/CardHistory.jsx';

describe('CardHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCardHistory = () => {
    return render(
      <MemoryRouter initialEntries={['/card-history']}>
        <CardHistory />
      </MemoryRouter>
    );
  };

  test('should render card ID required message when no card ID provided', () => {
    // Act
    renderCardHistory();

    // Assert
    expect(screen.getByText('Card ID is required')).toBeInTheDocument();
  });
});