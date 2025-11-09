import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from './apiClient';
import type {
  GetBlogsResponse,
  CreateBlogRequest,
  UpdateBlogRequest,
  CreateBlogResponse,
  UpdateBlogResponse,
  GetBlogCommentsResponse,
  CreateBlogCommentRequest,
  CreateBlogCommentResponse,
  FeatureBlogRequest,
  FeatureBlogResponse
} from '../../types/api';
import type { Blog, BlogWithAuthor, BlogCommentWithAuthor } from '../../types/blog';

/**
 * Blogs Service
 * Handles all blog-related API operations
 */

/**
 * Fetch blogs with pagination and optional featured filtering
 * @param limit - Number of blogs to fetch (default: 20)
 * @param offset - Number of blogs to skip (default: 0)
 * @param featured - Optional filter for featured blogs
 * @returns Blogs response with pagination info and blogs array
 */
export async function getBlogs(
  limit: number = 20,
  offset: number = 0,
  featured?: boolean
): Promise<GetBlogsResponse> {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));
  if (featured !== undefined) {
    params.append('featured', String(featured));
  }

  const url = `/api/v1/blogs?${params.toString()}`;
  return apiGet<GetBlogsResponse>(url);
}

/**
 * Fetch a single blog by ID
 * @param blogId - The ID of the blog to fetch
 * @returns The blog object with author info
 */
export async function getBlogById(blogId: string): Promise<BlogWithAuthor> {
  return apiGet<BlogWithAuthor>(`/api/v1/blogs/${blogId}`);
}

/**
 * Fetch all blogs (convenience method - fetches with high limit)
 * @param featured - Optional filter for featured blogs
 * @returns Array of blogs
 */
export async function getAllBlogs(featured?: boolean): Promise<Blog[]> {
  const response = await getBlogs(1000, 0, featured); // Fetch up to 1000 blogs
  return response.blogs;
}

/**
 * Fetch the current user's blogs
 * @param limit - Number of blogs to fetch (default: 100)
 * @param offset - Number of blogs to skip (default: 0)
 * @param featured - Optional filter for featured blogs
 * @returns Blogs response with pagination info and blogs array
 */
export async function getMyBlogs(
  limit: number = 100,
  offset: number = 0,
  featured?: boolean
): Promise<GetBlogsResponse> {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));
  params.append('my', 'true');
  if (featured !== undefined) {
    params.append('featured', String(featured));
  }

  const url = `/api/v1/blogs?${params.toString()}`;
  return apiGet<GetBlogsResponse>(url);
}

/**
 * Create a new blog
 * @param title - The blog title (required)
 * @param content - The blog content (required)
 * @returns The created blog
 */
export async function createBlog(
  title: string,
  content: string
): Promise<Blog> {
  const body: CreateBlogRequest = {
    title,
    content,
  };

  return apiPost<CreateBlogResponse>('/api/v1/blogs', body);
}

/**
 * Update an existing blog
 * @param blogId - The ID of the blog to update
 * @param title - Optional new title
 * @param content - Optional new content
 * @returns The updated blog
 */
export async function updateBlog(
  blogId: string,
  title?: string,
  content?: string
): Promise<Blog> {
  const body: UpdateBlogRequest = {};
  if (title !== undefined) {
    body.title = title;
  }
  if (content !== undefined) {
    body.content = content;
  }

  return apiPut<UpdateBlogResponse>(
    `/api/v1/blogs/${blogId}`,
    body
  );
}

/**
 * Delete a blog
 * @param blogId - The ID of the blog to delete
 */
export async function deleteBlog(blogId: string): Promise<void> {
  return apiDelete(`/api/v1/blogs/${blogId}`);
}

/**
 * Like a blog
 * @param blogId - The ID of the blog to like
 * @returns Updated blog with like status
 */
export async function likeBlog(blogId: string): Promise<Blog> {
  const response = await apiPost<{ blog: Blog; liked_by_user: boolean; likes_count: number }>(
    `/api/v1/blogs/${blogId}/like`,
    {}
  );
  return response.blog;
}

/**
 * Unlike a blog
 * @param blogId - The ID of the blog to unlike
 * @returns Updated blog with like status
 */
export async function unlikeBlog(blogId: string): Promise<Blog> {
  const response = await apiFetch<{ blog: Blog; liked_by_user: boolean; likes_count: number }>(
    `/api/v1/blogs/${blogId}/like`,
    { method: 'DELETE' }
  );
  return response.blog;
}

// ============================================================================
// Blog Comments API
// ============================================================================

/**
 * Get all comments for a blog with pagination
 * @param blogId - The ID of the blog to get comments for
 * @param limit - Number of comments to fetch (default: 20)
 * @param offset - Number of comments to skip (default: 0)
 * @returns Comments response with pagination info and comments array
 */
export async function getBlogComments(
  blogId: string,
  limit: number = 20,
  offset: number = 0
): Promise<GetBlogCommentsResponse> {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const url = `/api/v1/blogs/${blogId}/comments?${params.toString()}`;
  return apiGet<GetBlogCommentsResponse>(url);
}

/**
 * Create a new comment on a blog
 * @param blogId - The ID of the blog to comment on
 * @param content - The comment content (required)
 * @param parentCommentId - Optional parent comment ID for replies
 * @returns The created comment with author info
 */
export async function createBlogComment(
  blogId: string,
  content: string,
  parentCommentId?: string
): Promise<BlogCommentWithAuthor> {
  const body: CreateBlogCommentRequest = {
    content,
  };
  if (parentCommentId) {
    body.parent_comment_id = parentCommentId;
  }

  return apiPost<CreateBlogCommentResponse>(`/api/v1/blogs/${blogId}/comments`, body);
}

/**
 * Delete a blog comment
 * @param commentId - The ID of the comment to delete
 * @returns Success response
 */
export async function deleteBlogComment(commentId: string): Promise<void> {
  return apiDelete(`/api/v1/blog-comments/${commentId}`);
}

// ============================================================================
// Featured Blogs API (Admin Only)
// ============================================================================

/**
 * Feature or unfeature a blog (admin only)
 * @param blogId - The ID of the blog to feature/unfeature
 * @param featured - Whether the blog should be featured
 * @returns Updated blog with points awarded info
 */
export async function featureBlog(
  blogId: string,
  featured: boolean
): Promise<FeatureBlogResponse> {
  const body: FeatureBlogRequest = {
    featured,
  };

  return apiFetch<FeatureBlogResponse>(
    `/api/v1/blogs/${blogId}/feature`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
}
