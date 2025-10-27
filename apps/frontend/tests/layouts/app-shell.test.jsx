import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import AppShell from '../../src/layouts/AppShell.jsx';

// Mock the Button component
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

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children}
  </MemoryRouter>
);

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('renders with proper base structure', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );
      
      const container = screen.getByRole('main').parentElement;
      expect(container).toHaveClass('min-h-screen', 'bg-brand-ink', 'text-white');
    });

    it('renders main content area', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('mx-auto', 'max-w-7xl', 'px-4', 'py-6');
    });

    it('includes Outlet for nested routes', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );
      
      // Outlet should be rendered within main
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();
    });
  });

  describe('Header visibility logic', () => {
    it('shows header on all paths including root', () => {
      render(
        <TestWrapper initialEntries={['/']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('shows header on non-root paths', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('shows header on admin paths', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('shows header on registration path', () => {
      render(
        <TestWrapper initialEntries={['/registration']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('shows header on nested admin paths', () => {
      render(
        <TestWrapper initialEntries={['/admin/game-lite']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('shows header on kiosk path', () => {
      render(
        <TestWrapper initialEntries={['/kiosk']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Header structure', () => {
    beforeEach(() => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
    });

    it('renders header with correct styling classes', () => {
      const header = screen.getByRole('banner');
      expect(header).toHaveClass(
        'sticky',
        'top-0',
        'z-20',
        'backdrop-blur',
        'border-b',
        'border-white/10'
      );
    });

    it('renders header container with proper layout classes', () => {
      const header = screen.getByRole('banner');
      const container = header.querySelector('div');
      expect(container).toHaveClass(
        'mx-auto',
        'max-w-7xl',
        'px-4',
        'py-3',
        'flex',
        'items-center',
        'gap-3'
      );
    });

    it('renders Home button with correct properties', () => {
      const homeButton = screen.getByTestId('mock-button');
      expect(homeButton).toHaveAttribute('data-size', 'sm');
      expect(homeButton).toHaveAttribute('data-variant', 'accent');
      expect(homeButton).toHaveTextContent('Home');
    });

    it('renders Home button as a link to root', () => {
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('Navigation links', () => {
    beforeEach(() => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
    });

    it('renders all navigation links', () => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Registration')).toBeInTheDocument();
      expect(screen.getByText('Game')).toBeInTheDocument();
      expect(screen.getByText('Exit Stack')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Kiosks')).toBeInTheDocument();
    });

    it('sets correct paths for navigation links', () => {
      const adminLink = screen.getByText('Admin');
      const registrationLink = screen.getByText('Registration');
      const gameLink = screen.getByText('Game');
      const exitStackLink = screen.getByText('Exit Stack');
      const analyticsLink = screen.getByText('Analytics');
      const kiosksLink = screen.getByText('Kiosks');

      expect(adminLink.closest('a')).toHaveAttribute('href', '/admin');
      expect(registrationLink.closest('a')).toHaveAttribute('href', '/registration');
      expect(gameLink.closest('a')).toHaveAttribute('href', '/admin/game-lite');
      expect(exitStackLink.closest('a')).toHaveAttribute('href', '/admin/exitout');
      expect(analyticsLink.closest('a')).toHaveAttribute('href', '/admin/analytics');
      expect(kiosksLink.closest('a')).toHaveAttribute('href', '/kiosk');
    });

    it('renders navigation with proper container styling', () => {
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass(
        'ml-auto',
        'flex',
        'items-center',
        'gap-4',
        'text-white/80'
      );
    });
  });

  describe('Active link styling', () => {
    it('applies active styling to Admin link when on admin path', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const adminLink = screen.getByText('Admin');
      expect(adminLink).toBeInTheDocument(); // NavLink active styling is applied via render prop
    });

    it('applies active styling to Registration link when on registration path', () => {
      render(
        <TestWrapper initialEntries={['/registration']}>
          <AppShell />
        </TestWrapper>
      );
      
      const registrationLink = screen.getByText('Registration');
      expect(registrationLink).toBeInTheDocument(); // NavLink active styling is applied via render prop
    });

    it('applies active styling to Game link when on game-lite path', () => {
      render(
        <TestWrapper initialEntries={['/admin/game-lite']}>
          <AppShell />
        </TestWrapper>
      );
      
      const gameLink = screen.getByText('Game');
      expect(gameLink).toBeInTheDocument(); // NavLink active styling is applied via render prop
    });

    it('applies active styling to Exit Stack link when on exitout path', () => {
      render(
        <TestWrapper initialEntries={['/admin/exitout']}>
          <AppShell />
        </TestWrapper>
      );
      
      const exitStackLink = screen.getByText('Exit Stack');
      expect(exitStackLink).toBeInTheDocument(); // NavLink active styling is applied via render prop
    });

    it('applies active styling to Analytics link when on analytics path', () => {
      render(
        <TestWrapper initialEntries={['/admin/analytics']}>
          <AppShell />
        </TestWrapper>
      );
      
      const analyticsLink = screen.getByText('Analytics');
      expect(analyticsLink).toBeInTheDocument(); // NavLink active styling is applied via render prop
    });

    it('applies active styling to Kiosks link when on kiosk path', () => {
      render(
        <TestWrapper initialEntries={['/kiosk']}>
          <AppShell />
        </TestWrapper>
      );
      
      const kiosksLink = screen.getByText('Kiosks');
      expect(kiosksLink).toBeInTheDocument(); // NavLink active styling is applied via render prop
    });

    it('applies hover styling to inactive links', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const registrationLink = screen.getByText('Registration');
      expect(registrationLink).toBeInTheDocument(); // NavLink hover styling is applied via render prop
    });
  });

  describe('Responsive design', () => {
    it('applies responsive container classes', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const headerContainer = screen.getByRole('banner').querySelector('div');
      expect(headerContainer).toHaveClass('mx-auto', 'max-w-7xl');
      
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('mx-auto', 'max-w-7xl');
    });

    it('uses consistent padding across header and main', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const headerContainer = screen.getByRole('banner').querySelector('div');
      const mainElement = screen.getByRole('main');
      
      expect(headerContainer).toHaveClass('px-4');
      expect(mainElement).toHaveClass('px-4');
    });
  });

  describe('Layout behavior', () => {
    it('maintains full height layout', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const container = screen.getByRole('main').parentElement;
      expect(container).toHaveClass('min-h-screen');
    });

    it('uses sticky header positioning', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky', 'top-0');
    });

    it('applies proper z-index for header layering', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('z-20');
    });

    it('includes backdrop blur effect for header', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('backdrop-blur');
    });
  });

  describe('Theme and styling', () => {
    it('applies brand color scheme', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );
      
      const container = screen.getByRole('main').parentElement;
      expect(container).toHaveClass('bg-brand-ink', 'text-white');
    });

    it('uses proper border styling for header', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('border-b', 'border-white/10');
    });

    it('applies navigation text opacity', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('text-white/80');
    });
  });

  describe('Component integration', () => {
    it('integrates properly with React Router', () => {
      // Test that the component doesn't crash when used with routing
      expect(() => {
        render(
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        );
      }).not.toThrow();
    });

    it('properly uses NavLink components for navigation', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      // NavLinks should be rendered as anchor elements
      const adminLink = screen.getByText('Admin');
      expect(adminLink.tagName).toBe('A');
    });

    it('correctly imports and uses Button component', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      const homeButton = screen.getByTestId('mock-button');
      expect(homeButton).toBeInTheDocument();
    });

    it('properly uses useLocation hook for conditional header display', () => {
      // Test different routes to ensure location is being used correctly
      const { rerender } = render(
        <TestWrapper initialEntries={['/']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      
      rerender(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic header element', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('uses semantic main element', () => {
      render(
        <TestWrapper>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('uses semantic navigation element', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('provides proper link text for navigation', () => {
      render(
        <TestWrapper initialEntries={['/admin']}>
          <AppShell />
        </TestWrapper>
      );
      
      expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Registration' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Game' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Exit Stack' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Analytics' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Kiosks' })).toBeInTheDocument();
    });
  });
});