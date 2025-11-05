/**
 * Skeleton component for loading states
 * Provides a placeholder that animates while content is loading
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-muted animate-pulse rounded ${className || ''}`}
      role="presentation"
      aria-label="Loading"
    />
  );
}
