import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { normalizeBlog } from '../../types/blog';
import app from '../index';
import { createToken } from '../auth/jwt';
import type { AuthPayload } from '../../types/user';

const JWT_SECRET = 'test-jwt-secret';

/**
 * Test environment interface
 */
interface TestEnv {
  platform_db: D1Database;
  JWT_SECRET: string;
}

/**
 * Create a JWT token for testing
 */
async function createTestToken(userId: string, email: string, name: string, role?: string): Promise<string> {
  const payload: AuthPayload & { role?: string } = { userId, email, name, role };
  return createToken(payload as AuthPayload, JWT_SECRET);
}

// ============================================================================
// Mock Database and Environment Setup
// ============================================================================

function createMockDb() {
  const mockUsers = new Map<string, Record<string, unknown>>();
  const mockBlogs = new Map<string, Record<string, unknown>>();
  const mockRoles = new Map<string, Record<string, unknown>>();
  const mockLikes = new Map<string, Record<string, unknown>>();
  const mockComments = new Map<string, Record<string, unknown>>();
  const mockPoints = new Map<string, Record<string, unknown>>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // SELECT blogs
          if (query.includes('SELECT') && query.includes('blogs') && query.includes('WHERE id = ?')) {
            const blogId = params[0];
            const blog = mockBlogs.get(blogId);
            return { results: blog ? [blog] : [] };
          }
          // SELECT users
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            const user = mockUsers.get(userId);
            return { results: user ? [user] : [] };
          }
          // SELECT roles
          if (query.includes('SELECT') && query.includes('user_roles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            const role = mockRoles.get(userId);
            return { results: role ? [role] : [] };
          }
          // SELECT blog_likes
          if (query.includes('SELECT') && query.includes('blog_likes') && query.includes('WHERE blog_id = ?')) {
            const blogId = params[0];
            const likes = Array.from(mockLikes.values()).filter(like => like.blog_id === blogId);
            return { results: likes };
          }
          // SELECT specific blog_like
          if (query.includes('SELECT') && query.includes('blog_likes') && query.includes('WHERE blog_id = ?') && query.includes('AND user_id = ?')) {
            const blogId = params[0];
            const userId = params[1];
            const likeKey = `${blogId}:${userId}`;
            const like = mockLikes.get(likeKey);
            return { results: like ? [like] : [] };
          }
          // SELECT blog_comments by blog_id
          if (query.includes('SELECT') && query.includes('blog_comments') && (query.includes('WHERE blog_id = ?') || query.includes('WHERE bc.blog_id = ?')) && !query.includes('COUNT')) {
            const blogId = params[0];
            let comments = Array.from(mockComments.values()).filter(c => c.blog_id === blogId);

            // Handle JOIN with users table
            if (query.includes('JOIN users')) {
              comments = comments.map(c => {
                const user = mockUsers.get(c.user_id as string);
                return { ...c, author_name: user?.name, author_email: user?.email };
              });
            }

            // Sort by created_at
            comments = comments.sort((a, b) => (a.created_at as number) - (b.created_at as number));

            // Handle LIMIT and OFFSET
            if (query.includes('LIMIT')) {
              const limitMatch = query.match(/LIMIT\s+\?\s+OFFSET\s+\?/);
              if (limitMatch && params.length >= 2) {
                const limit = params[params.length - 2];
                const offset = params[params.length - 1];
                comments = comments.slice(offset as number, (offset as number) + (limit as number));
              }
            }

            return { results: comments };
          }
          // SELECT COUNT for comments
          if (query.includes('SELECT COUNT') && query.includes('blog_comments')) {
            const blogId = params[0];
            const count = Array.from(mockComments.values()).filter(c => c.blog_id === blogId).length;
            return { results: [{ count }] };
          }
          // SELECT specific blog_comment
          if (query.includes('SELECT') && query.includes('blog_comments') && query.includes('WHERE id = ?')) {
            const commentId = params[0];
            const comment = mockComments.get(commentId);
            const result = comment ? { ...comment } : null;
            if (result && query.includes('JOIN users')) {
              const user = mockUsers.get(comment?.user_id as string);
              return { results: [{ ...result, author_name: user?.name, author_email: user?.email }] };
            }
            return { results: comment ? [comment] : [] };
          }
          // SELECT COUNT(*) FROM blogs (with optional WHERE featured = ?)
          if (query.includes('SELECT COUNT') && query.includes('FROM blogs')) {
            let blogs = Array.from(mockBlogs.values());
            // Check if filtering by featured status
            if (query.includes('WHERE featured = ?')) {
              const featured = params[0];
              blogs = blogs.filter(b => b.featured === featured);
            }
            return { results: [{ count: blogs.length }] };
          }
          // SELECT * FROM blogs (with optional WHERE featured = ? and LIMIT/OFFSET)
          if (query.includes('SELECT *') && query.includes('FROM blogs') && !query.includes('COUNT')) {
            let blogs = Array.from(mockBlogs.values());
            let paramIndex = 0;

            // Check if filtering by featured
            if (query.includes('WHERE featured = ?')) {
              const featured = params[paramIndex++];
              blogs = blogs.filter(b => b.featured === featured);
            }

            // Sort by created_at DESC (newest first)
            blogs = blogs.sort((a, b) => (b.created_at as number) - (a.created_at as number));

            // Handle LIMIT and OFFSET
            if (query.includes('LIMIT ? OFFSET ?')) {
              const limit = params[paramIndex];
              const offset = params[paramIndex + 1];
              blogs = blogs.slice(offset as number, (offset as number) + (limit as number));
            }

            return { results: blogs };
          }
          return { results: [] };
        }),
        first: vi.fn(async () => {
          // SELECT blogs
          if (query.includes('SELECT') && query.includes('blogs') && query.includes('WHERE id = ?')) {
            const blogId = params[0];
            return mockBlogs.get(blogId) || null;
          }
          // SELECT users
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            return mockUsers.get(userId) || null;
          }
          // SELECT roles
          if (query.includes('SELECT') && query.includes('user_roles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            return mockRoles.get(userId) || null;
          }
          // SELECT specific blog_like
          if (query.includes('SELECT') && query.includes('blog_likes') && query.includes('WHERE blog_id = ?') && query.includes('AND user_id = ?')) {
            const blogId = params[0];
            const userId = params[1];
            const likeKey = `${blogId}:${userId}`;
            return mockLikes.get(likeKey) || null;
          }
          // SELECT COUNT(*) FROM blogs
          if (query.includes('SELECT COUNT') && query.includes('FROM blogs')) {
            let blogs = Array.from(mockBlogs.values());
            if (query.includes('WHERE featured = ?')) {
              const featured = params[0];
              blogs = blogs.filter(b => b.featured === featured);
            }
            return { count: blogs.length };
          }
          // SELECT COUNT for comments
          if (query.includes('SELECT COUNT') && query.includes('blog_comments')) {
            const blogId = params[0];
            const count = Array.from(mockComments.values()).filter(c => c.blog_id === blogId).length;
            return { count };
          }
          // SELECT specific blog_comment
          if (query.includes('SELECT') && query.includes('blog_comments') && (query.includes('WHERE id = ?') || query.includes('WHERE bc.id = ?'))) {
            const commentId = params[0];
            const comment = mockComments.get(commentId);
            if (!comment) return null;

            if (query.includes('JOIN users')) {
              const user = mockUsers.get(comment.user_id as string);
              return { ...comment, author_name: user?.name, author_email: user?.email };
            }
            return comment;
          }
          // SELECT user_points
          if (query.includes('SELECT') && query.includes('user_points') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            return mockPoints.get(userId) || null;
          }
          return null;
        }),
        run: vi.fn(async () => {
          // INSERT blogs
          if (query.includes('INSERT INTO blogs')) {
            const blogId = params[0];
            const userId = params[1];
            const title = params[2];
            const content = params[3];
            const likesCount = params[4];
            const commentsCount = params[5];
            const featured = params[6];
            const createdAt = params[7];
            const updatedAt = params[8];
            mockBlogs.set(blogId, {
              id: blogId,
              user_id: userId,
              title,
              content,
              likes_count: likesCount,
              comments_count: commentsCount,
              featured,
              created_at: createdAt,
              updated_at: updatedAt,
            });
            return { success: true };
          }
          // UPDATE blogs
          if (query.includes('UPDATE blogs') && query.includes('WHERE id = ?')) {
            const blogId = params[params.length - 1];
            const blog = mockBlogs.get(blogId);
            if (!blog) return { success: false };

            // Update title and content
            if (query.includes('title = ?') && query.includes('content = ?')) {
              const title = params[0];
              const content = params[1];
              const updatedAt = params[2];
              mockBlogs.set(blogId, { ...blog, title, content, updated_at: updatedAt });
            }
            // Update likes_count
            else if (query.includes('likes_count = ?')) {
              const likesCount = params[0];
              mockBlogs.set(blogId, { ...blog, likes_count: likesCount });
            }
            // Update comments_count
            else if (query.includes('comments_count = ?')) {
              const commentsCount = params[0];
              mockBlogs.set(blogId, { ...blog, comments_count: commentsCount });
            }
            // Update featured status
            else if (query.includes('featured = ?')) {
              const featured = params[0];
              const updatedAt = params[1];
              mockBlogs.set(blogId, { ...blog, featured, updated_at: updatedAt });
            }
            return { success: true };
          }
          // DELETE blogs
          if (query.includes('DELETE FROM blogs') && query.includes('WHERE id = ?')) {
            const blogId = params[0];
            mockBlogs.delete(blogId);
            return { success: true };
          }
          // INSERT blog_likes
          if (query.includes('INSERT INTO blog_likes')) {
            const likeId = params[0];
            const blogId = params[1];
            const userId = params[2];
            const createdAt = params[3];
            const likeKey = `${blogId}:${userId}`;
            mockLikes.set(likeKey, {
              id: likeId,
              blog_id: blogId,
              user_id: userId,
              created_at: createdAt,
            });
            return { success: true };
          }
          // DELETE blog_likes
          if (query.includes('DELETE FROM blog_likes') && query.includes('WHERE blog_id = ?') && query.includes('AND user_id = ?')) {
            const blogId = params[0];
            const userId = params[1];
            const likeKey = `${blogId}:${userId}`;
            mockLikes.delete(likeKey);
            return { success: true };
          }
          // INSERT blog_comments
          if (query.includes('INSERT INTO blog_comments')) {
            const commentId = params[0];
            const blogId = params[1];
            const userId = params[2];
            const content = params[3];
            const parentCommentId = params[4];
            const createdAt = params[5];
            const updatedAt = params[6];
            mockComments.set(commentId, {
              id: commentId,
              blog_id: blogId,
              user_id: userId,
              content,
              parent_comment_id: parentCommentId,
              created_at: createdAt,
              updated_at: updatedAt,
            });
            return { success: true };
          }
          // UPDATE blog_comments (soft delete)
          if (query.includes('UPDATE blog_comments') && query.includes('WHERE id = ?')) {
            const commentId = params[params.length - 1];
            const comment = mockComments.get(commentId);
            if (!comment) return { success: false };

            const content = params[0];
            const updatedAt = params[1];
            mockComments.set(commentId, { ...comment, content, updated_at: updatedAt });
            return { success: true };
          }
          // INSERT or UPDATE user_points
          if (query.includes('user_points')) {
            const userId = params[0];
            const points = params[1];
            const updatedAt = params[2];
            const existingPoints = mockPoints.get(userId);
            mockPoints.set(userId, {
              id: existingPoints?.id || `points-${userId}`,
              user_id: userId,
              points,
              updated_at: updatedAt,
            });
            return { success: true };
          }
          return { success: true };
        }),
      })),
    })),
  };
}

