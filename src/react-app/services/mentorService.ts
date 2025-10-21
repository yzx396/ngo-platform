import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { MentorProfile } from '../../types/mentor';
import type { CreateMentorProfileRequest, UpdateMentorProfileRequest, SearchMentorsResponse } from '../../types/api';

/**
 * Mentor Profile Service
 * Handles all mentor-related API operations
 */

/**
 * Create a new mentor profile
 * @param data - Mentor profile creation data
 * @returns Created mentor profile with ID
 */
export async function createMentorProfile(
  data: CreateMentorProfileRequest
): Promise<MentorProfile> {
  return apiPost<MentorProfile>('/api/v1/mentors/profiles', data);
}

/**
 * Get mentor profile by ID
 * @param id - Mentor profile ID
 * @returns Mentor profile data
 */
export async function getMentorProfile(id: string): Promise<MentorProfile> {
  return apiGet<MentorProfile>(`/api/v1/mentors/profiles/${id}`);
}

/**
 * Get mentor profile by user ID
 * @param userId - User ID
 * @returns Mentor profile data or null if not found
 */
export async function getMentorProfileByUserId(userId: string): Promise<MentorProfile | null> {
  try {
    return await apiGet<MentorProfile>(`/api/v1/mentors/profiles/by-user/${userId}`);
  } catch (error: unknown) {
    // Return null if profile doesn't exist (404)
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Update mentor profile
 * @param id - Mentor profile ID
 * @param data - Partial mentor profile data to update
 * @returns Updated mentor profile
 */
export async function updateMentorProfile(
  id: string,
  data: UpdateMentorProfileRequest
): Promise<MentorProfile> {
  return apiPut<MentorProfile>(`/api/v1/mentors/profiles/${id}`, data);
}

/**
 * Delete mentor profile
 * @param id - Mentor profile ID
 * @returns Success response
 */
export async function deleteMentorProfile(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/v1/mentors/profiles/${id}`);
}

/**
 * Search and filter mentors
 * @param filters - Search filters (mentoring levels, payment types, rate range, etc.)
 * @returns Paginated list of matching mentor profiles
 */
export async function searchMentors(filters: {
  mentoring_levels?: number;
  payment_types?: number;
  hourly_rate_min?: number;
  hourly_rate_max?: number;
  nick_name?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<SearchMentorsResponse> {
  // Build query string from filters
  const params = new URLSearchParams();

  if (filters.mentoring_levels && filters.mentoring_levels > 0) {
    params.set('mentoring_levels', filters.mentoring_levels.toString());
  }
  if (filters.payment_types && filters.payment_types > 0) {
    params.set('payment_types', filters.payment_types.toString());
  }
  if (filters.hourly_rate_min !== undefined && filters.hourly_rate_min > 0) {
    params.set('hourly_rate_min', filters.hourly_rate_min.toString());
  }
  if (filters.hourly_rate_max !== undefined && filters.hourly_rate_max < 200) {
    params.set('hourly_rate_max', filters.hourly_rate_max.toString());
  }
  if (filters.nick_name) {
    params.set('nick_name', filters.nick_name);
  }

  params.set('limit', (filters.limit || 20).toString());
  params.set('offset', (filters.offset || 0).toString());

  const queryString = params.toString();
  const url = `/api/v1/mentors/search${queryString ? `?${queryString}` : ''}`;

  return apiGet<SearchMentorsResponse>(url);
}

/**
 * Search mentors with pagination convenience
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param filters - Additional filters
 * @returns Paginated search results
 */
export async function searchMentorsByPage(
  page: number = 1,
  limit: number = 12,
  filters?: Omit<Parameters<typeof searchMentors>[0], 'limit' | 'offset'>
): Promise<SearchMentorsResponse> {
  const offset = (page - 1) * limit;
  return searchMentors({ ...filters, limit, offset });
}
