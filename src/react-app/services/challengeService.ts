import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from './apiClient';
import type {
  Challenge,
  ChallengeWithStatus,
  ChallengeSubmission,
  CreateChallengeDTO,
  UpdateChallengeDTO,
  SubmitChallengeDTO,
  ReviewSubmissionDTO
} from '../../types/challenge';

/**
 * Challenge Service
 * Handles all challenge-related API operations
 */

// ============================================================================
// Challenges API
// ============================================================================

/**
 * Fetch all challenges with optional status filter
 * @param status - Optional status filter (active/completed)
 * @returns Array of challenges
 */
export async function getChallenges(status?: 'active' | 'completed'): Promise<Challenge[]> {
  const params = new URLSearchParams();
  if (status) {
    params.append('status', status);
  }

  const url = `/api/v1/challenges${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiGet<{ challenges: Challenge[] }>(url);
  return response.challenges;
}

/**
 * Fetch a single challenge by ID
 * @param challengeId - The ID of the challenge to fetch
 * @returns The challenge object with participation status
 */
export async function getChallengeById(challengeId: string): Promise<ChallengeWithStatus> {
  const response = await apiGet<{ challenge: ChallengeWithStatus }>(`/api/v1/challenges/${challengeId}`);
  return response.challenge;
}

/**
 * Create a new challenge (admin only)
 * @param data - Challenge creation data
 * @returns The created challenge
 */
export async function createChallenge(data: CreateChallengeDTO): Promise<Challenge> {
  const response = await apiPost<{ challenge: Challenge }>('/api/v1/challenges', data);
  return response.challenge;
}

/**
 * Update an existing challenge (admin only)
 * @param challengeId - The ID of the challenge to update
 * @param data - Challenge update data
 * @returns The updated challenge
 */
export async function updateChallenge(
  challengeId: string,
  data: UpdateChallengeDTO
): Promise<Challenge> {
  const response = await apiPut<{ challenge: Challenge }>(`/api/v1/challenges/${challengeId}`, data);
  return response.challenge;
}

/**
 * Delete a challenge (admin only)
 * @param challengeId - The ID of the challenge to delete
 */
export async function deleteChallenge(challengeId: string): Promise<void> {
  await apiDelete(`/api/v1/challenges/${challengeId}`);
}

/**
 * Join a challenge
 * @param challengeId - The ID of the challenge to join
 */
export async function joinChallenge(challengeId: string): Promise<void> {
  await apiPost<{ success: boolean }>(`/api/v1/challenges/${challengeId}/join`, {});
}

/**
 * Submit challenge completion
 * @param challengeId - The ID of the challenge
 * @param data - Submission data (text and optional URL)
 * @returns The created submission
 */
export async function submitChallenge(
  challengeId: string,
  data: SubmitChallengeDTO
): Promise<ChallengeSubmission> {
  const response = await apiPost<{ submission: ChallengeSubmission }>(
    `/api/v1/challenges/${challengeId}/submit`,
    data
  );
  return response.submission;
}

// ============================================================================
// Admin Submission Review API
// ============================================================================

/**
 * Get all submissions for a challenge (admin only)
 * @param challengeId - The ID of the challenge
 * @returns Array of submissions with user info
 */
export async function getChallengeSubmissions(challengeId: string): Promise<ChallengeSubmission[]> {
  const response = await apiGet<{ submissions: ChallengeSubmission[] }>(
    `/api/v1/challenges/${challengeId}/submissions`
  );
  return response.submissions;
}

/**
 * Approve a challenge submission (admin only)
 * @param submissionId - The ID of the submission to approve
 * @returns The updated submission
 */
export async function approveSubmission(submissionId: string): Promise<ChallengeSubmission> {
  const response = await apiFetch<{ submission: ChallengeSubmission }>(
    `/api/v1/submissions/${submissionId}/approve`,
    { method: 'PATCH' }
  );
  return response.submission;
}

/**
 * Reject a challenge submission (admin only)
 * @param submissionId - The ID of the submission to reject
 * @param feedback - Optional feedback for the rejection
 * @returns The updated submission
 */
export async function rejectSubmission(
  submissionId: string,
  feedback?: string
): Promise<ChallengeSubmission> {
  const data: ReviewSubmissionDTO = {};
  if (feedback) {
    data.feedback = feedback;
  }

  const response = await apiFetch<{ submission: ChallengeSubmission }>(
    `/api/v1/submissions/${submissionId}/reject`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );
  return response.submission;
}

/**
 * Get user's completed challenges
 * @param userId - The ID of the user
 * @returns Array of completed challenges
 */
export async function getUserChallenges(userId: string): Promise<Challenge[]> {
  const response = await apiGet<{ challenges: Challenge[] }>(`/api/v1/users/${userId}/challenges`);
  return response.challenges;
}