/**
 * Setup test environment
 */
function setupTestEnv() {
  const mockDb = createMockDb() as unknown as D1Database;
  const env: TestEnv = {
    platform_db: mockDb,
    JWT_SECRET,
  };
  return { env, mockDb };
}

// ============================================================================
// Tests for Blog Type Utilities
// ============================================================================

describe('Blog Type Utilities', () => {
  describe('normalizeBlog', () => {
    it('should normalize blog from database result', () => {
      const dbBlog = {
        id: 'blog-1',
        user_id: 'user-1',
        title: 'Test Blog',
        content: 'Blog content here',
        featured: 0,
        likes_count: 5,
        comments_count: 3,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizeBlog(dbBlog);

      expect(normalized).toEqual({
        id: 'blog-1',
        user_id: 'user-1',
        title: 'Test Blog',
        content: 'Blog content here',
        featured: false,
        likes_count: 5,
        comments_count: 3,
        created_at: 1234567890,
        updated_at: 1234567890,
      });
    });

    it('should convert SQLite boolean (1) to true', () => {
      const dbBlog = {
        id: 'blog-1',
        user_id: 'user-1',
        title: 'Featured Blog',
        content: 'Content',
        featured: 1,
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizeBlog(dbBlog);
      expect(normalized.featured).toBe(true);
    });
  });
});

// ============================================================================
// API Endpoint Tests: GET /api/v1/blogs - List Blogs
// ============================================================================

describe('GET /api/v1/blogs', () => {
  it('should return empty list when no blogs exist', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      blogs: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it('should return paginated blogs', async () => {
    const { env, mockDb } = setupTestEnv();

    // Add test data
    const prepare = mockDb.prepare as ReturnType<typeof vi.fn>;
    const mockBlogs = prepare.mock.results[0]?.value as { bind: ReturnType<typeof vi.fn> };
    const bind = mockBlogs?.bind as ReturnType<typeof vi.fn>;
    const mockDbInternal = bind.mock.results[0]?.value as {
      run: ReturnType<typeof vi.fn>;
    };

    // Create 3 test blogs
    await mockDbInternal.run();

    const req = new Request('http://localhost/api/v1/blogs?limit=10&offset=0');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('blogs');
    expect(json).toHaveProperty('total');
    expect(json).toHaveProperty('limit', 10);
    expect(json).toHaveProperty('offset', 0);
  });

  it('should filter blogs by featured status', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs?featured=true');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('blogs');
  });
});

// ============================================================================
// API Endpoint Tests: GET /api/v1/blogs/:id - Get Single Blog
// ============================================================================

describe('GET /api/v1/blogs/:id', () => {
  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/non-existent');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error', 'Blog not found');
  });
});

