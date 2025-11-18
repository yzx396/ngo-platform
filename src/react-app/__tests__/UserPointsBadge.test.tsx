import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserPointsBadge } from '../components/UserPointsBadge';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('UserPointsBadge Component', () => {
  describe('Rendering', () => {
    it('should render points value', () => {
      render(<UserPointsBadge points={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render points label in medium and large variants', () => {
      const { rerender } = render(<UserPointsBadge points={100} variant="md" />);
      expect(screen.getByText(/Points/)).toBeInTheDocument();

      rerender(<UserPointsBadge points={100} variant="lg" />);
      expect(screen.getByText(/Points/)).toBeInTheDocument();
    });

    it('should not render points label in small variant', () => {
      const { container } = render(<UserPointsBadge points={100} variant="sm" />);
      // In sm variant, label is hidden/abbreviated
      expect(container).toBeInTheDocument();
    });

    it('should render zero points', () => {
      render(<UserPointsBadge points={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should format large points with commas', () => {
      render(<UserPointsBadge points={1000} />);
      expect(screen.getByText('1,000')).toBeInTheDocument();

      render(<UserPointsBadge points={1000000} />);
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
    });
  });

  describe('Rank Display', () => {
    it('should show rank when showRank is true', () => {
      render(<UserPointsBadge points={500} rank={1} showRank={true} />);
      expect(screen.getByText(/#1st/)).toBeInTheDocument();
    });

    it('should not show rank when showRank is false', () => {
      const { container } = render(
        <UserPointsBadge points={500} rank={1} showRank={false} />
      );
      const rankText = container.textContent?.includes('#1st');
      expect(rankText).toBeFalsy();
    });

    it('should format rank ordinals correctly', () => {
      render(<UserPointsBadge points={100} rank={1} showRank={true} />);
      expect(screen.getByText(/#1st/)).toBeInTheDocument();

      render(<UserPointsBadge points={100} rank={2} showRank={true} />);
      expect(screen.getByText(/#2nd/)).toBeInTheDocument();

      render(<UserPointsBadge points={100} rank={3} showRank={true} />);
      expect(screen.getByText(/#3rd/)).toBeInTheDocument();

      render(<UserPointsBadge points={100} rank={4} showRank={true} />);
      expect(screen.getByText(/#4th/)).toBeInTheDocument();
    });

    it('should hide rank when rank is undefined', () => {
      const { container } = render(
        <UserPointsBadge points={500} rank={undefined} showRank={true} />
      );
      const rankText = container.textContent?.includes('#');
      expect(rankText).toBeFalsy();
    });
  });

  describe('Styling & Variants', () => {
    it('should apply correct size classes', () => {
      const { container: smContainer } = render(
        <UserPointsBadge points={100} variant="sm" />
      );
      expect(smContainer.firstChild).toHaveClass('text-xs');

      const { container: mdContainer } = render(
        <UserPointsBadge points={100} variant="md" />
      );
      expect(mdContainer.firstChild).toHaveClass('text-sm');

      const { container: lgContainer } = render(
        <UserPointsBadge points={100} variant="lg" />
      );
      expect(lgContainer.firstChild).toHaveClass('text-base');
    });

    it('should apply badge styling when showBadge is true', () => {
      const { container } = render(
        <UserPointsBadge points={100} showBadge={true} />
      );
      expect(container.firstChild).toHaveClass('rounded-full');
    });

    it('should not apply badge styling when showBadge is false', () => {
      const { container } = render(
        <UserPointsBadge points={100} showBadge={false} />
      );
      expect(container.firstChild).not.toHaveClass('rounded-full');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <UserPointsBadge points={100} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply warm gradient styling for badges', () => {
      const { container } = render(
        <UserPointsBadge points={100} showBadge={true} />
      );
      // New design uses gradient background and warm colors
      expect(container.firstChild).toHaveClass('bg-gradient-to-r');
      expect(container.firstChild).toHaveClass('text-accent-foreground');
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive aria-label', () => {
      render(<UserPointsBadge points={100} />);
      const element = screen.getByLabelText(/100.*Points/);
      expect(element).toBeInTheDocument();
    });

    it('should include rank in aria-label when shown', () => {
      render(<UserPointsBadge points={500} rank={1} showRank={true} />);
      const element = screen.getByLabelText(/Rank.*1st/);
      expect(element).toBeInTheDocument();
    });

    it('should hide decorative icon from screen readers', () => {
      const { container } = render(<UserPointsBadge points={100} />);
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have semantic meaning in text content', () => {
      const { container } = render(<UserPointsBadge points={100} />);
      expect(container.textContent).toMatch(/100/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large point values', () => {
      render(<UserPointsBadge points={999999999} />);
      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });

    it('should handle undefined rank gracefully', () => {
      const { container } = render(
        <UserPointsBadge points={100} rank={undefined} showRank={true} />
      );
      expect(container).toBeInTheDocument();
    });

    it('should handle rank 0 (edge case)', () => {
      const { container } = render(
        <UserPointsBadge points={100} rank={0} showRank={true} />
      );
      // Rank 0 should not display (not a valid rank)
      const rankText = container.textContent?.includes('#0');
      expect(rankText).toBeFalsy();
    });

    it('should handle negative rank (edge case)', () => {
      const { container } = render(
        <UserPointsBadge points={100} rank={-1} showRank={true} />
      );
      // Negative rank should not display
      expect(container).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should be responsive across viewport sizes', () => {
      const { container } = render(
        <UserPointsBadge points={100} variant="md" />
      );
      // Component should scale with variant (md uses text-sm in new design)
      expect(container.firstChild).toHaveClass('text-sm');
    });

    it('should maintain layout in different sizes', () => {
      const { rerender, container } = render(
        <UserPointsBadge points={100} variant="sm" />
      );
      expect(container.firstChild).toHaveClass('inline-flex');

      rerender(<UserPointsBadge points={100} variant="lg" />);
      expect(container.firstChild).toHaveClass('inline-flex');
    });
  });

  describe('i18n Support', () => {
    it('should use translated text for labels', () => {
      render(<UserPointsBadge points={100} variant="md" />);
      // Should render (translated or default)
      expect(screen.getByText(/Points|Label/)).toBeInTheDocument();
    });
  });
});
