import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../components/StatusBadge';
import type { MatchStatus } from '@/types/match';

describe('StatusBadge', () => {
  it('should render pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render accepted status', () => {
    render(<StatusBadge status="accepted" />);
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });

  it('should render active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render rejected status', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should render completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should have proper variant for different statuses', () => {
    const { unmount } = render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toHaveClass('bg-yellow-100');
    unmount();

    render(<StatusBadge status="accepted" />);
    expect(screen.getByText('Accepted')).toHaveClass('bg-green-100');
  });

  it('should support size prop', () => {
    const { rerender } = render(<StatusBadge status="pending" size="sm" />);
    expect(screen.getByText('Pending')).toHaveClass('text-xs');

    rerender(<StatusBadge status="pending" size="lg" />);
    expect(screen.getByText('Pending')).toHaveClass('text-lg');
  });

  it('should be accessible with aria-label', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toHaveAttribute('aria-label', 'Match status: Pending');
  });

  describe('all status types', () => {
    const statuses: MatchStatus[] = ['pending', 'accepted', 'rejected', 'active', 'completed'];

    it('should render all status types correctly', () => {
      statuses.forEach((status) => {
        const { unmount } = render(<StatusBadge status={status} />);
        const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
        expect(screen.getByText(capitalized)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
