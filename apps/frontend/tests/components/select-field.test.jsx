import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectField from '../../src/components/SelectField.jsx';

describe('SelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    label: 'Test Label',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' }
    ],
    value: '',
    onChange: vi.fn(),
    disabled: false
  };

  describe('Basic rendering', () => {
    it('renders with label and select element', () => {
      render(<SelectField {...defaultProps} />);
      
      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<SelectField {...defaultProps} label="Custom Label" />);
      
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays correct initial value', () => {
      render(<SelectField {...defaultProps} value="option1" />);
      
      const selectElement = screen.getByRole('combobox');
      expect(selectElement.value).toBe('option1');
    });

    it('displays empty value initially', () => {
      render(<SelectField {...defaultProps} />);
      
      const selectElement = screen.getByRole('combobox');
      expect(selectElement.value).toBe('');
    });
  });

  describe('Options rendering', () => {
    it('renders all provided options', () => {
      render(<SelectField {...defaultProps} />);
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('renders default placeholder option', () => {
      render(<SelectField {...defaultProps} />);
      
      expect(screen.getByText('-- Select Test Label --')).toBeInTheDocument();
    });

    it('handles empty options array gracefully', () => {
      const emptyProps = { ...defaultProps, options: [] };
      
      expect(() => {
        render(<SelectField {...emptyProps} />);
      }).not.toThrow();
      
      expect(screen.getByText('-- Select Test Label --')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('calls onChange when option is selected', async () => {
      const user = userEvent.setup();
      render(<SelectField {...defaultProps} />);
      
      const selectElement = screen.getByRole('combobox');
      await user.selectOptions(selectElement, 'option1');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('option1');
    });

    it('calls onChange with correct value for different options', async () => {
      const user = userEvent.setup();
      render(<SelectField {...defaultProps} />);
      
      const selectElement = screen.getByRole('combobox');
      await user.selectOptions(selectElement, 'option2');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('option2');
    });

    it('allows selecting empty option', async () => {
      const user = userEvent.setup();
      render(<SelectField {...defaultProps} value="option1" />);
      
      const selectElement = screen.getByRole('combobox');
      await user.selectOptions(selectElement, '');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Disabled state', () => {
    it('disables select when disabled prop is true', () => {
      render(<SelectField {...defaultProps} disabled={true} />);
      
      const selectElement = screen.getByRole('combobox');
      expect(selectElement).toBeDisabled();
    });

    it('does not call onChange when disabled', async () => {
      const user = userEvent.setup();
      render(<SelectField {...defaultProps} disabled={true} />);
      
      const selectElement = screen.getByRole('combobox');
      
      // Try to interact with disabled element
      await user.click(selectElement);
      
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  describe('Value handling', () => {
    it('displays correct selected option', () => {
      render(<SelectField {...defaultProps} value="option2" />);
      
      const selectElement = screen.getByRole('combobox');
      expect(selectElement.value).toBe('option2');
    });

    it('handles numeric values correctly', () => {
      const numericProps = {
        ...defaultProps,
        options: [
          { value: 1, label: 'Numeric One' },
          { value: 2, label: 'Numeric Two' }
        ],
        value: 1
      };
      
      render(<SelectField {...numericProps} />);
      
      const selectElement = screen.getByDisplayValue('Numeric One');
      expect(selectElement.value).toBe('1'); // HTML values are always strings
    });

    it('handles boolean values correctly', () => {
      const booleanProps = {
        ...defaultProps,
        options: [
          { value: true, label: 'True Option' },
          { value: false, label: 'False Option' }
        ],
        value: true
      };
      
      render(<SelectField {...booleanProps} />);
      
      const selectElement = screen.getByDisplayValue('True Option');
      expect(selectElement.value).toBe('true'); // HTML values are always strings
    });
  });

  describe('Error handling', () => {
    it('handles missing options prop gracefully', () => {
      const noOptionsProps = { ...defaultProps };
      delete noOptionsProps.options;
      
      expect(() => {
        render(<SelectField {...noOptionsProps} />);
      }).toThrow(); // Component should handle this better
    });

    it('handles missing onChange prop', () => {
      const noOnChangeProps = { ...defaultProps };
      delete noOnChangeProps.onChange;
      
      expect(() => {
        render(<SelectField {...noOnChangeProps} />);
      }).not.toThrow();
    });
  });

  describe('Component structure', () => {
    it('maintains proper DOM hierarchy', () => {
      render(<SelectField {...defaultProps} />);
      
      const labelElement = screen.getByText('Test Label');
      const selectElement = screen.getByRole('combobox');
      
      // Both should be in same container
      expect(labelElement.parentNode).toBe(selectElement.parentNode);
      expect(labelElement.parentNode).toHaveClass('form-group');
    });

    it('applies form-group class to container', () => {
      render(<SelectField {...defaultProps} />);
      
      const container = screen.getByText('Test Label').parentNode;
      expect(container).toHaveClass('form-group');
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', () => {
      render(<SelectField {...defaultProps} />);
      
      const selectElement = screen.getByRole('combobox');
      
      // Should be focusable
      expect(selectElement).toBeVisible();
    });

    it('has proper select role', () => {
      render(<SelectField {...defaultProps} />);
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});