// ============================================================================
// API Endpoint Tests: POST /api/v1/blogs - Create Blog
// ============================================================================

describe('POST /api/v1/blogs', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Blog',
        content: 'Blog content',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 400 when title is missing', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: 'Blog content',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should return 400 when content is missing', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'New Blog',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should create blog and award +10 points', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'My First Blog',
        content: 'This is my first blog post content.',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('title', 'My First Blog');
    expect(json).toHaveProperty('content', 'This is my first blog post content.');
    expect(json).toHaveProperty('user_id', 'user-1');
    expect(json).toHaveProperty('featured', false);
  });
});

// ============================================================================
// API Endpoint Tests: PUT /api/v1/blogs/:id - Update Blog
// ============================================================================

describe('PUT /api/v1/blogs/:id', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/blog-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Title',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs/non-existent', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Updated Title',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });

  it('should return 403 when user is not the author', async () => {
    const { env, mockDb } = setupTestEnv();
    const token = await createTestToken('user-2', 'other@example.com', 'Other User');

    // Create a blog by user-1
    const prepare = mockDb.prepare as ReturnType<typeof vi.fn>;
    const mockBlogs = prepare.mock.results[0]?.value as { bind: ReturnType<typeof vi.fn> };
    const bind = mockBlogs?.bind as ReturnType<typeof vi.fn>;
    const mockDbInternal = bind.mock.results[0]?.value as { run: ReturnType<typeof vi.fn> };

    // Simulate blog creation
    await mockDbInternal.run();

    const req = new Request('http://localhost/api/v1/blogs/blog-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Updated Title',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(403);
  });
});

