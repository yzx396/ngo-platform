/**
 * Test Post Fixtures
 *
 * Pre-defined post objects for testing. Eliminates repeated post creation across test files.
 *
 * Usage:
 * ```typescript
 * import { testPosts } from '../fixtures/testPosts';
 *
 * const post = testPosts.text;
 * ```
 */

import type { Post } from '../../../types/post';
import { PostType } from '../../../types/post';

// ============================================================================
// Pre-defined Test Posts
// ============================================================================

export const testPosts = {
  /**
   * A text post
   */
  text: {
    id: 'post-text-1',
    user_id: 'user-regular-123',
    post_type: PostType.Text,
    content: 'This is a text post',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * An image post
   */
  image: {
    id: 'post-image-1',
    user_id: 'user-regular-123',
    post_type: PostType.Image,
    content: 'https://example.com/image.jpg',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * A link post
   */
  link: {
    id: 'post-link-1',
    user_id: 'user-regular-123',
    post_type: PostType.Link,
    content: 'https://example.com/article',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * A video post
   */
  video: {
    id: 'post-video-1',
    user_id: 'user-regular-123',
    post_type: PostType.Video,
    content: 'https://example.com/video.mp4',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * A mentor profile post
   */
  mentorProfile: {
    id: 'post-mentor-1',
    user_id: 'user-mentor-789',
    post_type: PostType.MentorProfile,
    content: 'Check out my mentor profile!',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * A job post
   */
  job: {
    id: 'post-job-1',
    user_id: 'user-regular-123',
    post_type: PostType.Job,
    content: 'We are hiring! Apply now.',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * A long content post
   */
  longContent: {
    id: 'post-long-1',
    user_id: 'user-regular-123',
    post_type: PostType.Text,
    content: 'A'.repeat(1000),
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * A post with special characters
   */
  specialChars: {
    id: 'post-special-1',
    user_id: 'user-regular-123',
    post_type: PostType.Text,
    content: 'Hello 世界! 🌍 Special chars: @#$%^&*()',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * Multiple posts for list testing
   */
  multiple: [
    {
      id: 'post-multi-1',
      user_id: 'user-1',
      post_type: PostType.Text,
      content: 'First post',
      created_at: 1000000000,
      updated_at: 1000000000,
    } as Post,
    {
      id: 'post-multi-2',
      user_id: 'user-1',
      post_type: PostType.Image,
      content: 'https://example.com/image1.jpg',
      created_at: 1000000001,
      updated_at: 1000000001,
    } as Post,
    {
      id: 'post-multi-3',
      user_id: 'user-2',
      post_type: PostType.Link,
      content: 'https://example.com/link',
      created_at: 1000000002,
      updated_at: 1000000002,
    } as Post,
    {
      id: 'post-multi-4',
      user_id: 'user-1',
      post_type: PostType.Video,
      content: 'https://example.com/video.mp4',
      created_at: 1000000003,
      updated_at: 1000000003,
    } as Post,
    {
      id: 'post-multi-5',
      user_id: 'user-3',
      post_type: PostType.Text,
      content: 'Fifth post',
      created_at: 1000000004,
      updated_at: 1000000004,
    } as Post,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom post
 */
export function createPost(
  id: string,
  userId: string,
  postType: PostType,
  content: string,
  createdAt: number = Date.now(),
  updatedAt: number = createdAt
): Post {
  return {
    id,
    user_id: userId,
    post_type: postType,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Creates a text post
 */
export function createTextPost(id: string, userId: string, content: string): Post {
  return createPost(id, userId, PostType.Text, content);
}

/**
 * Creates an image post
 */
export function createImagePost(id: string, userId: string, imageUrl: string): Post {
  return createPost(id, userId, PostType.Image, imageUrl);
}

/**
 * Creates a link post
 */
export function createLinkPost(id: string, userId: string, url: string): Post {
  return createPost(id, userId, PostType.Link, url);
}

/**
 * Creates a video post
 */
export function createVideoPost(id: string, userId: string, videoUrl: string): Post {
  return createPost(id, userId, PostType.Video, videoUrl);
}

/**
 * Creates a mentor profile post
 */
export function createMentorProfilePost(id: string, userId: string, content: string): Post {
  return createPost(id, userId, PostType.MentorProfile, content);
}

/**
 * Creates a job post
 */
export function createJobPost(id: string, userId: string, content: string): Post {
  return createPost(id, userId, PostType.Job, content);
}

/**
 * Creates a randomized post
 */
export function createRandomPost(userId: string, prefix: string = 'post', postType: PostType = PostType.Text): Post {
  const timestamp = Date.now();
  return createPost(
    `${prefix}-${timestamp}`,
    userId,
    postType,
    `${prefix} content ${timestamp}`
  );
}

/**
 * Creates a list of posts
 */
export function createPosts(count: number, userId: string, postType: PostType = PostType.Text): Post[] {
  return Array.from({ length: count }, (_, i) =>
    createRandomPost(userId, `post-${i}`, postType)
  );
}

/**
 * Creates a list of posts with different types
 */
export function createPostsWithDifferentTypes(userId: string): Post[] {
  const types = Object.values(PostType);
  return types.map((type) =>
    createRandomPost(userId, `post-${type}`, type)
  );
}
