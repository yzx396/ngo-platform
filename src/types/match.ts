import { MentorProfile } from './mentor';
import { User } from './user';

export interface Match {
  id: string;
  mentor_id: string;
  mentee_id: string;
  mentor_name?: string;  // Optional for backward compatibility, populated by API
  mentee_name?: string;  // Optional for backward compatibility, populated by API
  status: MatchStatus;
  introduction: string;
  preferred_time: string;
  cv_included?: number;  // 0 or 1, whether mentee included CV with request
  created_at: number;
  updated_at: number;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'active' | 'completed';

// Extended match with profile/user data (for API responses)
export interface MatchWithDetails extends Match {
  mentor_profile: MentorProfile;
  mentee_user: User;
}
