import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Table from '../../src/ui/Table.jsx';

describe('Table', () => {
  const sampleColumns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' }
  ];

  const sampleRows = [
    { name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' }
  ];

  it('renders empty table with no columns and rows', () => {
    render(<Table />);
    
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    render(<Table columns={sampleColumns} rows={[]} />);
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders table rows correctly', () => {
    render(<Table columns={sampleColumns} rows={sampleRows} />);
    
    // Check first row
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    
    // Check second row
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    
    // Check third row
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('handles columns with custom render functions', () => {
    const columnsWithRender = [
      { key: 'name', header: 'Name' },
      { 
        key: 'status', 
        header: 'Status',
        render: (row) => <span className="status-badge">{row.status.toUpperCase()}</span>
      }
    ];

    render(<Table columns={columnsWithRender} rows={sampleRows} />);
    
    // Use getAllByText since we have multiple "ACTIVE" entries
    expect(screen.getAllByText('ACTIVE')).toHaveLength(2);
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('applies custom tdClass to table cells', () => {
    const columnsWithClass = [
      { key: 'name', header: 'Name', tdClass: 'font-bold' },
      { key: 'email', header: 'Email' }
    ];

    const { container } = render(<Table columns={columnsWithClass} rows={sampleRows} />);
    
    const nameCells = container.querySelectorAll('td.font-bold');
    expect(nameCells).toHaveLength(sampleRows.length);
  });

  it('uses custom rowKey function', () => {
    const customRowKey = (row, index) => `${row.name}-${index}`;
    
    const { container } = render(
      <Table 
        columns={sampleColumns} 
        rows={sampleRows} 
        rowKey={customRowKey}
      />
    );
    
    const rows = container.querySelectorAll('tbody tr');
    // Note: React key attribute is not accessible via DOM, so we just verify the component renders
    expect(rows).toHaveLength(sampleRows.length);
  });

  it('handles empty rows array', () => {
    render(<Table columns={sampleColumns} rows={[]} />);
    
    // Headers should still be present
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // No data rows
    const tbody = screen.getByRole('table').querySelector('tbody');
    expect(tbody.children).toHaveLength(0);
  });

  it('handles columns without key property', () => {
    const columnsWithoutKey = [
      { header: 'Name' },
      { header: 'Email' }
    ];

    render(<Table columns={columnsWithoutKey} rows={sampleRows} />);
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(<Table columns={sampleColumns} rows={sampleRows} />);
    
    const tableContainer = container.querySelector('.overflow-auto.rounded-3xl');
    expect(tableContainer).toBeInTheDocument();
    
    const table = container.querySelector('table.min-w-full');
    expect(table).toBeInTheDocument();
    
    const thead = container.querySelector('thead.bg-white\\/5');
    expect(thead).toBeInTheDocument();
  });

  it('applies hover and striping styles to rows', () => {
    const { container } = render(<Table columns={sampleColumns} rows={sampleRows} />);
    
    const rows = container.querySelectorAll('tbody tr');
    
    // Check that hover class is applied
    rows.forEach(row => {
      expect(row).toHaveClass('hover:bg-white/[0.06]');
    });
  });

  it('handles complex data structures', () => {
    const complexColumns = [
      { key: 'user.name', header: 'User Name' },
      { 
        key: 'metadata', 
        header: 'Info',
        render: (row) => `${row.metadata.department} - ${row.metadata.role}`
      }
    ];

    const complexRows = [
      {
        user: { name: 'Alice Johnson' },
        metadata: { department: 'Engineering', role: 'Developer' }
      }
    ];

    render(<Table columns={complexColumns} rows={complexRows} />);
    
    expect(screen.getByText('Engineering - Developer')).toBeInTheDocument();
  });

  it('handles undefined or null cell values gracefully', () => {
    const rowsWithNulls = [
      { name: 'John', email: null, status: undefined },
      { name: null, email: 'test@example.com', status: 'Active' }
    ];

    render(<Table columns={sampleColumns} rows={rowsWithNulls} />);
    
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('handles large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      status: i % 2 === 0 ? 'Active' : 'Inactive'
    }));

    render(<Table columns={sampleColumns} rows={largeDataset} />);
    
    expect(screen.getByText('User 0')).toBeInTheDocument();
    expect(screen.getByText('User 99')).toBeInTheDocument();
    
    const tbody = screen.getByRole('table').querySelector('tbody');
    expect(tbody.children).toHaveLength(100);
  });
});