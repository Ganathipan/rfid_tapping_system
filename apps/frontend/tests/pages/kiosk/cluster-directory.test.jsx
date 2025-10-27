import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ClusterDirectory from '../../../src/pages/kiosk/ClusterDirectory.jsx';
import { api } from '../../../src/api';

// Mock the API
vi.mock('../../../src/api', () => ({
  api: vi.fn()
}));

// Mock UI components
vi.mock('../../../src/ui/Card.jsx', () => ({
  Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
  CardBody: ({ children, className }) => <div data-testid="card-body" className={className}>{children}</div>,
  CardHeader: ({ children, className }) => <div data-testid="card-header" className={className}>{children}</div>
}));

vi.mock('../../../src/ui/Button.jsx', () => ({
  default: ({ children, className, variant, ...props }) => (
    <button data-testid="button" className={className} data-variant={variant} {...props}>
      {children}
    </button>
  )
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ClusterDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial rendering', () => {
    it('renders without crashing', async () => {
      api.mockResolvedValueOnce({ clusters: [] });
      
      renderWithRouter(<ClusterDirectory />);
      
      expect(screen.getByText('Cluster Directory')).toBeInTheDocument();
    });

    it('shows main heading', async () => {
      api.mockResolvedValueOnce({ clusters: [] });
      
      renderWithRouter(<ClusterDirectory />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Cluster Directory');
    });

    it('calls API to fetch clusters on mount', async () => {
      api.mockResolvedValueOnce({ clusters: ['Cluster A', 'Cluster B'] });
      
      renderWithRouter(<ClusterDirectory />);
      
      expect(api).toHaveBeenCalledWith('/api/kiosk/clusters');
      expect(api).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cluster display', () => {
    it('displays clusters when API returns data', async () => {
      const mockClusters = ['Engineering Lab', 'Science Building', 'Library'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        mockClusters.forEach(cluster => {
          expect(screen.getByText(cluster)).toBeInTheDocument();
        });
      });
    });

    it('handles empty clusters array', async () => {
      api.mockResolvedValueOnce({ clusters: [] });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText('Cluster Directory')).toBeInTheDocument();
      });
      
      // Should not show any cluster cards
      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('handles missing clusters property', async () => {
      api.mockResolvedValueOnce({});
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText('Cluster Directory')).toBeInTheDocument();
      });
      
      // Should not show any cluster cards
      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('renders correct number of cluster cards', async () => {
      const mockClusters = ['Cluster 1', 'Cluster 2', 'Cluster 3'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('card');
        expect(cards).toHaveLength(mockClusters.length);
      });
    });

    it('displays cluster names in cards', async () => {
      const mockClusters = ['Main Lab', 'Testing Zone'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const clusterElements = screen.getAllByText(/Main Lab|Testing Zone/);
        expect(clusterElements).toHaveLength(2);
      });
    });
  });

  describe('Navigation links', () => {
    it('creates correct navigation links for clusters', async () => {
      const mockClusters = ['Lab A', 'Lab B'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const linkA = screen.getAllByRole('link')[0];
        expect(linkA).toHaveAttribute('href', '/kiosk/cluster/Lab%20A');
      });
    });

    it('encodes cluster names in URLs correctly', async () => {
      const mockClusters = ['Lab With Spaces', 'Lab/With/Slashes'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', '/kiosk/cluster/Lab%20With%20Spaces');
        expect(links[1]).toHaveAttribute('href', '/kiosk/cluster/Lab%2FWith%2FSlashes');
      });
    });

    it('displays "Open display" button text', async () => {
      const mockClusters = ['Test Cluster'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText('Open display')).toBeInTheDocument();
      });
    });

    it('applies correct button variant and styling', async () => {
      const mockClusters = ['Test Cluster'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const button = screen.getByTestId('button');
        expect(button).toHaveAttribute('data-variant', 'outline');
        expect(button).toHaveClass('w-full');
      });
    });
  });

  describe('Error handling', () => {
    it('displays error message when API call fails', async () => {
      const errorMessage = 'Network connection failed';
      api.mockRejectedValueOnce(new Error(errorMessage));
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('displays generic error when error has no message', async () => {
      api.mockRejectedValueOnce(new Error());
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load clusters')).toBeInTheDocument();
      });
    });

    it('displays generic error when error is not an Error object', async () => {
      api.mockRejectedValueOnce('String error');
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load clusters')).toBeInTheDocument();
      });
    });

    it('applies correct error styling', async () => {
      api.mockRejectedValueOnce(new Error('Test error'));
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const errorElement = screen.getByText('Test error');
        expect(errorElement).toHaveClass('text-rose-300', 'text-sm');
      });
    });

    it('does not display clusters when error occurs', async () => {
      api.mockRejectedValueOnce(new Error('API Error'));
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });
  });

  describe('Grid layout', () => {
    it('applies correct grid styling', async () => {
      const mockClusters = ['Cluster 1', 'Cluster 2'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const gridContainer = screen.getAllByTestId('card')[0].parentElement;
        expect(gridContainer).toHaveClass('grid', 'gap-3');
        expect(gridContainer).toHaveStyle({ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' });
      });
    });

    it('maintains responsive grid layout', async () => {
      const mockClusters = Array.from({ length: 8 }, (_, i) => `Cluster ${i + 1}`);
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('card');
        expect(cards).toHaveLength(8);
        
        const gridContainer = cards[0].parentElement;
        expect(gridContainer).toHaveClass('grid', 'gap-3');
      });
    });
  });

  describe('Component structure', () => {
    it('uses correct Card component structure', async () => {
      const mockClusters = ['Test Cluster'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        expect(screen.getByTestId('card')).toBeInTheDocument();
        expect(screen.getByTestId('card-body')).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes to card body', async () => {
      const mockClusters = ['Test Cluster'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const cardBody = screen.getByTestId('card-body');
        expect(cardBody).toHaveClass('flex', 'flex-col', 'gap-2');
      });
    });

    it('applies correct CSS classes to cluster name', async () => {
      const mockClusters = ['Test Cluster'];
      api.mockResolvedValueOnce({ clusters: mockClusters });
      
      renderWithRouter(<ClusterDirectory />);
      
      await waitFor(() => {
        const clusterName = screen.getByText('Test Cluster');
        expect(clusterName).toHaveClass('font-semibold', 'text-white/90');
      });
    });
  });
});