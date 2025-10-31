import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from './apiClient';
import type { GetPostsResponse, CreatePostRequest, UpdatePostRequest, CreatePostResponse, UpdatePostResponse, GetCommentsResponse, CreateCommentRequest, CreateCommentResponse } from '../../types/api';
import type { Post, PostType, PostCommentWithAuthor } from '../../types/post';

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

// ============================================================================
// Post Comments API
// ============================================================================

/**
 * Get all comments for a post with pagination
 * @param postId - The ID of the post to get comments for
 * @param limit - Number of comments to fetch (default: 20)
 * @param offset - Number of comments to skip (default: 0)
 * @returns Comments response with pagination info and comments array
 */
export async function getComments(
  postId: string,
  limit: number = 20,
  offset: number = 0
): Promise<GetCommentsResponse> {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const url = `/api/v1/posts/${postId}/comments?${params.toString()}`;
  return apiGet<GetCommentsResponse>(url);
}

/**
 * Create a new comment on a post
 * @param postId - The ID of the post to comment on
 * @param content - The comment content (required, max 500 characters)
 * @param parentCommentId - Optional parent comment ID for replies
 * @returns The created comment with author info
 */
export async function createComment(
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<PostCommentWithAuthor> {
  const body: CreateCommentRequest = {
    content,
  };
  if (parentCommentId) {
    body.parent_comment_id = parentCommentId;
  }

  return apiPost<CreateCommentResponse>(`/api/v1/posts/${postId}/comments`, body);
}

/**
 * Delete a comment
 * @param commentId - The ID of the comment to delete
 * @returns Success response
 */
export async function deleteComment(commentId: string): Promise<void> {
  return apiDelete(`/api/v1/comments/${commentId}`);
}
