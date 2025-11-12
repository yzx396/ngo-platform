import { describe, it, expect, vi } from 'vitest';
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
  const mockPointActions = new Map<string, Record<string, unknown>>();

  const db = {
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
          // SELECT COUNT(*) FROM blogs (with optional WHERE featured = ? or WHERE user_id = ?)
          if (query.includes('SELECT COUNT') && query.includes('FROM blogs')) {
            let blogs = Array.from(mockBlogs.values());
            // Check if filtering by featured status
            if (query.includes('WHERE featured = ?')) {
              const featured = params[0];
              blogs = blogs.filter(b => b.featured === featured);
            }
            // Check if filtering by user_id
            if (query.includes('WHERE user_id = ?')) {
              const userId = params[0];
              blogs = blogs.filter(b => b.user_id === userId);
            }
            return { results: [{ count: blogs.length }] };
          }
          // SELECT * FROM blogs (with optional WHERE featured = ? or WHERE user_id = ? and LIMIT/OFFSET)
          if (query.includes('SELECT *') && query.includes('FROM blogs') && !query.includes('COUNT')) {
            let blogs = Array.from(mockBlogs.values());
            let paramIndex = 0;

            // Check if filtering by featured
            if (query.includes('WHERE featured = ?')) {
              const featured = params[paramIndex++];
              blogs = blogs.filter(b => b.featured === featured);
            }

            // Check if filtering by user_id
            if (query.includes('WHERE user_id = ?')) {
              const userId = params[paramIndex++];
              blogs = blogs.filter(b => b.user_id === userId);
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
            if (query.includes('WHERE user_id = ?')) {
              const userId = params[0];
              blogs = blogs.filter(b => b.user_id === userId);
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
          // SELECT COUNT from point_actions_log (for diminishing returns)
          if (query.includes('SELECT COUNT') && query.includes('FROM point_actions_log')) {
            const userId = params[0];
            const actionType = params[1];
            const windowStart = params[2];
            const actions = Array.from(mockPointActions.values()).filter(
              a => a.user_id === userId && 
                   a.action_type === actionType && 
                   (a.created_at as number) >= (windowStart as number)
            );
            return { count: actions.length };
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
          if (query.includes('user_points') && !query.includes('point_actions_log')) {
            // Handle UPDATE user_points SET points = ?, updated_at = ? WHERE user_id = ?
            if (query.includes('UPDATE') && query.includes('WHERE user_id = ?')) {
              const points = params[0];
              const updatedAt = params[1];
              const userId = params[2];
              const existingPoints = mockPoints.get(userId);
              mockPoints.set(userId, {
                id: existingPoints?.id || `points-${userId}`,
                user_id: userId,
                points,
                updated_at: updatedAt,
              });
              return { success: true };
            }
            // Handle INSERT INTO user_points (id, user_id, points, updated_at) VALUES (?, ?, ?, ?)
            if (query.includes('INSERT INTO user_points')) {
              const id = params[0];
              const userId = params[1];
              const points = params[2];
              const updatedAt = params[3];
              mockPoints.set(userId, {
                id,
                user_id: userId,
                points,
                updated_at: updatedAt,
              });
              return { success: true };
            }
            return { success: true };
          }
          // INSERT into point_actions_log
          if (query.includes('INSERT INTO point_actions_log')) {
            const actionId = params[0];
            const userId = params[1];
            const actionType = params[2];
            const referenceId = params[3];
            const pointsAwarded = params[4];
            const createdAt = params[5];
            
            mockPointActions.set(actionId, {
              id: actionId,
              user_id: userId,
              action_type: actionType,
              reference_id: referenceId,
              points_awarded: pointsAwarded,
              created_at: createdAt,
            });
            return { success: true };
          }
          return { success: true };
        }),
      })),
    })),
  };

  return {
    db,
    mockUsers,
    mockBlogs,
    mockRoles,
    mockLikes,
    mockComments,
    mockPoints,
    mockPointActions,
  };
}

/**
 * Setup test environment
 */
