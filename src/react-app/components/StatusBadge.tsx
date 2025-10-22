import { useTranslation } from 'react-i18next';
import type { MatchStatus } from '../../types/match';

interface StatusBadgeProps {
  status: MatchStatus;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StatusBadge component
 * Displays match status with color-coded styling for visual clarity
 */
export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { t } = useTranslation();

  // Status to display text mapping using translations
  const getStatusText = (status: MatchStatus): string => {
    return t(`status.${status}`);
  };

  // Status to color mapping - using light backgrounds
  const statusColors: Record<MatchStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  // Size to text class mapping
  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  const displayText = getStatusText(status);

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold ${statusColors[status]} ${sizeClasses[size]}`}
      aria-label={`Match status: ${displayText}`}
    >
      {displayText}
    </span>
  );
}