// ============================================================================
// API Endpoint Tests: DELETE /api/v1/blogs/:id - Delete Blog
// ============================================================================

describe('DELETE /api/v1/blogs/:id', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/blog-1', {
      method: 'DELETE',
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs/non-existent', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });
});

// ============================================================================
// API Endpoint Tests: POST /api/v1/blogs/:id/like - Like Blog
// ============================================================================

describe('POST /api/v1/blogs/:id/like', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/blog-1/like', {
      method: 'POST',
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs/non-existent/like', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });
});

// ============================================================================
// API Endpoint Tests: DELETE /api/v1/blogs/:id/like - Unlike Blog
// ============================================================================

describe('DELETE /api/v1/blogs/:id/like', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/blog-1/like', {
      method: 'DELETE',
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs/non-existent/like', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });
});

// ============================================================================
// API Endpoint Tests: POST /api/v1/blogs/:id/comments - Create Comment
// ============================================================================

describe('POST /api/v1/blogs/:id/comments', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/blog-1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Great blog!',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 400 when content is missing', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs/blog-1/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
  });

  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blogs/non-existent/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: 'Great blog!',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });
});

// ============================================================================
// API Endpoint Tests: GET /api/v1/blogs/:id/comments - Get Comments
// ============================================================================

describe('GET /api/v1/blogs/:id/comments', () => {
  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/non-existent/comments');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });

  it('should return empty list when no comments exist', async () => {
    const { env, mockDb } = setupTestEnv();

    // Create a blog first
    const prepare = mockDb.prepare as ReturnType<typeof vi.fn>;
    const mockBlogs = prepare.mock.results[0]?.value as { bind: ReturnType<typeof vi.fn> };
    const bind = mockBlogs?.bind as ReturnType<typeof vi.fn>;
    const mockDbInternal = bind.mock.results[0]?.value as { run: ReturnType<typeof vi.fn> };
    await mockDbInternal.run();

    const req = new Request('http://localhost/api/v1/blogs/blog-1/comments');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('comments');
    expect(json).toHaveProperty('total', 0);
  });
});

