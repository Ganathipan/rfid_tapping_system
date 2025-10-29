import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortalSelection from '../../src/pages/registration/PortalSelection.jsx';

// Mock the Button component
vi.mock('../../src/ui/Button.jsx', () => ({
  default: ({ children, onClick, disabled, className, variant }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
      data-testid="mock-button"
    >
      {children}
    </button>
  )
}));

describe('PortalSelection', () => {
  const mockOnPortalSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByText('Select Portal')).toBeInTheDocument();
    });

    it('renders all portal selection buttons', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByText('Portal 1')).toBeInTheDocument();
      expect(screen.getByText('Portal 2')).toBeInTheDocument();
      expect(screen.getByText('Portal 3')).toBeInTheDocument();
    });

    it('renders portal descriptions', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByText('Registration Portal 1')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 2')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 3')).toBeInTheDocument();
    });

    it('renders the continue button initially disabled', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it('displays the correct heading', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByRole('heading', { name: 'Select Portal' })).toBeInTheDocument();
    });

    it('displays the instruction text', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByText('Choose which portal you want to access')).toBeInTheDocument();
    });
  });

  describe('Portal selection functionality', () => {
    it('selects portal 1 when clicked', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      fireEvent.click(portal1Button);
      
      // Check if the button gets selected styling (selected class)
      await waitFor(() => {
        expect(portal1Button.closest('div')).toHaveClass('selected');
      });
    });

    it('selects portal 2 when clicked', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal2Button = screen.getByText('Portal 2');
      fireEvent.click(portal2Button);
      
      await waitFor(() => {
        expect(portal2Button.closest('div')).toHaveClass('selected');
      });
    });

    it('selects portal 3 when clicked', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal3Button = screen.getByText('Portal 3');
      fireEvent.click(portal3Button);
      
      await waitFor(() => {
        expect(portal3Button.closest('div')).toHaveClass('selected');
      });
    });

    it('enables continue button when a portal is selected', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
      
      const portal1Button = screen.getByText('Portal 1');
      fireEvent.click(portal1Button);
      
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
    });

    it('allows switching between different portals', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const portal2Button = screen.getByText('Portal 2');
      
      // Select portal 1 first
      fireEvent.click(portal1Button);
      await waitFor(() => {
        expect(portal1Button.closest('div')).toHaveClass('selected');
      });
      
      // Switch to portal 2
      fireEvent.click(portal2Button);
      await waitFor(() => {
        expect(portal2Button.closest('div')).toHaveClass('selected');
        expect(portal1Button.closest('div')).not.toHaveClass('selected');
      });
    });
  });

  describe('Continue button functionality', () => {
    it('calls onPortalSelect with correct portal when continue is clicked', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      fireEvent.click(portal1Button);
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
      
      fireEvent.click(continueButton);
      
      expect(mockOnPortalSelect).toHaveBeenCalledWith('portal1');
      expect(mockOnPortalSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onPortalSelect with portal2', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal2Button = screen.getByText('Portal 2');
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      fireEvent.click(portal2Button);
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
      
      fireEvent.click(continueButton);
      
      expect(mockOnPortalSelect).toHaveBeenCalledWith('portal2');
    });

    it('calls onPortalSelect with portal3', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal3Button = screen.getByText('Portal 3');
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      fireEvent.click(portal3Button);
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
      
      fireEvent.click(continueButton);
      
      expect(mockOnPortalSelect).toHaveBeenCalledWith('portal3');
    });

    it('does not call onPortalSelect when continue is clicked without selection', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Should not be clickable when disabled, but testing the logic
      expect(continueButton).toBeDisabled();
      expect(mockOnPortalSelect).not.toHaveBeenCalled();
    });
  });

  describe('Styling and visual states', () => {
    it('applies correct styling to unselected portal buttons', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const buttonContainer = portal1Button.closest('div');
      
      expect(buttonContainer).toHaveClass('portal-card');
      expect(buttonContainer).not.toHaveClass('selected');
    });

    it('applies correct styling to selected portal button', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      fireEvent.click(portal1Button);
      
      await waitFor(() => {
        const buttonContainer = portal1Button.closest('div');
        expect(buttonContainer).toHaveClass('portal-card', 'selected');
      });
    });

    it('shows correct button states for continue button', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Initially disabled
      expect(continueButton).toBeDisabled();
      
      // After selection, enabled
      const portal1Button = screen.getByText('Portal 1');
      fireEvent.click(portal1Button);
      
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
    });

    it('applies correct variant to continue button', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const continueButton = screen.getByTestId('mock-button');
      expect(continueButton).toHaveAttribute('data-variant', 'primary');
    });
  });

  describe('Component structure', () => {
    it('renders all portal items correctly', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      // Check for portal presence (exact matches for names only)
      expect(screen.getByText('Portal 1')).toBeInTheDocument();
      expect(screen.getByText('Portal 2')).toBeInTheDocument();
      expect(screen.getByText('Portal 3')).toBeInTheDocument();
    });

    it('maintains correct component hierarchy', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const container = screen.getByRole('heading', { name: 'Select Portal' }).parentElement;
      expect(container).toBeInTheDocument();
    });

    it('renders portal descriptions correctly', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByText('Registration Portal 1')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 2')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 3')).toBeInTheDocument();
    });

    it('renders portal cards with correct class names', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const buttonContainer = portal1Button.closest('div');
      
      expect(buttonContainer).toHaveClass('portal-card');
    });
  });

  describe('Props handling', () => {
    it('handles missing onPortalSelect prop gracefully', () => {
      // Should not crash if prop is missing
      expect(() => {
        render(<PortalSelection />);
      }).not.toThrow();
    });

    it('calls onPortalSelect prop when provided', async () => {
      const customCallback = vi.fn();
      
      render(<PortalSelection onPortalSelect={customCallback} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      fireEvent.click(portal1Button);
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });
      
      fireEvent.click(continueButton);
      
      expect(customCallback).toHaveBeenCalledWith('portal1');
    });
  });

  describe('State management', () => {
    it('maintains selected portal state correctly', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const portal2Button = screen.getByText('Portal 2');
      
      // Select portal 1
      fireEvent.click(portal1Button);
      await waitFor(() => {
        expect(portal1Button.closest('div')).toHaveClass('selected');
      });
      
      // Select portal 2 - should deselect portal 1
      fireEvent.click(portal2Button);
      await waitFor(() => {
        expect(portal2Button.closest('div')).toHaveClass('selected');
        expect(portal1Button.closest('div')).not.toHaveClass('selected');
      });
    });

    it('resets selection state when different portal is selected', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portals = [
        { button: screen.getByText('Portal 1'), id: 'portal1' },
        { button: screen.getByText('Portal 2'), id: 'portal2' },
        { button: screen.getByText('Portal 3'), id: 'portal3' }
      ];
      
      // Test that only one portal can be selected at a time
      for (let i = 0; i < portals.length; i++) {
        fireEvent.click(portals[i].button);
        
        await waitFor(() => {
          expect(portals[i].button.closest('div')).toHaveClass('selected');
        });
        
        // Check that all other portals are deselected
        for (let j = 0; j < portals.length; j++) {
          if (i !== j) {
            expect(portals[j].button.closest('div')).not.toHaveClass('selected');
          }
        }
      }
    });

    it('initializes with no portal selected', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const portal2Button = screen.getByText('Portal 2');
      const portal3Button = screen.getByText('Portal 3');
      
      expect(portal1Button.closest('div')).not.toHaveClass('selected');
      expect(portal2Button.closest('div')).not.toHaveClass('selected');
      expect(portal3Button.closest('div')).not.toHaveClass('selected');
    });
  });

  describe('Portal data structure', () => {
    it('renders portals based on data array', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      // Should render exactly 3 portals based on the data array
      const portalCards = screen.getByText('Portal 1').closest('div').parentElement.children;
      expect(portalCards).toHaveLength(3);
    });

    it('maps portal data correctly to DOM elements', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      // Check that each portal has its corresponding description
      expect(screen.getByText('Portal 1')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 1')).toBeInTheDocument();
      
      expect(screen.getByText('Portal 2')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 2')).toBeInTheDocument();
      
      expect(screen.getByText('Portal 3')).toBeInTheDocument();
      expect(screen.getByText('Registration Portal 3')).toBeInTheDocument();
    });
  });

  describe('Interactive behavior', () => {
    it('handles rapid clicks correctly', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const portal2Button = screen.getByText('Portal 2');
      
      // Rapidly click between portals
      fireEvent.click(portal1Button);
      fireEvent.click(portal2Button);
      fireEvent.click(portal1Button);
      
      await waitFor(() => {
        expect(portal1Button.closest('div')).toHaveClass('selected');
        expect(portal2Button.closest('div')).not.toHaveClass('selected');
      });
    });

    it('maintains focus behavior on portal selection', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      
      // Should be clickable
      fireEvent.click(portal1Button);
      
      expect(portal1Button.closest('div')).toHaveClass('selected');
    });
  });

  describe('CSS styling integration', () => {
    it('applies inline styles correctly', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const heading = screen.getByText('Select Portal');
      expect(heading).toHaveStyle({ marginTop: '0px', textAlign: 'center' });
      
      const instruction = screen.getByText('Choose which portal you want to access');
      expect(instruction).toHaveStyle({ textAlign: 'center', marginBottom: '30px' });
    });

    it('applies conditional styling based on selection state', async () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const portal1Button = screen.getByText('Portal 1');
      const portal1Card = portal1Button.closest('div');
      
      // Before selection - should not have selected styling
      expect(portal1Card).not.toHaveClass('selected');
      
      // After selection - should have selected styling
      fireEvent.click(portal1Button);
      
      await waitFor(() => {
        expect(portal1Card).toHaveClass('selected');
      });
    });
  });

  describe('Accessibility features', () => {
    it('provides proper semantic structure', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('maintains keyboard accessibility for buttons', () => {
      render(<PortalSelection onPortalSelect={mockOnPortalSelect} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Button should be present and have proper role
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toHaveAttribute('data-testid', 'mock-button');
    });
  });
});