import { MentorProfile } from './mentor';
import { User } from './user';

export interface Match {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: MatchStatus;
  introduction: string;
  preferred_time: string;
  created_at: number;
  updated_at: number;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'active' | 'completed';

// Extended match with profile/user data (for API responses)
export interface MatchWithDetails extends Match {
  mentor_profile: MentorProfile;
  mentee_user: User;
}
