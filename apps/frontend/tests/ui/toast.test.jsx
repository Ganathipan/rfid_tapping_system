import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from '../../src/ui/Toast.jsx';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const defaultProps = {
    text: 'Test toast message',
    show: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toast with text when show is true', () => {
    render(<Toast {...defaultProps} />);
    
    expect(screen.getByText('Test toast message')).toBeInTheDocument();
  });

  it('applies visible styles when show is true', () => {
    const { container } = render(<Toast {...defaultProps} />);
    
    const toastContainer = container.querySelector('.fixed.bottom-6.right-6');
    expect(toastContainer).toHaveClass('opacity-100', 'translate-y-0');
    expect(toastContainer).not.toHaveClass('opacity-0', 'translate-y-2', 'pointer-events-none');
  });

  it('applies hidden styles when show is false', () => {
    const { container } = render(<Toast {...defaultProps} show={false} />);
    
    const toastContainer = container.querySelector('.fixed.bottom-6.right-6');
    expect(toastContainer).toHaveClass('opacity-0', 'translate-y-2', 'pointer-events-none');
    expect(toastContainer).not.toHaveClass('opacity-100', 'translate-y-0');
  });

  it('auto-closes after default timeout (2500ms)', () => {
    render(<Toast {...defaultProps} />);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after custom timeout', () => {
    render(<Toast {...defaultProps} ms={1000} />);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not auto-close when show is false', () => {
    render(<Toast {...defaultProps} show={false} />);
    
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('handles onClose being undefined', () => {
    render(<Toast text="Test" show={true} />);
    
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2500);
      });
    }).not.toThrow();
  });

  it('resets timer when show prop changes from false to true', () => {
    const { rerender } = render(<Toast {...defaultProps} show={false} />);
    
    // Change show to true
    rerender(<Toast {...defaultProps} show={true} />);
    
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('clears previous timer when show changes', () => {
    const { rerender } = render(<Toast {...defaultProps} ms={1000} />);
    
    // Change show to false before timer completes
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    rerender(<Toast {...defaultProps} show={false} ms={1000} />);
    
    // Complete the original timer duration
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('handles rapid show/hide changes', () => {
    const { rerender } = render(<Toast {...defaultProps} />);
    
    rerender(<Toast {...defaultProps} show={false} />);
    rerender(<Toast {...defaultProps} show={true} />);
    rerender(<Toast {...defaultProps} show={false} />);
    
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('renders different text content correctly', () => {
    const messages = [
      'Success message',
      'Error occurred!',
      'Warning: Check your input',
      ''
    ];
    
    messages.forEach(message => {
      const { rerender } = render(<Toast text={message} show={true} />);
      
      if (message) {
        expect(screen.getByText(message)).toBeInTheDocument();
      }
      
      rerender(<></>); // Clean up
    });
  });

  it('maintains consistent positioning classes', () => {
    const { container } = render(<Toast {...defaultProps} />);
    
    const toastContainer = container.querySelector('div');
    expect(toastContainer).toHaveClass('fixed', 'bottom-6', 'right-6', 'transition');
  });
});