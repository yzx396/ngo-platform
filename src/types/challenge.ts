// Challenge status enum
export enum ChallengeStatus {
  Active = 'active',
  Completed = 'completed'
}

// Submission status enum
export enum SubmissionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected'
}

// Challenge interface
export interface Challenge {
  id: string;
  title: string;
  description: string;
  requirements: string;
  created_by_user_id: string;
  point_reward: number;
  deadline: number; // Unix timestamp
  status: ChallengeStatus;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  // Additional fields populated by queries
  participant_count?: number;
  creator_name?: string;
}

// Challenge participant interface
export interface ChallengeParticipant {
  id: string;
  user_id: string;
  challenge_id: string;
  joined_at: number; // Unix timestamp
}

// Challenge submission interface
export interface ChallengeSubmission {
  id: string;
  user_id: string;
  challenge_id: string;
  submission_text: string;
  submission_url: string | null;
  status: SubmissionStatus;
  submitted_at: number; // Unix timestamp
  reviewed_at: number | null; // Unix timestamp
  reviewed_by_user_id: string | null;
  feedback: string | null;
  // Additional fields populated by queries
  user_name?: string;
  user_email?: string;
  challenge_title?: string;
}

// Challenge with user participation status
export interface ChallengeWithStatus extends Challenge {
  user_has_joined?: boolean;
  user_submission?: ChallengeSubmission | null;
}

// DTO for creating a challenge
export interface CreateChallengeDTO {
  title: string;
  description: string;
  requirements: string;
  point_reward: number;
  deadline: number; // Unix timestamp
}

// DTO for updating a challenge
export interface UpdateChallengeDTO {
  title?: string;
  description?: string;
  requirements?: string;
  point_reward?: number;
  deadline?: number; // Unix timestamp
  status?: ChallengeStatus;
}

// DTO for submitting challenge completion
export interface SubmitChallengeDTO {
  submission_text: string;
  submission_url?: string;
}

// DTO for reviewing submission
export interface ReviewSubmissionDTO {
  feedback?: string;
}
