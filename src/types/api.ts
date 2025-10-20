import { MentorProfile } from './mentor';
import { Match, MatchStatus } from './match';

// User API
export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// Mentor Profile API
export interface CreateMentorProfileRequest {
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number; // Bit flags
  availability?: string | null; // Free text description
  hourly_rate?: number | null;
  payment_types: number; // Bit flags
  allow_reviews?: boolean;
  allow_recording?: boolean;
}

export interface UpdateMentorProfileRequest {
  nick_name?: string;
  bio?: string;
  mentoring_levels?: number;
  availability?: string | null; // Free text description
  hourly_rate?: number | null;
  payment_types?: number;
  allow_reviews?: boolean;
  allow_recording?: boolean;
}

// Search API
export interface SearchMentorsRequest {
  mentoring_levels?: number; // Bit flags to filter
  payment_types?: number; // Bit flags to filter
  hourly_rate_max?: number;
  hourly_rate_min?: number;
  nick_name?: string;
  limit?: number;
  offset?: number;
}

export interface SearchMentorsResponse {
  mentors: MentorProfile[];
  total: number;
  limit: number;
  offset: number;
}

// Match API
export interface CreateMatchRequest {
  mentor_id: string;
  mentee_id?: string; // Optional, for testing. In production, comes from auth headers.
}

export interface RespondToMatchRequest {
  action: 'accept' | 'reject';
}

export interface GetMatchesRequest {
  status?: MatchStatus;
  role?: 'mentor' | 'mentee';
}

export interface GetMatchesResponse {
  matches: Match[];
}
