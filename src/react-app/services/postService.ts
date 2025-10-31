import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from './apiClient';
import type { GetPostsResponse, CreatePostRequest, UpdatePostRequest, CreatePostResponse, UpdatePostResponse } from '../../types/api';
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

/**
 * Create a new post
 * @param content - The post content (required, max 2000 characters)
 * @param postType - Optional post type (general, discussion, announcement)
 * @returns The created post
 */
export async function createPost(
  content: string,
  postType?: PostType
): Promise<Post> {
  const body: CreatePostRequest = {
    content,
  };
  if (postType) {
    body.post_type = postType;
  }

  return apiPost<CreatePostResponse>('/api/v1/posts', body);
}

/**
 * Update an existing post
 * @param postId - The ID of the post to update
 * @param content - Optional new content
 * @param postType - Optional new post type
 * @returns The updated post
 */
export async function updatePost(
  postId: string,
  content?: string,
  postType?: PostType
): Promise<Post> {
  const body: UpdatePostRequest = {};
  if (content !== undefined) {
    body.content = content;
  }
  if (postType !== undefined) {
    body.post_type = postType;
  }

  return apiPut<UpdatePostResponse>(
    `/api/v1/posts/${postId}`,
    body
  );
}

/**
 * Delete a post
 * @param postId - The ID of the post to delete
 */
export async function deletePost(postId: string): Promise<void> {
  return apiDelete(`/api/v1/posts/${postId}`);
}

/**
 * Like a post
 * @param postId - The ID of the post to like
 * @returns Updated post with like status
 */
export async function likePost(postId: string): Promise<Post> {
  const response = await apiPost<{ post: Post; user_has_liked: boolean }>(
    `/api/v1/posts/${postId}/like`,
    {}
  );
  return response.post;
}

/**
 * Unlike a post
 * @param postId - The ID of the post to unlike
 * @returns Updated post with like status
 */
export async function unlikePost(postId: string): Promise<Post> {
  const response = await apiFetch<{ post: Post; user_has_liked: boolean }>(
    `/api/v1/posts/${postId}/like`,
    { method: 'DELETE' }
  );
  return response.post;
}