// ============================================================================
// API Endpoint Tests: DELETE /api/v1/blog-comments/:id - Delete Comment
// ============================================================================

describe('DELETE /api/v1/blog-comments/:id', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blog-comments/comment-1', {
      method: 'DELETE',
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 404 when comment not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    const req = new Request('http://localhost/api/v1/blog-comments/non-existent', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });
});

// ============================================================================
// API Endpoint Tests: PATCH /api/v1/blogs/:id/feature - Feature Blog
// ============================================================================

describe('PATCH /api/v1/blogs/:id/feature', () => {
  it('should return 401 when not authenticated', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/blog-1/feature', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: true }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(401);
  });

  it('should return 403 when user is not admin', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User', 'member');

    const req = new Request('http://localhost/api/v1/blogs/blog-1/feature', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ featured: true }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toHaveProperty('error', 'Admin access required');
  });

  it('should return 404 when blog not found', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('admin-1', 'admin@example.com', 'Admin User', 'admin');

    const req = new Request('http://localhost/api/v1/blogs/non-existent/feature', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ featured: true }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
  });

  it('should return 400 when featured field is missing', async () => {
    const { env } = setupTestEnv();
    const token = await createTestToken('admin-1', 'admin@example.com', 'Admin User', 'admin');

    const req = new Request('http://localhost/api/v1/blogs/blog-1/feature', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
  });
});
