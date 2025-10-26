import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../src/ui/Modal.jsx';

describe('Modal', () => {
  const defaultProps = {
    open: true,
    title: 'Test Modal',
    children: <div>Modal content</div>,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render modal when open is false', () => {
    render(<Modal {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<Modal {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    const footer = <button>Footer Button</button>;
    render(<Modal {...defaultProps} footer={footer} />);
    
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('does not render footer when not provided', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.queryByText('Footer Button')).not.toBeInTheDocument();
  });

  it('renders with correct accessibility attributes', () => {
    render(<Modal {...defaultProps} />);
    
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toHaveAttribute('aria-label', 'Close');
  });

  it('renders title as heading', () => {
    render(<Modal {...defaultProps} />);
    
    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Test Modal');
  });

  it('handles complex children content', () => {
    const complexChildren = (
      <div>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <button>Child Button</button>
      </div>
    );
    
    render(<Modal {...defaultProps} children={complexChildren} />);
    
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    expect(screen.getByText('Child Button')).toBeInTheDocument();
  });

  it('handles multiple footer elements', () => {
    const footer = (
      <>
        <button>Cancel</button>
        <button>Save</button>
      </>
    );
    
    render(<Modal {...defaultProps} footer={footer} />);
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(<Modal {...defaultProps} />);
    
    const backdrop = container.querySelector('.fixed.inset-0.z-50');
    expect(backdrop).toBeInTheDocument();
    
    const modalContent = container.querySelector('.rounded-2xl.border');
    expect(modalContent).toBeInTheDocument();
  });
});