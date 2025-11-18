import { useTranslation } from 'react-i18next';
import { formatPoints, formatRank } from '../../types/points';
import { Sparkles } from 'lucide-react';

interface UserPointsBadgeProps {
  /**
   * Number of points to display
   */
  points: number;

  /**
   * Optional user rank in leaderboard
   */
  rank?: number;

  /**
   * Whether to show rank (default: false)
   */
  showRank?: boolean;

  /**
   * Optional CSS class for additional styling
   */
  className?: string;

  /**
   * Size variant
   */
  variant?: 'sm' | 'md' | 'lg';

  /**
   * Whether to display as a badge (rounded background) or just text
   */
  showBadge?: boolean;
}

/**
 * UserPointsBadge Component - Warm & Delightful Design
 * Displays user points with optional rank
 * Features gradient background and sparkle icon
 */
export function UserPointsBadge({
  points,
  rank,
  showRank = false,
  className = '',
  variant = 'md',
  showBadge = true,
}: UserPointsBadgeProps) {
  const { t } = useTranslation();

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Badge styling with warm gradient
  const badgeClasses = showBadge
    ? 'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent/15 via-primary/10 to-secondary/15 border border-accent/20 font-bold text-accent-foreground shadow-sm'
    : 'inline-flex items-center gap-1.5 font-semibold text-accent-foreground';

  // Format points display
  const formattedPoints = formatPoints(points);

  // Format rank if provided
  const formattedRank = showRank && rank ? formatRank(rank) : null;

  return (
    <div
      className={`${badgeClasses} ${sizeClasses[variant]} ${className} group transition-all hover:shadow-md hover:scale-105`}
      aria-label={`${formattedPoints} ${t('points.label', 'Points')}${formattedRank ? ` - ${t('points.rank', 'Rank')}: ${formattedRank}` : ''}`}
    >
      {/* Points Icon - Sparkles */}
      <Sparkles className={`${iconSizes[variant]} text-accent group-hover:rotate-12 transition-transform`} aria-hidden="true" />

      {/* Points Value */}
      <span className="font-bold">{formattedPoints}</span>

      {/* Points Label (abbreviated in small variant) */}
      {variant !== 'sm' && (
        <span className="ml-0.5 font-medium">
          {t('points.label', 'Points')}
        </span>
      )}

      {/* Rank Badge (if visible) */}
      {formattedRank && (
        <>
          <span className="w-1 h-1 rounded-full bg-accent/40 mx-1" />
          <span className="text-xs font-bold tracking-wide">
            #{formattedRank}
          </span>
        </>
      )}
    </div>
  );
}

export default UserPointsBadge;
