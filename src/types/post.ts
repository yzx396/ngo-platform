/**
 * Post System Types
 * Defines types and helpers for community posts and feed functionality
 */

/**
 * PostType - Enum for different post types
 * - Announcement: Official announcements from admins (badge displayed)
 * - Discussion: Community discussions and questions
 * - General: General posts and updates
 */
export enum PostType {
  Announcement = 'announcement',
  Discussion = 'discussion',
  General = 'general',
}

/**
 * Post - Database representation of a community post
 * Stores all post metadata including engagement counts
 */
export interface Post {
  id: string;
  user_id: string;
  content: string;
  post_type: PostType;
  likes_count: number;
  comments_count: number;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * PostWithAuthor - Post with author information (for display)
 * Extends Post with user details fetched from database join
 */
export interface PostWithAuthor extends Post {
  author_name?: string;
  author_email?: string;
}

/**
 * PostLike - Record of a user liking a post
 * Stored in post_likes table with unique constraint on (post_id, user_id)
 */
export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: number; // Unix timestamp
}

/**
 * PostWithLikeStatus - Post with user's like status
 * Used when returning post data to frontend with whether current user liked it
 */
export interface PostWithLikeStatus extends Post {
  author_name?: string;
  author_email?: string;
  user_has_liked?: boolean; // Whether current user has liked this post
}

/**
 * PostComment - Record of a user commenting on a post
 * Stored in post_comments table with support for nested replies
 */
export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string | null; // For nested replies (optional)
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * PostCommentWithAuthor - Comment with author information (for display)
 * Extends PostComment with user details fetched from database join
 */
export interface PostCommentWithAuthor extends PostComment {
  author_name?: string;
  author_email?: string;
}

/**
 * Normalize post from database
 * Ensures all fields are properly typed and handles edge cases
 * @param dbPost - Raw data from database
 * @returns Properly typed Post object
 */
export function normalizePost(dbPost: unknown): Post {
  const data = dbPost as Record<string, unknown>;

  // Validate post_type is one of the valid enum values
  const postType = String(data.post_type || 'general');
  let normalizedType = PostType.General;
  if (Object.values(PostType).includes(postType as PostType)) {
    normalizedType = postType as PostType;
  } else {
    console.warn(`Invalid post_type "${postType}", defaulting to "general"`);
  }

  return {
    id: String(data.id || ''),
    user_id: String(data.user_id || ''),
    content: String(data.content || ''),
    post_type: normalizedType,
    likes_count: Number(data.likes_count || 0),
    comments_count: Number(data.comments_count || 0),
    created_at: Number(data.created_at || 0),
    updated_at: Number(data.updated_at || 0),
  };
}

/**
 * Normalize post with author information
 * @param dbPost - Raw data from database
 * @param authorName - Optional author name from join
 * @param authorEmail - Optional author email from join
 * @returns Properly typed PostWithAuthor object
 */
export function normalizePostWithAuthor(
  dbPost: unknown,
  authorName?: string,
  authorEmail?: string
): PostWithAuthor {
  return {
    ...normalizePost(dbPost),
    author_name: authorName,
    author_email: authorEmail,
  };
}

/**
 * Get human-readable name for post type
 * @param postType - The post type enum value
 * @returns Display name (e.g., "Announcement" for PostType.Announcement)
 */
export function getPostTypeName(postType: PostType): string {
  switch (postType) {
    case PostType.Announcement:
      return 'Announcement';
    case PostType.Discussion:
      return 'Discussion';
    case PostType.General:
      return 'General';
    default:
      return 'Unknown';
  }
}

/**
 * Normalize PostLike from database
 * Ensures all fields are properly typed and handles edge cases
 * @param dbLike - Raw data from database
 * @returns Properly typed PostLike object
 */
export function normalizePostLike(dbLike: unknown): PostLike {
  const data = dbLike as Record<string, unknown>;

  return {
    id: String(data.id || ''),
    post_id: String(data.post_id || ''),
    user_id: String(data.user_id || ''),
    created_at: Number(data.created_at || 0),
  };
}

/**
 * Normalize PostComment from database
 * Ensures all fields are properly typed and handles edge cases
 * @param dbComment - Raw data from database
 * @returns Properly typed PostComment object
 */
export function normalizePostComment(dbComment: unknown): PostComment {
  const data = dbComment as Record<string, unknown>;

  return {
    id: String(data.id || ''),
    post_id: String(data.post_id || ''),
    user_id: String(data.user_id || ''),
    content: String(data.content || ''),
    parent_comment_id: data.parent_comment_id ? String(data.parent_comment_id) : null,
    created_at: Number(data.created_at || 0),
    updated_at: Number(data.updated_at || 0),
  };
}

/**
 * Normalize PostComment with author information
 * @param dbComment - Raw data from database
 * @param authorName - Optional author name from join
 * @param authorEmail - Optional author email from join
 * @returns Properly typed PostCommentWithAuthor object
 */
export function normalizePostCommentWithAuthor(
  dbComment: unknown,
  authorName?: string,
  authorEmail?: string
): PostCommentWithAuthor {
  return {
    ...normalizePostComment(dbComment),
    author_name: authorName,
    author_email: authorEmail,
  };
}

/**
 * Format timestamp for display
 * @param timestamp - Unix timestamp (seconds)
 * @returns Formatted date string (relative or absolute)
 */
export function formatPostTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  // Less than a minute
  if (diffSecs < 60) {
    return 'just now';
  }

  // Minutes
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  // Hours
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // Days
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Fall back to formatted date
  return date.toLocaleDateString();
}
