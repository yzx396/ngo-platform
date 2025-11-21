import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import {
  getBlogs,
  getBlogById,
  getAllBlogs,
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog,
  unlikeBlog,
  getBlogComments,
  createBlogComment,
  deleteBlogComment,
  featureBlog,
} from '../blogService';
import type { Blog, BlogWithAuthor, BlogCommentWithAuthor } from '../../../types/blog';

// Mock the apiClient module
vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiFetch: vi.fn(),
}));

describe('blogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBlog: Blog = {
    id: 'blog_123',
    title: 'Test Blog',
    content: 'Blog content here',
    user_id: 'user_123',
    created_at: Date.now(),
    updated_at: Date.now(),
    likes_count: 10,
    comments_count: 5,
    featured: false,
    requires_auth: false,
  };

  const mockBlogWithAuthor: BlogWithAuthor = {
    ...mockBlog,
    author_name: 'Test User',
    liked_by_user: false,
  };

  const mockComment: BlogCommentWithAuthor = {
    id: 'comment_123',
    blog_id: 'blog_123',
    user_id: 'user_123',
    content: 'Great blog post!',
    parent_comment_id: null,
    created_at: Date.now(),
    author_name: 'Commenter',
  };

  describe('getBlogs', () => {
    it('should fetch blogs with default pagination', async () => {
      const mockResponse = { blogs: [mockBlog], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogs();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=20&offset=0');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch blogs with custom pagination', async () => {
      const mockResponse = { blogs: [mockBlog], total: 50, limit: 10, offset: 20 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogs(10, 20);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=10&offset=20');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch only featured blogs', async () => {
      const featuredBlog = { ...mockBlog, featured: true };
      const mockResponse = { blogs: [featuredBlog], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogs(20, 0, true);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=20&offset=0&featured=true');
      expect(result.blogs[0].featured).toBe(true);
    });

    it('should fetch only non-featured blogs', async () => {
      const mockResponse = { blogs: [mockBlog], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogs(20, 0, false);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=20&offset=0&featured=false');
      expect(result.blogs[0].featured).toBe(false);
    });

    it('should handle empty blog list', async () => {
      const mockResponse = { blogs: [], total: 0, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogs();

      expect(result.blogs).toEqual([]);
    });

    it('should throw error when API fails', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getBlogs()).rejects.toThrow('Network error');
    });
  });

  describe('getBlogById', () => {
    it('should fetch a single blog by ID', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockBlogWithAuthor);

      const result = await getBlogById('blog_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs/blog_123');
      expect(result).toEqual(mockBlogWithAuthor);
    });

    it('should include author information', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockBlogWithAuthor);

      const result = await getBlogById('blog_123');

      expect(result.author_name).toBe('Test User');
      expect(result.liked_by_user).toBe(false);
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getBlogById('invalid_id')).rejects.toThrow('Blog not found');
    });
  });

  describe('getAllBlogs', () => {
    it('should fetch all blogs without filter', async () => {
      const mockResponse = { blogs: [mockBlog, { ...mockBlog, id: 'blog_456' }], total: 2, limit: 1000, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getAllBlogs();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=1000&offset=0');
      expect(result).toHaveLength(2);
    });

    it('should fetch only featured blogs', async () => {
      const featuredBlog = { ...mockBlog, featured: true };
      const mockResponse = { blogs: [featuredBlog], total: 1, limit: 1000, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getAllBlogs(true);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=1000&offset=0&featured=true');
      expect(result[0].featured).toBe(true);
    });

    it('should return empty array when no blogs exist', async () => {
      const mockResponse = { blogs: [], total: 0, limit: 1000, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getAllBlogs();

      expect(result).toEqual([]);
    });
  });

  describe('getMyBlogs', () => {
    it('should fetch current user blogs with default pagination', async () => {
      const mockResponse = { blogs: [mockBlog], total: 1, limit: 100, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getMyBlogs();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=100&offset=0&my=true');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch my blogs with custom pagination', async () => {
      const mockResponse = { blogs: [mockBlog], total: 50, limit: 25, offset: 25 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getMyBlogs(25, 25);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=25&offset=25&my=true');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch only my featured blogs', async () => {
      const featuredBlog = { ...mockBlog, featured: true };
      const mockResponse = { blogs: [featuredBlog], total: 1, limit: 100, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getMyBlogs(100, 0, true);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs?limit=100&offset=0&my=true&featured=true');
      expect(result.blogs[0].featured).toBe(true);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getMyBlogs()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createBlog', () => {
    it('should create a blog with title and content', async () => {
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockBlog);

      const result = await createBlog('New Blog', 'Blog content');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/blogs', {
        title: 'New Blog',
        content: 'Blog content',
      });
      expect(result).toEqual(mockBlog);
    });

    it('should create a blog with requiresAuth flag', async () => {
      const authBlog = { ...mockBlog, requires_auth: true };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(authBlog);

      const result = await createBlog('Auth Blog', 'Content', true);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/blogs', {
        title: 'Auth Blog',
        content: 'Content',
        requires_auth: true,
      });
      expect(result.requires_auth).toBe(true);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createBlog('Blog', 'Content')).rejects.toThrow('Unauthorized');
    });

    it('should throw error when validation fails', async () => {
      const error = new Error('Title is required');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createBlog('', '')).rejects.toThrow('Title is required');
    });
  });

  describe('updateBlog', () => {
    it('should update blog with all fields', async () => {
      const updatedBlog = { ...mockBlog, title: 'Updated', content: 'Updated content', requires_auth: true };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updatedBlog);

      const result = await updateBlog('blog_123', 'Updated', 'Updated content', true);

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/blogs/blog_123', {
        title: 'Updated',
        content: 'Updated content',
        requires_auth: true,
      });
      expect(result).toEqual(updatedBlog);
    });

    it('should update only title', async () => {
      const updatedBlog = { ...mockBlog, title: 'New Title' };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updatedBlog);

      const result = await updateBlog('blog_123', 'New Title');

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/blogs/blog_123', {
        title: 'New Title',
      });
      expect(result.title).toBe('New Title');
    });

    it('should update only content', async () => {
      const updatedBlog = { ...mockBlog, content: 'New content' };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updatedBlog);

      const result = await updateBlog('blog_123', undefined, 'New content');

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/blogs/blog_123', {
        content: 'New content',
      });
      expect(result.content).toBe('New content');
    });

    it('should update only requiresAuth', async () => {
      const updatedBlog = { ...mockBlog, requires_auth: true };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updatedBlog);

      const result = await updateBlog('blog_123', undefined, undefined, true);

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/blogs/blog_123', {
        requires_auth: true,
      });
      expect(result.requires_auth).toBe(true);
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(updateBlog('invalid_id', 'Title')).rejects.toThrow('Blog not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(updateBlog('blog_123', 'Title')).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteBlog', () => {
    it('should delete a blog successfully', async () => {
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(undefined);

      await deleteBlog('blog_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/blogs/blog_123');
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteBlog('invalid_id')).rejects.toThrow('Blog not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteBlog('blog_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('likeBlog', () => {
    it('should like a blog successfully', async () => {
      const likedBlog = { ...mockBlog, likes_count: 11 };
      const mockResponse = { blog: likedBlog, liked_by_user: true, likes_count: 11 };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await likeBlog('blog_123');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/blogs/blog_123/like', {});
      expect(result.likes_count).toBe(11);
    });

    it('should toggle like (unlike if already liked)', async () => {
      const unlikedBlog = { ...mockBlog, likes_count: 9 };
      const mockResponse = { blog: unlikedBlog, liked_by_user: false, likes_count: 9 };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await likeBlog('blog_123');

      expect(result.likes_count).toBe(9);
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(likeBlog('invalid_id')).rejects.toThrow('Blog not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(likeBlog('blog_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('unlikeBlog', () => {
    it('should unlike a blog successfully', async () => {
      const unlikedBlog = { ...mockBlog, likes_count: 9 };
      const mockResponse = { blog: unlikedBlog, liked_by_user: false, likes_count: 9 };
      vi.mocked(apiClientModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await unlikeBlog('blog_123');

      expect(apiClientModule.apiFetch).toHaveBeenCalledWith('/api/v1/blogs/blog_123/like', { method: 'DELETE' });
      expect(result.likes_count).toBe(9);
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(unlikeBlog('invalid_id')).rejects.toThrow('Blog not found');
    });

    it('should throw error when not liked before', async () => {
      const error = new Error('Not liked');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(unlikeBlog('blog_123')).rejects.toThrow('Not liked');
    });
  });

  describe('getBlogComments', () => {
    it('should fetch comments with default pagination', async () => {
      const mockResponse = { comments: [mockComment], total: 1, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogComments('blog_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs/blog_123/comments?limit=20&offset=0');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch comments with custom pagination', async () => {
      const mockResponse = { comments: [mockComment], total: 50, limit: 10, offset: 20 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogComments('blog_123', 10, 20);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/blogs/blog_123/comments?limit=10&offset=20');
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty comments list', async () => {
      const mockResponse = { comments: [], total: 0, limit: 20, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getBlogComments('blog_123');

      expect(result.comments).toEqual([]);
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getBlogComments('invalid_id')).rejects.toThrow('Blog not found');
    });
  });

  describe('createBlogComment', () => {
    it('should create a top-level comment', async () => {
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockComment);

      const result = await createBlogComment('blog_123', 'Great blog post!');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/blogs/blog_123/comments', {
        content: 'Great blog post!',
      });
      expect(result).toEqual(mockComment);
    });

    it('should create a nested comment (reply)', async () => {
      const nestedComment = { ...mockComment, parent_comment_id: 'comment_456' };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(nestedComment);

      const result = await createBlogComment('blog_123', 'Reply to comment', 'comment_456');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/blogs/blog_123/comments', {
        content: 'Reply to comment',
        parent_comment_id: 'comment_456',
      });
      expect(result.parent_comment_id).toBe('comment_456');
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createBlogComment('invalid_id', 'Comment')).rejects.toThrow('Blog not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createBlogComment('blog_123', 'Comment')).rejects.toThrow('Unauthorized');
    });

    it('should throw error when validation fails', async () => {
      const error = new Error('Content is required');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createBlogComment('blog_123', '')).rejects.toThrow('Content is required');
    });
  });

  describe('deleteBlogComment', () => {
    it('should delete a comment successfully', async () => {
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(undefined);

      await deleteBlogComment('comment_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/blog-comments/comment_123');
    });

    it('should throw error when comment not found', async () => {
      const error = new Error('Comment not found');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteBlogComment('invalid_id')).rejects.toThrow('Comment not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteBlogComment('comment_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('featureBlog', () => {
    it('should feature a blog (admin only)', async () => {
      const featuredBlog = { ...mockBlog, featured: true };
      const mockResponse = { blog: featuredBlog, points_awarded: 50 };
      vi.mocked(apiClientModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await featureBlog('blog_123', true);

      expect(apiClientModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/blogs/blog_123/feature',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ featured: true }),
        }
      );
      expect(result.blog.featured).toBe(true);
      expect(result.points_awarded).toBe(50);
    });

    it('should unfeature a blog (admin only)', async () => {
      const mockResponse = { blog: mockBlog, points_awarded: 0 };
      vi.mocked(apiClientModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await featureBlog('blog_123', false);

      expect(apiClientModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/blogs/blog_123/feature',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ featured: false }),
        }
      );
      expect(result.blog.featured).toBe(false);
    });

    it('should throw error when blog not found', async () => {
      const error = new Error('Blog not found');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(featureBlog('invalid_id', true)).rejects.toThrow('Blog not found');
    });

    it('should throw error when unauthorized (non-admin)', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(featureBlog('blog_123', true)).rejects.toThrow('Unauthorized');
    });
  });
});
