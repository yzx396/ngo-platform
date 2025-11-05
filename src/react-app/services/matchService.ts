import { apiGet, apiPost, apiPatch, apiDelete } from './apiClient';
import type { Match, MatchStatus } from '../../types/match';
import type {
  CreateMatchRequest,
  RespondToMatchRequest,
  GetMatchesResponse,
  GetMatchesRequest,
} from '../../types/api';

/**
 * Match Service
 * Handles all mentorship match-related API operations
 */

/**
 * Create a new match request (mentee initiates)
 * @param data - Match request data including mentor_id, introduction, and preferred_time
 * @returns Created match object
 */
export async function createMatch(data: CreateMatchRequest): Promise<Match> {
  return apiPost<Match>('/api/v1/matches', data);
}

/**
 * Get matches for current user
 * @param filters - Filter options (status, role)
 * @returns List of matches
 */
export async function getMatches(filters?: GetMatchesRequest): Promise<Match[]> {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.set('status', filters.status);
  }
  if (filters?.role) {
    params.set('role', filters.role);
  }

  const queryString = params.toString();
  const url = `/api/v1/matches${queryString ? `?${queryString}` : ''}`;

  const response = await apiGet<GetMatchesResponse>(url);
  return response.matches || [];
}

/**
 * Get matches filtered by status and role (convenience method)
 * @param status - Match status to filter by
 * @param role - User role (mentor or mentee)
 * @returns List of filtered matches
 */
export async function getMatchesByStatusAndRole(
  status?: MatchStatus,
  role?: 'mentor' | 'mentee'
): Promise<Match[]> {
  return getMatches({ status, role });
}

/**
 * Mentor accepts or rejects a match request
 * @param matchId - ID of the match
 * @param action - 'accept' or 'reject'
 * @returns Updated match object
 */
export async function respondToMatch(
  matchId: string,
  action: 'accept' | 'reject'
): Promise<Match> {
  const data: RespondToMatchRequest = { action };
  return apiPost<Match>(`/api/v1/matches/${matchId}/respond`, data);
}

/**
 * Complete a match (mark as finished)
 * @param matchId - ID of the match to complete
 * @returns Updated match object
 */
export async function completeMatch(matchId: string): Promise<Match> {
  return apiPatch<Match>(`/api/v1/matches/${matchId}/complete`, {});
}

/**
 * Cancel or delete a match
 * @param matchId - ID of the match to delete
 * @returns Success response
 */
export async function deleteMatch(matchId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/v1/matches/${matchId}`);
}

/**
 * Accept a match (convenience wrapper for mentor)
 * @param matchId - ID of the match to accept
 * @returns Updated match object
 */
export async function acceptMatch(matchId: string): Promise<Match> {
  return respondToMatch(matchId, 'accept');
}

/**
 * Reject a match (convenience wrapper for mentor)
 * @param matchId - ID of the match to reject
 * @returns Updated match object
 */
export async function rejectMatch(matchId: string): Promise<Match> {
  return respondToMatch(matchId, 'reject');
}

/**
 * Check if a match already exists between current user (mentee) and a mentor
 * @param mentorId - ID of the mentor to check
 * @returns Match status if exists, null if not
 */
export async function checkExistingMatch(mentorId: string): Promise<{
  exists: boolean;
  matchId?: string;
  status?: string;
} | null> {
  try {
    const response = await apiGet<{
      exists: boolean;
      matchId?: string;
      status?: string;
    }>(`/api/v1/matches/check/${mentorId}`);
    return response;
  } catch (error) {
    // 404 means no match exists - return null or false
    if (error instanceof Error && error.message.includes('404')) {
      return { exists: false };
    }
    // Re-throw other errors
    throw error;
  }
}
