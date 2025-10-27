import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Home from '../../src/pages/Home.jsx';

// Mock the UI components
vi.mock('../../src/ui/Button.jsx', () => ({
  default: ({ children, size, variant, ...props }) => (
    <button 
      data-testid="mock-button"
      data-size={size}
      data-variant={variant}
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

// Mock environment variables
const mockEnv = {
  VITE_BUILD_TIME: '2025-10-27T12:00:00Z',
  VITE_API_BASE: 'http://localhost:4000'
};

vi.stubGlobal('import', {
  meta: {
    env: mockEnv
  }
});

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      expect(screen.getByText('RFID Crowd Management System')).toBeInTheDocument();
    });

    it('renders the main heading with correct styling', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('RFID Crowd Management System');
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'tracking-tight');
    });

    it('renders the main description', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      expect(screen.getByText(/Unified entry point for administration/)).toBeInTheDocument();
    });

    it('renders with proper layout structure', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const mainContainer = screen.getByText('RFID Crowd Management System').closest('div').closest('div');
      expect(mainContainer).toHaveClass('space-y-10');
    });
  });

  describe('Navigation items', () => {
    it('renders all navigation items', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Game Configuration')).toBeInTheDocument();
      expect(screen.getByText('Exit Stack')).toBeInTheDocument();
      expect(screen.getByText('Kiosks')).toBeInTheDocument();
      expect(screen.getByText('Registration')).toBeInTheDocument();
    });

    it('renders navigation item descriptions', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      expect(screen.getByText('Manage registrations, readers & monitoring')).toBeInTheDocument();
      expect(screen.getByText('Live & range crowd metrics')).toBeInTheDocument();
      expect(screen.getByText('Cluster scoring & redemption')).toBeInTheDocument();
      expect(screen.getByText('Manage exit stack & reconciliation')).toBeInTheDocument();
      expect(screen.getByText('Cluster directory & live kiosk views')).toBeInTheDocument();
      expect(screen.getByText('Portal selection & team registration')).toBeInTheDocument();
    });

    it('renders correct number of navigation cards', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const cards = screen.getAllByTestId('mock-card');
      expect(cards).toHaveLength(6);
    });

    it('renders Open buttons for all navigation items', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const openButtons = screen.getAllByText('Open');
      expect(openButtons).toHaveLength(6);
      
      // Check button properties
      openButtons.forEach(button => {
        expect(button).toHaveAttribute('data-size', 'sm');
        expect(button).toHaveAttribute('data-variant', 'accent');
      });
    });
  });

  describe('Navigation links', () => {
    it('creates correct links for each navigation item', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Find links by their href attributes - all links have "Open" as accessible name
      const allLinks = screen.getAllByRole('link', { name: 'Open' });
      const adminLink = allLinks.find(link => link.getAttribute('href') === '/admin');
      const analyticsLink = allLinks.find(link => link.getAttribute('href') === '/admin/analytics');
      const gameLink = allLinks.find(link => link.getAttribute('href') === '/admin/game-lite');
      
      expect(adminLink).toHaveAttribute('href', '/admin');
      expect(analyticsLink).toHaveAttribute('href', '/admin/analytics');
      expect(gameLink).toHaveAttribute('href', '/admin/game-lite');
      const exitLink = allLinks.find(link => link.getAttribute('href') === '/admin/exitout');
      const kiosksLink = allLinks.find(link => link.getAttribute('href') === '/kiosk');
      const registrationLink = allLinks.find(link => link.getAttribute('href') === '/registration');
      
      expect(exitLink).toHaveAttribute('href', '/admin/exitout');
      expect(kiosksLink).toHaveAttribute('href', '/kiosk');
      expect(registrationLink).toHaveAttribute('href', '/registration');
    });

    it('wraps Open buttons with correct Link components', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Check that admin link contains a button
      const allLinks = screen.getAllByRole('link', { name: 'Open' });
      const adminLink = allLinks.find(link => link.getAttribute('href') === '/admin');
      expect(adminLink).toContainElement(screen.getAllByTestId('mock-button')[0]);
    });

    it('integrates properly with React Router', () => {
      // Test that the component doesn't crash when used with routing
      expect(() => {
        render(
          <BrowserRouter>
            <Home />
          </BrowserRouter>
        );
      }).not.toThrow();
    });
  });

  describe('Card components', () => {
    it('applies correct CSS classes to cards', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const cards = screen.getAllByTestId('mock-card');
      cards.forEach(card => {
        expect(card).toHaveClass('group', 'hover:border-cyan-400/40', 'transition-colors');
      });
    });

    it('applies correct CSS classes to card bodies', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const cardBodies = screen.getAllByTestId('mock-card-body');
      cardBodies.forEach(cardBody => {
        expect(cardBody).toHaveClass('flex', 'flex-col', 'gap-3');
      });
    });

    it('structures card content correctly', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Check that each card has a title, description, and button
      const titles = screen.getAllByRole('heading', { level: 2 });
      expect(titles).toHaveLength(6);
      
      titles.forEach(title => {
        expect(title).toHaveClass('text-lg', 'font-semibold');
      });
    });
  });

  describe('Grid layout', () => {
    it('applies responsive grid classes', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const gridContainer = screen.getByText('Admin').closest('[class*="grid"]');
      expect(gridContainer).toHaveClass('grid', 'gap-5', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('contains all navigation items within grid', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const gridContainer = screen.getByText('Admin').closest('[class*="grid"]');
      const cardsInGrid = gridContainer?.querySelectorAll('[data-testid="mock-card"]');
      expect(cardsInGrid).toHaveLength(6);
    });
  });

  describe('Environment information section', () => {
    it('renders build time information', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Check for build time section
      expect(screen.getByText(/Build time:/)).toBeInTheDocument();
    });

    it('renders API base information', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      expect(screen.getByText(/API: http:\/\/localhost:4000/)).toBeInTheDocument();
    });

    it('handles missing environment variables gracefully', () => {
      // Mock missing environment variables
      vi.stubGlobal('import', {
        meta: {
          env: {}
        }
      });
      
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Check for environment info section
      expect(screen.getByText(/Build time:/)).toBeInTheDocument();
      expect(screen.getByText(/API:/)).toBeInTheDocument();
    });

    it('applies correct styling to environment section', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const envSection = screen.getByText(/Build time:/).closest('section');
      expect(envSection).toHaveClass('text-xs', 'text-white/40', 'text-center', 'pt-4', 'border-t', 'border-white/10');
    });
  });

  describe('Component structure', () => {
    it('maintains proper semantic HTML structure', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      
      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      expect(h2Headings).toHaveLength(6);
    });

    it('organizes content in sections', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const sections = screen.getByText('RFID Crowd Management System').closest('div')?.querySelectorAll('section');
      expect(sections).toHaveLength(3);
    });

    it('maintains proper DOM hierarchy', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const mainContainer = screen.getByText('RFID Crowd Management System').closest('div');
      expect(mainContainer).toHaveClass('space-y-10');
      
      const heroSection = screen.getByText('RFID Crowd Management System').closest('section');
      expect(heroSection).toHaveClass('text-center', 'space-y-4');
    });
  });

  describe('Accessibility', () => {
    it('provides proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s).toHaveLength(6);
    });

    it('provides meaningful link text', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveTextContent('Open');
      });
    });

    it('maintains keyboard navigation support', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.tagName).toBe('A');
      });
    });
  });

  describe('Styling and theming', () => {
    it('applies gradient text to main heading', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('bg-gradient-to-r', 'from-sky-300', 'to-cyan-200', 'text-transparent', 'bg-clip-text');
    });

    it('uses consistent text opacity throughout', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const description = screen.getByText(/Unified entry point/);
      expect(description).toHaveClass('text-white/70');
      
      const envInfo = screen.getByText(/Build time:/);
      expect(envInfo.closest('section')).toHaveClass('text-white/40');
    });

    it('applies hover effects to cards', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const cards = screen.getAllByTestId('mock-card');
      cards.forEach(card => {
        expect(card).toHaveClass('hover:border-cyan-400/40');
      });
    });
  });

  describe('Data structure', () => {
    it('renders navigation items from data array', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Should render exactly 6 items based on navItems array
      const navTitles = ['Admin', 'Analytics', 'Game Configuration', 'Exit Stack', 'Kiosks', 'Registration'];
      
      navTitles.forEach(title => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it('maps data properties correctly to UI elements', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      // Test specific mappings from navItems data
      const allLinks = screen.getAllByRole('link', { name: 'Open' });
      const adminLink = allLinks.find(link => link.getAttribute('href') === '/admin');
      const analyticsLink = allLinks.find(link => link.getAttribute('href') === '/admin/analytics');
      
      expect(adminLink).toHaveAttribute('href', '/admin');
      expect(analyticsLink).toHaveAttribute('href', '/admin/analytics');
    });
  });

  describe('Component integration', () => {
    it('properly integrates with Card components', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const cards = screen.getAllByTestId('mock-card');
      const cardBodies = screen.getAllByTestId('mock-card-body');
      
      expect(cards).toHaveLength(6);
      expect(cardBodies).toHaveLength(6);
    });

    it('properly integrates with Button components', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const buttons = screen.getAllByTestId('mock-button');
      expect(buttons).toHaveLength(6);
      
      buttons.forEach(button => {
        expect(button).toHaveTextContent('Open');
      });
    });

    it('properly integrates with React Router Link', () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(6);
      
      // Each link should contain a button
      links.forEach(link => {
        const button = link.querySelector('[data-testid="mock-button"]');
        expect(button).toBeInTheDocument();
      });
    });
  });
});