/**
 * React Test Post Fixtures
 *
 * Pre-defined post objects for React component testing.
 *
 * Usage:
 * ```typescript
 * import { postFixtures } from '../fixtures/posts';
 *
 * render(<PostCard post={postFixtures.text} />);
 * ```
 */

import type { Post } from '../../types/post';
import { PostType } from '../../types/post';

// ============================================================================
// Pre-defined Test Posts
// ============================================================================

export const postFixtures = {
  /**
   * A text post
   */
  text: {
    id: 'post-text-1',
    user_id: 'user-123',
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
    user_id: 'user-123',
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
    user_id: 'user-123',
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
    user_id: 'user-123',
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
    user_id: 'user-mentor-101',
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
    user_id: 'user-123',
    post_type: PostType.Job,
    content: 'We are hiring! Apply now.',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Post,

  /**
   * Multiple posts for list testing
   */
  list: [
    {
      id: 'post-list-1',
      user_id: 'user-1',
      post_type: PostType.Text,
      content: 'First post',
      created_at: 1000000000,
      updated_at: 1000000000,
    } as Post,
    {
      id: 'post-list-2',
      user_id: 'user-1',
      post_type: PostType.Image,
      content: 'https://example.com/image1.jpg',
      created_at: 1000000001,
      updated_at: 1000000001,
    } as Post,
    {
      id: 'post-list-3',
      user_id: 'user-2',
      post_type: PostType.Link,
      content: 'https://example.com/link',
      created_at: 1000000002,
      updated_at: 1000000002,
    } as Post,
    {
      id: 'post-list-4',
      user_id: 'user-1',
      post_type: PostType.Video,
      content: 'https://example.com/video.mp4',
      created_at: 1000000003,
      updated_at: 1000000003,
    } as Post,
    {
      id: 'post-list-5',
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
 * Creates a custom post for React tests
 */
export function createPost(overrides: Partial<Post> = {}): Post {
  const timestamp = Date.now();
  return {
    id: `post-${timestamp}`,
    user_id: `user-${timestamp}`,
    post_type: PostType.Text,
    content: `Post content ${timestamp}`,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

/**
 * Creates a text post
 */
export function createTextPost(userId: string, content: string): Post {
  return createPost({
    user_id: userId,
    post_type: PostType.Text,
    content,
  });
}

/**
 * Creates an image post
 */
export function createImagePost(userId: string, imageUrl: string): Post {
  return createPost({
    user_id: userId,
    post_type: PostType.Image,
    content: imageUrl,
  });
}

/**
 * Creates a link post
 */
export function createLinkPost(userId: string, url: string): Post {
  return createPost({
    user_id: userId,
    post_type: PostType.Link,
    content: url,
  });
}

/**
 * Creates a video post
 */
export function createVideoPost(userId: string, videoUrl: string): Post {
  return createPost({
    user_id: userId,
    post_type: PostType.Video,
    content: videoUrl,
  });
}

/**
 * Creates a list of posts
 */
export function createPosts(count: number, userId: string): Post[] {
  return Array.from({ length: count }, (_, i) =>
    createPost({
      id: `post-${i}`,
      user_id: userId,
      content: `Post ${i}`,
    })
  );
}

/**
 * Creates posts with different types
 */
export function createPostsWithDifferentTypes(userId: string): Post[] {
  const types = Object.values(PostType);
  return types.map((type, i) =>
    createPost({
      id: `post-${type}-${i}`,
      user_id: userId,
      post_type: type,
      content: `${type} post ${i}`,
    })
  );
}
