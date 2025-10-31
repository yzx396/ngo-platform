/**
 * Points System Types
 * Defines types and helpers for user points and gamification
 */

/**
 * UserPoints - Database representation of user points
 * Stores accumulated points for a user with last update timestamp
 */
export interface UserPoints {
  id: string;
  user_id: string;
  points: number;
  updated_at: number;
}

/**
 * UserPointsWithRank - User points including calculated rank
 * Rank is calculated on-the-fly from leaderboard, not stored
 */
export interface UserPointsWithRank extends UserPoints {
  rank?: number; // User's rank in leaderboard (1-indexed)
}

/**
 * Normalize user points from database
 * Ensures points are properly typed and handles edge cases
 * @param dbPoints - Raw data from database
 * @returns Properly typed UserPoints
 */
export function normalizeUserPoints(dbPoints: unknown): UserPoints {
  const data = dbPoints as Record<string, unknown>;

  return {
    id: String(data.id || ''),
    user_id: String(data.user_id || ''),
    points: Number(data.points || 0),
    updated_at: Number(data.updated_at || 0),
  };
}

/**
 * Normalize user points with rank
 * @param dbPoints - Raw data from database
 * @param rank - Calculated rank (optional)
 * @returns Properly typed UserPointsWithRank
 */
export function normalizeUserPointsWithRank(
  dbPoints: unknown,
  rank?: number
): UserPointsWithRank {
  return {
    ...normalizeUserPoints(dbPoints),
    rank,
  };
}

/**
 * Format points for display
 * @param points - Number of points
 * @returns Formatted string (e.g., "1,234 points")
 */
export function formatPoints(points: number): string {
  return points.toLocaleString();
}

/**
 * Get points badge color based on points amount
 * @param points - Number of points
 * @returns Tailwind color class
 */
export function getPointsColor(points: number): string {
  if (points >= 1000) return 'text-yellow-500'; // Gold
  if (points >= 500) return 'text-blue-500'; // Silver
  if (points >= 100) return 'text-orange-500'; // Bronze
  return 'text-gray-500'; // Default
}

/**
 * Get rank badge text
 * @param rank - User's rank
 * @returns Formatted rank string (e.g., "1st", "2nd", "3rd", "4th+")
 */
export function formatRank(rank: number | undefined): string {
  if (!rank || rank < 1) return '';

  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;

  // Handle 11-13 (special cases)
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${rank}th`;
  }

  switch (lastDigit) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

/**
 * Initial points for new users
 */
export const INITIAL_POINTS = 0;

/**
 * Maximum reasonable points (for validation)
 */
export const MAX_POINTS = 999999;
