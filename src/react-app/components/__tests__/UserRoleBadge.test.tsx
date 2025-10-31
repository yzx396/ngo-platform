import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserRoleBadge } from '../UserRoleBadge';
import type { UserRole } from '../../../types/role';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'roles.admin': 'Admin',
        'roles.member': 'Member',
      };
      return translations[key] || key;
    },
  }),
}));

describe('UserRoleBadge', () => {
  it('should render admin badge with primary variant', () => {
    render(<UserRoleBadge role={'admin' as UserRole} />);

    const badge = screen.getByText('Admin');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary');
  });

  it('should render member badge with secondary variant', () => {
    render(<UserRoleBadge role={'member' as UserRole} />);

    const badge = screen.getByText('Member');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-secondary');
  });

  it('should not render when role is undefined', () => {
    const { container } = render(<UserRoleBadge role={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply custom className', () => {
    render(
      <UserRoleBadge role={'admin' as UserRole} className="custom-class" />
    );

    const badge = screen.getByText('Admin');
    expect(badge).toHaveClass('custom-class');
  });

  it('should display translated role labels', () => {
    // Admin badge
    const { rerender } = render(<UserRoleBadge role={'admin' as UserRole} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();

    // Member badge
    rerender(<UserRoleBadge role={'member' as UserRole} />);
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('should handle all role values', () => {
    const roles = [
      { value: 'admin' as UserRole, label: 'Admin' },
      { value: 'member' as UserRole, label: 'Member' },
    ];

    for (const role of roles) {
      const { unmount } = render(<UserRoleBadge role={role.value} />);
      const badge = screen.getByText(role.label);
      expect(badge).toBeInTheDocument();
      unmount();
    }
  });
});
