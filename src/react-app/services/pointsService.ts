import { apiGet, apiPatch } from './apiClient';
import type { GetUserPointsResponse, UpdateUserPointsRequest } from '../../types/api';

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
  action?: string
): Promise<GetUserPointsResponse> {
  // In a more complete system, this could log the action
  console.log(`Awarding ${pointsToAward} points to ${userId} for: ${action || 'unspecified action'}`);
  return addPointsToUser(userId, pointsToAward);
}
