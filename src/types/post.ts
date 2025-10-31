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