function setupTestEnv() {
  const { db, mockUsers, mockBlogs, mockRoles, mockLikes, mockComments, mockPoints, mockPointActions } = createMockDb();
  const env: TestEnv = {
    platform_db: db as unknown as D1Database,
    JWT_SECRET,
  };
  return { env, mockDb: db, mockUsers, mockBlogs, mockRoles, mockLikes, mockComments, mockPoints, mockPointActions };
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
        requires_auth: false,
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
    const { env, mockBlogs } = setupTestEnv();

    // Seed test data directly
    const now = Math.floor(Date.now() / 1000);
    mockBlogs.set('blog-1', {
      id: 'blog-1',
      user_id: 'user-1',
      title: 'Test Blog 1',
      content: 'Content 1',
      featured: 0,
      likes_count: 5,
      comments_count: 2,
      created_at: now - 100,
      updated_at: now - 100,
    });
    mockBlogs.set('blog-2', {
      id: 'blog-2',
      user_id: 'user-2',
      title: 'Test Blog 2',
      content: 'Content 2',
      featured: 0,
      likes_count: 10,
      comments_count: 5,
      created_at: now - 50,
      updated_at: now - 50,
    });
    mockBlogs.set('blog-3', {
      id: 'blog-3',
      user_id: 'user-1',
      title: 'Test Blog 3',
      content: 'Content 3',
      featured: 1,
      likes_count: 15,
      comments_count: 8,
      created_at: now,
      updated_at: now,
    });

    const req = new Request('http://localhost/api/v1/blogs?limit=10&offset=0');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('blogs');
    expect(json).toHaveProperty('total', 3);
    expect(json).toHaveProperty('limit', 10);
    expect(json).toHaveProperty('offset', 0);
    expect(json.blogs).toHaveLength(3);
    // Should be sorted by created_at DESC (newest first)
    expect(json.blogs[0].id).toBe('blog-3');
    expect(json.blogs[1].id).toBe('blog-2');
    expect(json.blogs[2].id).toBe('blog-1');
  });

  it('should filter blogs by featured status', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs?featured=true');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('blogs');
  });

  it('should filter blogs by author when author_id is provided', async () => {
    const { env, mockBlogs, mockUsers } = setupTestEnv();

    // Seed test data
    const now = Math.floor(Date.now() / 1000);

    // Create users
    mockUsers.set('user-1', {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
    mockUsers.set('user-2', {
      id: 'user-2',
      name: 'Bob',
      email: 'bob@example.com',
    });

    // Create blogs
    mockBlogs.set('blog-1', {
      id: 'blog-1',
      user_id: 'user-1',
      title: 'Alice Blog 1',
      content: 'Content 1',
      featured: 0,
      likes_count: 5,
      comments_count: 2,
      created_at: now - 100,
      updated_at: now - 100,
    });
    mockBlogs.set('blog-2', {
      id: 'blog-2',
      user_id: 'user-2',
      title: 'Bob Blog 1',
      content: 'Content 2',
      featured: 0,
      likes_count: 10,
      comments_count: 5,
      created_at: now - 50,
      updated_at: now - 50,
    });
    mockBlogs.set('blog-3', {
      id: 'blog-3',
      user_id: 'user-1',
      title: 'Alice Blog 2',
      content: 'Content 3',
      featured: 1,
      likes_count: 15,
      comments_count: 8,
      created_at: now,
      updated_at: now,
    });

    const req = new Request('http://localhost/api/v1/blogs?author_id=user-1');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('blogs');
    expect(json.blogs).toHaveLength(2);
    expect(json.total).toBe(2);
    // Both blogs should be from user-1
    expect(json.blogs[0].user_id).toBe('user-1');
    expect(json.blogs[1].user_id).toBe('user-1');
    // Should be sorted by created_at DESC (newest first)
    expect(json.blogs[0].id).toBe('blog-3');
    expect(json.blogs[1].id).toBe('blog-1');
  });

  it('should return user\'s own blogs when authenticated and my=true', async () => {
    const { env, mockBlogs, mockUsers } = setupTestEnv();

    // Seed test data
    const now = Math.floor(Date.now() / 1000);

    mockUsers.set('user-1', {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
    mockUsers.set('user-2', {
      id: 'user-2',
      name: 'Bob',
      email: 'bob@example.com',
    });

    mockBlogs.set('blog-1', {
      id: 'blog-1',
      user_id: 'user-1',
      title: 'My Blog 1',
      content: 'Content 1',
      featured: 0,
      likes_count: 5,
      comments_count: 2,
      created_at: now - 100,
      updated_at: now - 100,
    });
    mockBlogs.set('blog-2', {
      id: 'blog-2',
      user_id: 'user-2',
      title: 'Bob Blog',
      content: 'Content 2',
      featured: 0,
      likes_count: 10,
      comments_count: 5,
      created_at: now - 50,
      updated_at: now - 50,
    });
    mockBlogs.set('blog-3', {
      id: 'blog-3',
      user_id: 'user-1',
      title: 'My Blog 2',
      content: 'Content 3',
      featured: 1,
      likes_count: 15,
      comments_count: 8,
      created_at: now,
      updated_at: now,
    });

    // Create JWT token for user-1
    const token = await createTestToken('user-1', 'alice@example.com', 'Alice');

    const req = new Request('http://localhost/api/v1/blogs?my=true', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('blogs');
    expect(json.blogs).toHaveLength(2);
    expect(json.total).toBe(2);
    // Both blogs should be from user-1
    expect(json.blogs[0].user_id).toBe('user-1');
    expect(json.blogs[1].user_id).toBe('user-1');
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

  it('should create blog and award +10 points with diminishing returns', async () => {
    const { env, mockPoints, mockPointActions } = setupTestEnv();
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');

    // Create first blog - should get full 10 points
    const req1 = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'First Blog',
        content: 'First blog content.',
      }),
    });
    const res1 = await app.fetch(req1, env);
    expect(res1.status).toBe(201);

    // Verify points awarded
    const userPoints = mockPoints.get('user-1');
    expect(userPoints).toBeDefined();
    expect(userPoints?.points).toBe(10);

    // Verify action logged
    const actions = Array.from(mockPointActions.values()).filter(
      a => a.user_id === 'user-1' && a.action_type === 'blog_created'
    );
    expect(actions.length).toBe(1);
    expect(actions[0].points_awarded).toBe(10);

    // Create second blog - should also get full 10 points (within threshold)
    const req2 = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Second Blog',
        content: 'Second blog content.',
      }),
    });
    const res2 = await app.fetch(req2, env);
    expect(res2.status).toBe(201);
    expect(mockPoints.get('user-1')?.points).toBe(20);

    // Create third blog - should get reduced points (50%)
    const req3 = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Third Blog',
        content: 'Third blog content.',
      }),
    });
    const res3 = await app.fetch(req3, env);
    expect(res3.status).toBe(201);
    expect(mockPoints.get('user-1')?.points).toBe(25); // 20 + 5 (50% of 10)
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
    const { env, mockBlogs, mockUsers } = setupTestEnv();
    const token = await createTestToken('user-2', 'other@example.com', 'Other User');

    // Seed users
    mockUsers.set('user-1', {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });
    mockUsers.set('user-2', {
      id: 'user-2',
      email: 'other@example.com',
      name: 'Other User',
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    });

    // Seed a blog owned by user-1
    const now = Math.floor(Date.now() / 1000);
    mockBlogs.set('blog-1', {
      id: 'blog-1',
      user_id: 'user-1',
      title: 'Original Title',
      content: 'Original Content',
      featured: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: now,
      updated_at: now,
    });

    // Try to update as user-2
    const req = new Request('http://localhost/api/v1/blogs/blog-1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Updated Title',
        content: 'Updated Content',
      }),
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toHaveProperty('error');
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

  it('should like a blog and return liked_by_user property', async () => {
    const { env, mockBlogs, mockUsers } = setupTestEnv();
    const userId = 'user-1';
    const blogId = 'blog-1';
    const now = Math.floor(Date.now() / 1000);

    // Seed user
    mockUsers.set(userId, {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      created_at: now,
      updated_at: now,
    });

    // Seed blog
    mockBlogs.set(blogId, {
      id: blogId,
      user_id: 'user-2',
      title: 'Test Blog',
      content: 'Blog content',
      featured: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: now,
      updated_at: now,
    });

    const token = await createTestToken(userId, 'user@example.com', 'Test User');

    const req = new Request(`http://localhost/api/v1/blogs/${blogId}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    // IMPORTANT: The response should return liked_by_user property
    expect(json).toHaveProperty('liked_by_user', true);
    expect(json).toHaveProperty('likes_count', 1);
  });

  it('should not allow duplicate likes', async () => {
    const { env, mockBlogs, mockUsers, mockLikes } = setupTestEnv();
    const userId = 'user-1';
    const blogId = 'blog-1';
    const now = Math.floor(Date.now() / 1000);

    // Seed user
    mockUsers.set(userId, {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      created_at: now,
      updated_at: now,
    });

    // Seed blog
    mockBlogs.set(blogId, {
      id: blogId,
      user_id: 'user-2',
      title: 'Test Blog',
      content: 'Blog content',
      featured: 0,
      likes_count: 1,
      comments_count: 0,
      created_at: now,
      updated_at: now,
    });

    // Seed existing like
    const likeKey = `${blogId}:${userId}`;
    mockLikes.set(likeKey, {
      id: 'like-1',
      blog_id: blogId,
      user_id: userId,
      created_at: now,
    });

    const token = await createTestToken(userId, 'user@example.com', 'Test User');

    const req = new Request(`http://localhost/api/v1/blogs/${blogId}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  it('should award +2 points to blog author when someone likes their blog', async () => {
    const { env, mockPoints } = setupTestEnv();
    
    // Create author and their blog
    const authorToken = await createTestToken('author-1', 'author@example.com', 'Blog Author');
    const createReq = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        title: 'Blog to Like',
        content: 'Content here.',
      }),
    });
    const createRes = await app.fetch(createReq, env);
    const blog = await createRes.json();
    
    // Reset points to 0 for clarity
    mockPoints.set('author-1', { id: 'points-author-1', user_id: 'author-1', points: 0, updated_at: Date.now() });

    // Different user likes the blog
    const likerToken = await createTestToken('liker-1', 'liker@example.com', 'Liker');
    const likeReq = new Request(`http://localhost/api/v1/blogs/${blog.id}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${likerToken}`,
      },
    });
    const likeRes = await app.fetch(likeReq, env);
    expect(likeRes.status).toBe(200);

    // Verify author received +2 points
    const authorPoints = mockPoints.get('author-1');
    expect(authorPoints?.points).toBe(2);
  });

  it('should NOT award points when user likes their own blog', async () => {
    const { env, mockPoints } = setupTestEnv();
    
    const token = await createTestToken('user-1', 'user@example.com', 'Test User');
    
    // Create blog
    const createReq = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'My Blog',
        content: 'Content.',
      }),
    });
    const createRes = await app.fetch(createReq, env);
    const blog = await createRes.json();
    
    const pointsAfterCreate = mockPoints.get('user-1')?.points || 0;

    // User likes their own blog
    const likeReq = new Request(`http://localhost/api/v1/blogs/${blog.id}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const likeRes = await app.fetch(likeReq, env);
    expect(likeRes.status).toBe(200);

    // Points should not increase
    const pointsAfterLike = mockPoints.get('user-1')?.points || 0;
    expect(pointsAfterLike).toBe(pointsAfterCreate);
  });

  it('should enforce diminishing returns on blog likes received', async () => {
    const { env, mockPoints } = setupTestEnv();
    
    // Create author and blog
    const authorToken = await createTestToken('author-1', 'author@example.com', 'Author');
    const createReq = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        title: 'Popular Blog',
        content: 'Great content.',
      }),
    });
    const createRes = await app.fetch(createReq, env);
    const blog = await createRes.json();
    
    mockPoints.set('author-1', { id: 'points-author-1', user_id: 'author-1', points: 0, updated_at: Date.now() });

    // First 5 likes - full points (2 each = 10 total)
    for (let i = 1; i <= 5; i++) {
      const likerToken = await createTestToken(`liker-${i}`, `liker${i}@example.com`, `Liker ${i}`);
      const likeReq = new Request(`http://localhost/api/v1/blogs/${blog.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${likerToken}` },
      });
      await app.fetch(likeReq, env);
    }
    expect(mockPoints.get('author-1')?.points).toBe(10); // 5 * 2

    // Next 10 likes - reduced points (50% = 1 each = 10 total)
    for (let i = 6; i <= 15; i++) {
      const likerToken = await createTestToken(`liker-${i}`, `liker${i}@example.com`, `Liker ${i}`);
      const likeReq = new Request(`http://localhost/api/v1/blogs/${blog.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${likerToken}` },
      });
      await app.fetch(likeReq, env);
    }
    expect(mockPoints.get('author-1')?.points).toBe(20); // 10 + (10 * 1)

    // 16th like - no points
    const liker16Token = await createTestToken('liker-16', 'liker16@example.com', 'Liker 16');
    const like16Req = new Request(`http://localhost/api/v1/blogs/${blog.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${liker16Token}` },
    });
    await app.fetch(like16Req, env);
    expect(mockPoints.get('author-1')?.points).toBe(20); // No change
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

  it('should unlike a blog and return liked_by_user property as false', async () => {
    const { env, mockBlogs, mockUsers, mockLikes } = setupTestEnv();
    const userId = 'user-1';
    const blogId = 'blog-1';
    const now = Math.floor(Date.now() / 1000);

    // Seed user
    mockUsers.set(userId, {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      created_at: now,
      updated_at: now,
    });

    // Seed blog
    mockBlogs.set(blogId, {
      id: blogId,
      user_id: 'user-2',
      title: 'Test Blog',
      content: 'Blog content',
      featured: 0,
      likes_count: 1,
      comments_count: 0,
      created_at: now,
      updated_at: now,
    });

    // Seed existing like
    const likeKey = `${blogId}:${userId}`;
    mockLikes.set(likeKey, {
      id: 'like-1',
      blog_id: blogId,
      user_id: userId,
      created_at: now,
    });

    const token = await createTestToken(userId, 'user@example.com', 'Test User');

    const req = new Request(`http://localhost/api/v1/blogs/${blogId}/like`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const json = await res.json();
    // IMPORTANT: The response should return liked_by_user property as false
    expect(json).toHaveProperty('liked_by_user', false);
    expect(json).toHaveProperty('likes_count', 0);
  });

  it('should return 400 when user has not liked the blog', async () => {
    const { env, mockBlogs, mockUsers } = setupTestEnv();
    const userId = 'user-1';
    const blogId = 'blog-1';
    const now = Math.floor(Date.now() / 1000);

    // Seed user
    mockUsers.set(userId, {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
      created_at: now,
      updated_at: now,
    });

    // Seed blog (no like exists for this user)
    mockBlogs.set(blogId, {
      id: blogId,
      user_id: 'user-2',
      title: 'Test Blog',
      content: 'Blog content',
      featured: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: now,
      updated_at: now,
    });

    const token = await createTestToken(userId, 'user@example.com', 'Test User');

    const req = new Request(`http://localhost/api/v1/blogs/${blogId}/like`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
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

  it('should return 404 when blog does not exist', async () => {
    const { env } = setupTestEnv();

    const req = new Request('http://localhost/api/v1/blogs/non-existent/comments');
    const res = await app.fetch(req, env);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toHaveProperty('error', 'Blog not found');
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
    expect(json).toHaveProperty('error', 'Forbidden - Admin role required');
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

  it('should award +50 bonus points when admin features a blog', async () => {
    const { env, mockRoles, mockPoints } = setupTestEnv();
    
    // Create author and blog
    const authorToken = await createTestToken('author-1', 'author@example.com', 'Author');
    const createReq = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        title: 'Awesome Blog',
        content: 'High quality content.',
      }),
    });
    const createRes = await app.fetch(createReq, env);
    const blog = await createRes.json();
    
    const pointsAfterCreate = mockPoints.get('author-1')?.points || 0;

    // Admin features the blog
    mockRoles.set('admin-1', { id: 'role-admin-1', user_id: 'admin-1', role: 'admin', created_at: Date.now() });
    const adminToken = await createTestToken('admin-1', 'admin@example.com', 'Admin', 'admin');
    
    const featureReq = new Request(`http://localhost/api/v1/blogs/${blog.id}/feature`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ featured: true }),
    });
    const featureRes = await app.fetch(featureReq, env);
    expect(featureRes.status).toBe(200);
    
    const json = await featureRes.json();
    expect(json.points_awarded).toBe(50);

    // Verify author received +50 bonus points
    const pointsAfterFeature = mockPoints.get('author-1')?.points || 0;
    expect(pointsAfterFeature).toBe(pointsAfterCreate + 50);
  });

  it('should NOT award bonus points when unfeaturing or re-featuring', async () => {
    const { env, mockRoles, mockBlogs, mockPoints } = setupTestEnv();
    
    // Create featured blog
    const authorToken = await createTestToken('author-1', 'author@example.com', 'Author');
    const createReq = new Request('http://localhost/api/v1/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`,
      },
      body: JSON.stringify({
        title: 'Blog',
        content: 'Content.',
      }),
    });
    const createRes = await app.fetch(createReq, env);
    const blog = await createRes.json();
    
    // Feature it first time
    mockRoles.set('admin-1', { id: 'role-admin-1', user_id: 'admin-1', role: 'admin', created_at: Date.now() });
    const adminToken = await createTestToken('admin-1', 'admin@example.com', 'Admin', 'admin');
    
    const featureReq1 = new Request(`http://localhost/api/v1/blogs/${blog.id}/feature`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ featured: true }),
    });
    await app.fetch(featureReq1, env);
    
    const pointsAfterFirstFeature = mockPoints.get('author-1')?.points || 0;

    // Set featured in mock (simulate state)
    mockBlogs.set(blog.id, { ...mockBlogs.get(blog.id), featured: 1 });

    // Try to feature again (should not award points)
    const featureReq2 = new Request(`http://localhost/api/v1/blogs/${blog.id}/feature`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ featured: true }),
    });
    const featureRes2 = await app.fetch(featureReq2, env);
    const json = await featureRes2.json();
    expect(json.points_awarded).toBe(0);
    
    const pointsAfterSecondFeature = mockPoints.get('author-1')?.points || 0;
    expect(pointsAfterSecondFeature).toBe(pointsAfterFirstFeature);
  });
});
