import { useTranslation } from 'react-i18next';
import { formatPoints, formatRank, getPointsColor } from '../../types/points';

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
 * UserPointsBadge Component
 * Displays user points with optional rank
 * Responsive design with color coding based on points amount
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

  // Get color based on points
  const pointsColor = getPointsColor(points);

  // Size classes
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3',
  };

  // Base classes
  const baseClasses = `font-semibold ${sizeClasses[variant]} ${pointsColor}`;

  // Badge styling
  const badgeClasses = showBadge
    ? 'inline-flex items-center gap-1.5 rounded-full bg-opacity-10 bg-gray-200'
    : 'inline-flex items-center gap-1.5';

  // Format points display
  const formattedPoints = formatPoints(points);

  // Format rank if provided
  const formattedRank = showRank && rank ? formatRank(rank) : null;

  return (
    <div
      className={`${badgeClasses} ${baseClasses} ${className}`}
      aria-label={`${formattedPoints} ${t('points.label', 'Points')}${formattedRank ? ` - ${t('points.rank', 'Rank')}: ${formattedRank}` : ''}`}
    >
      {/* Points Icon (simple star or circle icon) */}
      <span aria-hidden="true" className="inline-block w-4 h-4">
        ⭐
      </span>

      {/* Points Value */}
      <span className="font-bold">{formattedPoints}</span>

      {/* Points Label (abbreviated in small variant) */}
      {variant !== 'sm' && (
        <span className="ml-0.5">
          {t('points.label', 'Points')}
        </span>
      )}

      {/* Rank Badge (if visible) */}
      {formattedRank && (
        <>
          <span className="text-gray-400 mx-1">•</span>
          <span className="text-xs font-bold uppercase tracking-wide">
            #{formattedRank}
          </span>
        </>
      )}
    </div>
  );
}

export default UserPointsBadge;
