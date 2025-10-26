import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Badge from '../../src/ui/Badge.jsx';

describe('Badge', () => {
  it('renders with default gray color', () => {
    render(<Badge>Default Badge</Badge>);
    
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-white/10', 'text-white');
  });

  it('renders with green color variant', () => {
    render(<Badge color="green">Success Badge</Badge>);
    
    const badge = screen.getByText('Success Badge');
    expect(badge).toHaveClass('bg-emerald-500/20', 'text-emerald-200');
  });

  it('renders with red color variant', () => {
    render(<Badge color="red">Error Badge</Badge>);
    
    const badge = screen.getByText('Error Badge');
    expect(badge).toHaveClass('bg-rose-500/20', 'text-rose-200');
  });

  it('renders with yellow color variant', () => {
    render(<Badge color="yellow">Warning Badge</Badge>);
    
    const badge = screen.getByText('Warning Badge');
    expect(badge).toHaveClass('bg-amber-500/20', 'text-amber-100');
  });

  it('renders with blue color variant', () => {
    render(<Badge color="blue">Info Badge</Badge>);
    
    const badge = screen.getByText('Info Badge');
    expect(badge).toHaveClass('bg-sky-500/20', 'text-sky-200');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    
    const badge = screen.getByText('Custom Badge');
    expect(badge).toHaveClass('custom-class');
    expect(badge).toHaveClass('bg-white/10', 'text-white'); // Default color should still apply
  });

  it('applies additional props', () => {
    render(<Badge data-testid="test-badge" aria-label="Test Badge">Prop Badge</Badge>);
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', 'Test Badge');
  });

  it('renders with complex children content', () => {
    render(
      <Badge color="green">
        <span>✓</span> Success
      </Badge>
    );
    
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('handles empty children', () => {
    const { container } = render(<Badge color="red"></Badge>);
    
    const badge = container.querySelector('span');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-rose-500/20', 'text-rose-200');
  });

  it('applies base styling classes', () => {
    render(<Badge>Base Styling</Badge>);
    
    const badge = screen.getByText('Base Styling');
    expect(badge).toHaveClass(
      'inline-flex',
      'items-center',
      'gap-1',
      'rounded-full',
      'px-2.5',
      'py-1',
      'text-xs',
      'font-medium'
    );
  });

  it('handles unknown color gracefully', () => {
    render(<Badge color="unknown">Unknown Color</Badge>);
    
    const badge = screen.getByText('Unknown Color');
    expect(badge).toBeInTheDocument();
    // Should not have any color classes for unknown color
    expect(badge).not.toHaveClass('bg-white/10');
  });

  it('combines className with color classes correctly', () => {
    render(<Badge color="blue" className="ml-2 mr-4">Combined Classes</Badge>);
    
    const badge = screen.getByText('Combined Classes');
    expect(badge).toHaveClass('bg-sky-500/20', 'text-sky-200', 'ml-2', 'mr-4');
  });

  it('renders as span element with correct role', () => {
    render(<Badge>Span Badge</Badge>);
    
    const badge = screen.getByText('Span Badge');
    expect(badge.tagName).toBe('SPAN');
  });

  it('handles click events when onClick prop is provided', () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Clickable Badge</Badge>);
    
    const badge = screen.getByText('Clickable Badge');
    fireEvent.click(badge);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports all color variants in the color map', () => {
    const colors = ['gray', 'green', 'red', 'yellow', 'blue'];
    const expectedClasses = [
      ['bg-white/10', 'text-white'],
      ['bg-emerald-500/20', 'text-emerald-200'],
      ['bg-rose-500/20', 'text-rose-200'],
      ['bg-amber-500/20', 'text-amber-100'],
      ['bg-sky-500/20', 'text-sky-200']
    ];

    colors.forEach((color, index) => {
      const { rerender } = render(<Badge color={color}>{color} Badge</Badge>);
      
      const badge = screen.getByText(`${color} Badge`);
      expect(badge).toHaveClass(...expectedClasses[index]);
      
      rerender(<></>); // Clean up for next iteration
    });
  });

  it('maintains consistent sizing across all variants', () => {
    const colors = ['gray', 'green', 'red', 'yellow', 'blue'];
    
    colors.forEach(color => {
      const { rerender } = render(<Badge color={color}>Test</Badge>);
      
      const badge = screen.getByText('Test');
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-xs');
      
      rerender(<></>);
    });
  });

  it('handles nested elements correctly', () => {
    render(
      <Badge color="green">
        <div>
          <span>Nested</span>
          <strong>Content</strong>
        </div>
      </Badge>
    );
    
    expect(screen.getByText('Nested')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});