/**
 * Match type definitions
 * Represents a mentor-mentee match request and its lifecycle
 */

import type { MentorProfile } from './mentor';
import type { User } from './user';

/**
 * Match status values
 * Lifecycle: pending → accepted → active → completed
 * Alternative: pending → rejected (final state)
 */
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'active' | 'completed';

/**
 * Match interface
 * Represents a mentor-mentee match request
 */
export interface Match {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: MatchStatus;
  created_at: number;
  updated_at: number;
}

/**
 * Extended match with profile/user data (for API responses)
 * Includes denormalized data for efficient frontend rendering
 */
export interface MatchWithDetails extends Match {
  mentor_profile: MentorProfile;
  mentee_user: User;
}
