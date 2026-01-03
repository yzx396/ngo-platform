import { apiGet, apiPatch } from './apiClient';
import type { GetUserPointsResponse, UpdateUserPointsRequest, GetLeaderboardResponse } from '../../types/api';

/**
 * Points Service
 * Handles all points-related API operations
 */

/**
 * Get user points and rank
 * @param userId - User ID to fetch points for
 * @returns User points with calculated rank
 */
export async function getUserPoints(userId: string): Promise<GetUserPointsResponse> {
  return apiGet<GetUserPointsResponse>(`/api/v1/users/${userId}/points`);
}

/**
 * Update user points (admin only)
 * Internal endpoint for awarding or adjusting points
 * @param userId - User ID to update
 * @param points - Points value to set
 * @returns Updated points response
 */
export async function updateUserPoints(
  userId: string,
  points: number
): Promise<GetUserPointsResponse> {
  const body: UpdateUserPointsRequest = { points };
  return apiPatch<GetUserPointsResponse>(`/api/v1/users/${userId}/points`, body);
}

/**
 * Add points to user (convenience method)
 * Note: Currently calls updateUserPoints which sets absolute value
 * For incrementing, you would need to fetch current points first
 * @param userId - User ID
 * @param pointsToAdd - Number of points to add
 * @returns Updated points
 */
export async function addPointsToUser(
  userId: string,
  pointsToAdd: number
): Promise<GetUserPointsResponse> {
  // Fetch current points
  const current = await getUserPoints(userId);
  // Add new points and update
  const newTotal = (current.points || 0) + pointsToAdd;
  return updateUserPoints(userId, newTotal);
}

/**
 * Award points for an action (admin only)
 * @param userId - User ID to award points to
 * @param pointsToAward - Number of points to award
 * @param action - What action earned the points (for logging/auditing)
 * @returns Updated points
 */
export async function awardPointsForAction(
  userId: string,
  pointsToAward: number,
  _action?: string
): Promise<GetUserPointsResponse> {
  return addPointsToUser(userId, pointsToAward);
}

/**
 * Get leaderboard - list of users sorted by points
 * @param limit - Number of users to return (default 50, max 100)
 * @param offset - Pagination offset (default 0)
 * @returns Leaderboard with users, total count, and pagination info
 */
export async function getLeaderboard(
  limit: number = 50,
  offset: number = 0
): Promise<GetLeaderboardResponse> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());

  const queryString = params.toString();
  const url = `/api/v1/leaderboard${queryString ? `?${queryString}` : ''}`;
  return apiGet<GetLeaderboardResponse>(url);
}
