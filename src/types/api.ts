import { MentorProfile } from './mentor';
import { Match, MatchStatus } from './match';
import { UserRole } from './role';
import { UserPointsWithRank } from './points';
import { Post, PostType, PostCommentWithAuthor, PostWithLikeStatus } from './post';

// User API
export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

export interface GetUsersRequest {
  limit?: number;
  offset?: number;
}

export interface GetUsersResponse {
  users: import('./user').User[];
  total: number;
  limit: number;
  offset: number;
}

// Role API
export interface AssignRoleRequest {
  userId: string;
  role: UserRole;
}

export interface GetUserRoleResponse {
  userId: string;
  role: UserRole;
}

// Mentor Profile API
export interface CreateMentorProfileRequest {
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number; // Bit flags - which levels can this mentor guide
  availability?: string | null; // Free text description
  hourly_rate?: number | null;
  payment_types: number; // Bit flags
  expertise_domains?: number; // Bit flags - professional domains
  expertise_topics_preset?: number; // Bit flags - predefined expertise topics
  expertise_topics_custom?: string[]; // Custom topic tags
  allow_reviews?: boolean;
  allow_recording?: boolean;
  linkedin_url?: string | null; // LinkedIn profile URL
}

export interface UpdateMentorProfileRequest {
  nick_name?: string;
  bio?: string;
  mentoring_levels?: number;
  availability?: string | null; // Free text description
  hourly_rate?: number | null;
  payment_types?: number;
  expertise_domains?: number;
  expertise_topics_preset?: number;
  expertise_topics_custom?: string[];
  allow_reviews?: boolean;
  allow_recording?: boolean;
  linkedin_url?: string | null; // LinkedIn profile URL
}

// Search API
export interface SearchMentorsRequest {
  mentoring_levels?: number; // Bit flags to filter - which levels mentor can guide
  payment_types?: number; // Bit flags to filter
  expertise_domains?: number; // Bit flags - filter by mentor's professional domains
  expertise_topics?: number; // Bit flags - filter by mentor's expertise topics (preset only)
  expertise_topics_custom?: string[]; // Filter by custom topic tags
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
  introduction: string;
  preferred_time: string;
  cv_included?: boolean; // Whether mentee included their CV with the request
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

// Points API
export type GetUserPointsResponse = UserPointsWithRank;

export interface UpdateUserPointsRequest {
  points: number; // Points to set (internal use only, admin)
}

export interface UserPointsResponse {
  userId: string;
  points: number;
  rank?: number; // User's rank in leaderboard
}

// Leaderboard API
export interface LeaderboardEntry {
  user_id: string;
  name: string;
  points: number;
  rank: number; // 1-indexed rank in leaderboard
}

export interface GetLeaderboardRequest {
  limit?: number; // Default: 50, max: 100
  offset?: number; // Default: 0
}

export interface GetLeaderboardResponse {
  users: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

// Posts API
export interface GetPostsRequest {
  limit?: number; // Default: 20
  offset?: number; // Default: 0
  type?: PostType; // Optional: filter by post type
}

export interface GetPostsResponse {
  posts: PostWithLikeStatus[];
  total: number;
  limit: number;
  offset: number;
}

export type GetPostByIdResponse = Post;

export interface CreatePostRequest {
  content: string;
  post_type?: PostType; // Optional, defaults to 'general'
}

export interface UpdatePostRequest {
  content?: string;
  post_type?: PostType;
}

export type CreatePostResponse = Post;
export type UpdatePostResponse = Post;

// Post Likes API
export type LikePostRequest = Record<string, never>; // No request body needed

export interface LikePostResponse {
  post: Post;
  user_has_liked: boolean; // Whether current user has liked the post
}

export type UnlikePostResponse = LikePostResponse;

// Post Comments API
export interface CreateCommentRequest {
  content: string; // Comment content (required, max 500 characters)
  parent_comment_id?: string; // Optional: for replying to another comment
}

export interface GetCommentsRequest {
  limit?: number; // Default: 20
  offset?: number; // Default: 0
}

export interface GetCommentsResponse {
  comments: PostCommentWithAuthor[];
  total: number;
  limit: number;
  offset: number;
}

export type CreateCommentResponse = PostCommentWithAuthor;

export interface DeleteCommentResponse {
  success: boolean;
}
