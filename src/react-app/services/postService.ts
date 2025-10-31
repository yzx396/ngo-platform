import { apiGet } from './apiClient';
import type { GetPostsResponse } from '../../types/api';
import type { Post, PostType } from '../../types/post';

/**
 * Posts Service
 * Handles all post-related API operations
 */

/**
 * Fetch posts with pagination and optional type filtering
 * @param limit - Number of posts to fetch (default: 20)
 * @param offset - Number of posts to skip (default: 0)
 * @param type - Optional post type to filter by
 * @returns Posts response with pagination info and posts array
 */
export async function getPosts(
  limit: number = 20,
  offset: number = 0,
  type?: PostType
): Promise<GetPostsResponse> {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));
  if (type) {
    params.append('type', type);
  }

  const url = `/api/v1/posts?${params.toString()}`;
  return apiGet<GetPostsResponse>(url);
}

/**
 * Fetch a single post by ID
 * @param postId - The ID of the post to fetch
 * @returns The post object
 */
export async function getPostById(postId: string): Promise<Post> {
  return apiGet<Post>(`/api/v1/posts/${postId}`);
}

/**
 * Fetch all posts (convenience method - fetches with high limit)
 * @param type - Optional post type to filter by
 * @returns Posts response with all posts
 */
export async function getAllPosts(type?: PostType): Promise<Post[]> {
  const response = await getPosts(1000, 0, type); // Fetch up to 1000 posts
  return response.posts;
}
