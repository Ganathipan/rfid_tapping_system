import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Confirmation from '../../src/pages/admin/Confirmation.jsx';

// Mock the UI components
vi.mock('../../src/ui/Button.jsx', () => ({
  default: ({ children, variant, className, ...props }) => (
    <button 
      data-testid="mock-button"
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('../../src/ui/Card.jsx', () => ({
  Card: ({ children, className, ...props }) => (
    <div 
      data-testid="mock-card"
      className={className}
      {...props}
    >
      {children}
    </div>
  ),
  CardBody: ({ children, className, ...props }) => (
    <div 
      data-testid="mock-card-body"
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}));

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

describe('Confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      expect(screen.getByText('Registration Complete')).toBeInTheDocument();
    });

    it('renders with default props', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      expect(screen.getByText('Registration Complete')).toBeInTheDocument();
      expect(screen.getByText('Your team is ready to go!')).toBeInTheDocument();
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
    });

    it('renders the success checkmark icon', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      expect(screen.getByText('✅')).toBeInTheDocument();
    });

    it('renders the main heading with correct level', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Registration Complete');
    });

    it('renders the CTA button', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const button = screen.getByTestId('mock-button');
      expect(button).toHaveTextContent('Back to Home');
    });
  });

  describe('Props customization', () => {
    it('renders custom title', () => {
      render(
        <TestWrapper>
          <Confirmation title="Custom Success Title" />
        </TestWrapper>
      );
      
      expect(screen.getByText('Custom Success Title')).toBeInTheDocument();
      expect(screen.queryByText('Registration Complete')).not.toBeInTheDocument();
    });

    it('renders custom subtitle', () => {
      render(
        <TestWrapper>
          <Confirmation subtitle="Custom success message here" />
        </TestWrapper>
      );
      
      expect(screen.getByText('Custom success message here')).toBeInTheDocument();
      expect(screen.queryByText('Your team is ready to go!')).not.toBeInTheDocument();
    });

    it('renders custom CTA text', () => {
      render(
        <TestWrapper>
          <Confirmation ctaText="Continue to Dashboard" />
        </TestWrapper>
      );
      
      expect(screen.getByText('Continue to Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Back to Home')).not.toBeInTheDocument();
    });

    it('creates link with custom path', () => {
      render(
        <TestWrapper>
          <Confirmation ctaPath="/admin/dashboard" />
        </TestWrapper>
      );
      
      const link = screen.getByText('Back to Home').closest('a');
      expect(link).toHaveAttribute('href', '/admin/dashboard');
    });

    it('handles all custom props together', () => {
      render(
        <TestWrapper>
          <Confirmation 
            title="Task Completed"
            subtitle="Everything is set up correctly"
            ctaText="Go to Settings"
            ctaPath="/settings"
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('Task Completed')).toBeInTheDocument();
      expect(screen.getByText('Everything is set up correctly')).toBeInTheDocument();
      expect(screen.getByText('Go to Settings')).toBeInTheDocument();
      
      const link = screen.getByText('Go to Settings').closest('a');
      expect(link).toHaveAttribute('href', '/settings');
    });
  });

  describe('Component structure', () => {
    it('renders within proper container layout', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const container = screen.getByText('Registration Complete').closest('[class*="min-h"]');
      expect(container).toHaveClass('min-h-[70vh]', 'grid', 'place-items-center');
    });

    it('applies correct styling to Card component', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const card = screen.getByTestId('mock-card');
      expect(card).toHaveClass(
        'bg-gradient-to-b',
        'from-white/[0.02]',
        'to-white/[0.01]',
        'rounded-3xl'
      );
    });

    it('applies correct styling to CardBody component', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const cardBody = screen.getByTestId('mock-card-body');
      expect(cardBody).toHaveClass('text-center', 'p-8');
    });

    it('structures icon container correctly', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const iconContainer = screen.getByText('✅').parentElement;
      expect(iconContainer).toHaveClass(
        'mx-auto',
        'mb-4',
        'h-16',
        'w-16',
        'rounded-full',
        'bg-brand-accent/20',
        'grid',
        'place-items-center'
      );
    });
  });

  describe('Typography and styling', () => {
    it('applies correct styling to heading', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-2xl', 'font-bold');
    });

    it('applies correct styling to subtitle', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const subtitle = screen.getByText('Your team is ready to go!');
      expect(subtitle).toHaveClass('mt-2', 'text-white/80');
    });

    it('applies correct styling to button', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const button = screen.getByTestId('mock-button');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveClass('rounded-2xl', 'px-6', 'py-3');
    });

    it('positions button container correctly', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const buttonContainer = screen.getByTestId('mock-button').closest('div');
      expect(buttonContainer).toHaveClass('mt-6');
    });
  });

  describe('Icon and visual elements', () => {
    it('renders success checkmark with correct styling', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const icon = screen.getByText('✅');
      expect(icon).toHaveClass('text-3xl');
    });

    it('positions icon in center of circular container', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const iconContainer = screen.getByText('✅').parentElement;
      expect(iconContainer).toHaveClass('grid', 'place-items-center');
      expect(iconContainer).toHaveClass('rounded-full');
    });

    it('applies brand accent color to icon background', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const iconContainer = screen.getByText('✅').parentElement;
      expect(iconContainer).toHaveClass('bg-brand-accent/20');
    });
  });

  describe('Responsive design', () => {
    it('applies responsive width to card', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const card = screen.getByTestId('mock-card');
      expect(card).toHaveClass('w-[min(92vw,720px)]');
    });

    it('centers content properly on all screen sizes', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const container = screen.getByText('Registration Complete').closest('[class*="min-h"]');
      expect(container).toHaveClass('grid', 'place-items-center');
    });
  });

  describe('Navigation integration', () => {
    it('creates proper Link component to default path', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const link = screen.getByText('Back to Home').closest('a');
      expect(link).toHaveAttribute('href', '/');
    });

    it('creates proper Link component to custom path', () => {
      render(
        <TestWrapper>
          <Confirmation ctaPath="/custom/path" />
        </TestWrapper>
      );
      
      const link = screen.getByText('Back to Home').closest('a');
      expect(link).toHaveAttribute('href', '/custom/path');
    });

    it('integrates properly with React Router', () => {
      expect(() => {
        render(
          <BrowserRouter>
            <Confirmation />
          </BrowserRouter>
        );
      }).not.toThrow();
    });

    it('wraps button correctly within Link', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const link = screen.getByText('Back to Home').closest('a');
      const button = link?.querySelector('[data-testid="mock-button"]');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic heading structure', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('provides meaningful button text', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const button = screen.getByText('Back to Home');
      expect(button).toBeInTheDocument();
    });

    it('maintains keyboard navigation support', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const link = screen.getByRole('link');
      expect(link.tagName).toBe('A');
    });

    it('provides clear visual hierarchy', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const heading = screen.getByRole('heading');
      const subtitle = screen.getByText('Your team is ready to go!');
      
      expect(heading).toHaveClass('text-2xl');
      expect(subtitle).toHaveClass('text-white/80');
    });
  });

  describe('Component variants', () => {
    it('handles empty string props gracefully', () => {
      render(
        <TestWrapper>
          <Confirmation title="" subtitle="" ctaText="" />
        </TestWrapper>
      );
      
      expect(screen.getByRole('heading')).toHaveTextContent('');
      expect(screen.getByTestId('mock-button')).toHaveTextContent('');
    });

    it('handles long text content appropriately', () => {
      const longTitle = 'This is a very long confirmation title that might wrap to multiple lines in the interface';
      const longSubtitle = 'This is a very long subtitle that provides detailed information about what was accomplished and what the user should expect next in their workflow journey';
      
      render(
        <TestWrapper>
          <Confirmation title={longTitle} subtitle={longSubtitle} />
        </TestWrapper>
      );
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longSubtitle)).toBeInTheDocument();
    });

    it('handles special characters in props', () => {
      render(
        <TestWrapper>
          <Confirmation 
            title="Success! 🎉"
            subtitle="Your data & settings were saved successfully!"
            ctaText="Continue →"
          />
        </TestWrapper>
      );
      
      expect(screen.getByText('Success! 🎉')).toBeInTheDocument();
      expect(screen.getByText('Your data & settings were saved successfully!')).toBeInTheDocument();
      expect(screen.getByText('Continue →')).toBeInTheDocument();
    });
  });

  describe('Layout and positioning', () => {
    it('centers content vertically and horizontally', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const container = screen.getByText('Registration Complete').closest('[class*="min-h"]');
      expect(container).toHaveClass('min-h-[70vh]', 'grid', 'place-items-center');
    });

    it('maintains proper spacing between elements', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const iconContainer = screen.getByText('✅').parentElement;
      const subtitle = screen.getByText('Your team is ready to go!');
      const buttonContainer = screen.getByTestId('mock-button').closest('div');
      
      expect(iconContainer).toHaveClass('mb-4');
      expect(subtitle).toHaveClass('mt-2');
      expect(buttonContainer).toHaveClass('mt-6');
    });

    it('applies text center alignment consistently', () => {
      render(
        <TestWrapper>
          <Confirmation />
        </TestWrapper>
      );
      
      const cardBody = screen.getByTestId('mock-card-body');
      expect(cardBody).toHaveClass('text-center');
    });
  });
});