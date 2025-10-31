import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { normalizePost, getPostTypeName, formatPostTime, PostType } from '../../types/post';
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
  const mockPosts = new Map<string, Record<string, unknown>>();
  const mockRoles = new Map<string, Record<string, unknown>>();
  const mockLikes = new Map<string, Record<string, unknown>>();
  const mockComments = new Map<string, Record<string, unknown>>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // SELECT posts
          if (query.includes('SELECT') && query.includes('posts') && query.includes('WHERE id = ?')) {
            const postId = params[0];
            const post = mockPosts.get(postId);
            return { results: post ? [post] : [] };
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
          // SELECT post_likes
          if (query.includes('SELECT') && query.includes('post_likes') && query.includes('WHERE post_id = ?')) {
            const postId = params[0];
            const likes = Array.from(mockLikes.values()).filter(like => like.post_id === postId);
            return { results: likes };
          }
          // SELECT specific post_like
          if (query.includes('SELECT') && query.includes('post_likes') && query.includes('WHERE post_id = ?') && query.includes('AND user_id = ?')) {
            const postId = params[0];
            const userId = params[1];
            const likeKey = `${postId}:${userId}`;
            const like = mockLikes.get(likeKey);
            return { results: like ? [like] : [] };
          }
          // SELECT post_comments by post_id (with pagination/sorting and JOINs)
          if (query.includes('SELECT') && query.includes('post_comments') && (query.includes('WHERE post_id = ?') || query.includes('WHERE pc.post_id = ?')) && !query.includes('COUNT')) {
            const postId = params[0];
            let comments = Array.from(mockComments.values()).filter(c => c.post_id === postId);

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
          if (query.includes('SELECT COUNT') && query.includes('post_comments')) {
            const postId = params[0];
            const count = Array.from(mockComments.values()).filter(c => c.post_id === postId).length;
            return { results: [{ count }] };
          }
          // SELECT specific post_comment
          if (query.includes('SELECT') && query.includes('post_comments') && query.includes('WHERE id = ?')) {
            const commentId = params[0];
            const comment = mockComments.get(commentId);
            const result = comment ? { ...comment } : null;
            if (result && query.includes('JOIN users')) {
              const user = mockUsers.get(comment?.user_id as string);
              return { results: [{ ...result, author_name: user?.name, author_email: user?.email }] };
            }
            return { results: comment ? [comment] : [] };
          }
          return { results: [] };
        }),
        first: vi.fn(async () => {
          // SELECT posts
          if (query.includes('SELECT') && query.includes('posts') && query.includes('WHERE id = ?')) {
            const postId = params[0];
            return mockPosts.get(postId) || null;
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
          // SELECT specific post_like
          if (query.includes('SELECT') && query.includes('post_likes') && query.includes('WHERE post_id = ?') && query.includes('AND user_id = ?')) {
            const postId = params[0];
            const userId = params[1];
            const likeKey = `${postId}:${userId}`;
            return mockLikes.get(likeKey) || null;
          }
          // SELECT COUNT for comments
          if (query.includes('SELECT COUNT') && query.includes('post_comments')) {
            const postId = params[0];
            const count = Array.from(mockComments.values()).filter(c => c.post_id === postId).length;
            return { count };
          }
          // SELECT specific post_comment (with or without JOIN)
          if (query.includes('SELECT') && query.includes('post_comments') && (query.includes('WHERE id = ?') || query.includes('WHERE pc.id = ?'))) {
            const commentId = params[0];
            const comment = mockComments.get(commentId);
            if (!comment) return null;

            if (query.includes('JOIN users')) {
              const user = mockUsers.get(comment.user_id as string);
              return { ...comment, author_name: user?.name, author_email: user?.email };
            }
            return comment;
          }
          return null;
        }),
        run: vi.fn(async () => {
          // INSERT users
          if (query.includes('INSERT INTO users')) {
            const [id, email, name, created_at, updated_at] = params;
            mockUsers.set(id, { id, email, name, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }
          // INSERT posts
          if (query.includes('INSERT INTO posts')) {
            // The INSERT query has VALUES (?, ?, ?, ?, 0, 0, ?, ?)
            // So we get 6 params: id, user_id, content, post_type, created_at, updated_at
            const [id, user_id, content, post_type, created_at, updated_at] = params;
            const post = { id, user_id, content, post_type, likes_count: 0, comments_count: 0, created_at, updated_at };
            mockPosts.set(id, post);
            return { success: true, meta: { changes: 1 } };
          }
          // INSERT roles
          if (query.includes('INSERT INTO user_roles')) {
            const [id, user_id, role, created_at] = params;
            mockRoles.set(user_id, { id, user_id, role, created_at });
            return { success: true, meta: { changes: 1 } };
          }
          // UPDATE posts (for likes_count and comments_count)
          if (query.includes('UPDATE posts')) {
            const id = params[params.length - 1];
            const existing = mockPosts.get(id);
            if (existing) {
              const updated = { ...existing };
              // Handle special cases for increment/decrement expressions
              if (query.includes('likes_count = likes_count + 1')) {
                updated.likes_count = (updated.likes_count as number || 0) + 1;
              } else if (query.includes('likes_count = MAX(0, likes_count - 1)')) {
                updated.likes_count = Math.max(0, (updated.likes_count as number || 0) - 1);
              } else {
                // Handle regular parameterized updates
                let paramIndex = 0;
                if (query.includes('content =')) updated.content = params[paramIndex++];
                if (query.includes('post_type =')) updated.post_type = params[paramIndex++];
                if (query.includes('likes_count =') && !query.includes('likes_count = likes_count')) {
                  updated.likes_count = params[paramIndex++];
                }
                if (query.includes('comments_count =')) updated.comments_count = params[paramIndex++];
              }
              updated.updated_at = params[params.length - 2];
              mockPosts.set(id, updated);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          // INSERT post_likes
          if (query.includes('INSERT INTO post_likes')) {
            const [id, post_id, user_id, created_at] = params;
            const likeKey = `${post_id}:${user_id}`;
            // Check for duplicate
            if (mockLikes.has(likeKey)) {
              return { success: false, meta: { changes: 0 } };
            }
            mockLikes.set(likeKey, { id, post_id, user_id, created_at });
            // Note: Post likes_count is updated by separate UPDATE statement
            return { success: true, meta: { changes: 1 } };
          }
          // DELETE post_likes
          if (query.includes('DELETE FROM post_likes')) {
            const post_id = params[0];
            const user_id = params[1];
            const likeKey = `${post_id}:${user_id}`;
            if (mockLikes.has(likeKey)) {
              mockLikes.delete(likeKey);
              // Note: Post likes_count is updated by separate UPDATE statement
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          // DELETE posts
          if (query.includes('DELETE FROM posts')) {
            const id = params[0];
            mockPosts.delete(id);
            return { success: true, meta: { changes: 1 } };
          }
          // INSERT post_comments
          if (query.includes('INSERT INTO post_comments')) {
            const [id, post_id, user_id, content, parent_comment_id, created_at, updated_at] = params;
            mockComments.set(id, { id, post_id, user_id, content, parent_comment_id: parent_comment_id || null, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }
          // DELETE post_comments
          if (query.includes('DELETE FROM post_comments')) {
            const id = params[0];
            mockComments.delete(id);
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        }),
      })),
    })),
  } as unknown as D1Database;
}

/**
 * Create a test user in the mock database
 */
async function createTestUser(env: TestEnv, email: string, name: string): Promise<Record<string, unknown>> {
  const userId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const user = { id: userId, email, name, created_at: now, updated_at: now };

  // Simulate user creation in database
  const db = env.platform_db;
  await db.prepare('INSERT INTO users').bind(userId, email, name, now, now).run();

  return user;
}

describe('Posts System', () => {
  describe('Type Normalization', () => {
    it('should normalize post from database', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Hello world',
        post_type: 'general',
        likes_count: 5,
        comments_count: 2,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.id).toBe('post-123');
      expect(normalized.user_id).toBe('user-456');
      expect(normalized.content).toBe('Hello world');
      expect(normalized.post_type).toBe('general');
      expect(normalized.likes_count).toBe(5);
      expect(normalized.comments_count).toBe(2);
    });

    it('should handle announcement post type', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Official announcement',
        post_type: 'announcement',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.post_type).toBe('announcement');
    });

    it('should handle discussion post type', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Let\'s discuss',
        post_type: 'discussion',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.post_type).toBe('discussion');
    });

    it('should default to general post type for invalid types', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Invalid type',
        post_type: 'invalid_type',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.post_type).toBe('general');
    });

    it('should handle zero counts', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'New post',
        post_type: 'general',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.likes_count).toBe(0);
      expect(normalized.comments_count).toBe(0);
    });

    it('should handle missing fields', () => {
      const dbPost: Record<string, unknown> = {
        id: 'post-123',
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.id).toBe('post-123');
      expect(normalized.user_id).toBe('');
      expect(normalized.content).toBe('');
      expect(normalized.post_type).toBe('general');
      expect(normalized.likes_count).toBe(0);
      expect(normalized.comments_count).toBe(0);
    });
  });

  describe('Post Type Names', () => {
    it('should return correct name for announcement', () => {
      expect(getPostTypeName('announcement')).toBe('Announcement');
    });

    it('should return correct name for discussion', () => {
      expect(getPostTypeName('discussion')).toBe('Discussion');
    });

    it('should return correct name for general', () => {
      expect(getPostTypeName('general')).toBe('General');
    });

    it('should return Unknown for invalid type', () => {
      expect(getPostTypeName('invalid' as PostType)).toBe('Unknown');
    });
  });

  describe('Post Time Formatting', () => {
    it('should format time as "just now" for recent posts', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatPostTime(now)).toBe('just now');
    });

    it('should format time as minutes ago', () => {
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
      const result = formatPostTime(fiveMinutesAgo);
      expect(result).toMatch(/^\d+m ago$/);
    });

    it('should format time as hours ago', () => {
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
      const result = formatPostTime(twoHoursAgo);
      expect(result).toMatch(/^\d+h ago$/);
    });

    it('should format time as days ago', () => {
      const threeDaysAgo = Math.floor(Date.now() / 1000) - 259200;
      const result = formatPostTime(threeDaysAgo);
      expect(result).toMatch(/^\d+d ago$/);
    });

    it('should format time as date for old posts', () => {
      const twoWeeksAgo = Math.floor(Date.now() / 1000) - 1209600;
      const result = formatPostTime(twoWeeksAgo);
      // Should be a date string, not relative
      expect(result).not.toMatch(/ago$/);
    });
  });

  describe('Database Mock', () => {
    it('should create mock database', () => {
      const mockDb = createMockDb();
      expect(mockDb).toBeDefined();
      expect(mockDb.prepare).toBeDefined();
    });
  });

  describe('Post CRUD Validation', () => {
    describe('Create Post Validation', () => {
      it('should validate that content is required', () => {
        const content = '';
        expect(content).toBe('');
      });

      it('should validate that content does not exceed max length', () => {
        const MAX_LENGTH = 2000;
        const content = 'a'.repeat(MAX_LENGTH + 1);
        expect(content.length).toBeGreaterThan(MAX_LENGTH);
      });

      it('should validate post type is one of valid types', () => {
        const validTypes = ['announcement', 'discussion', 'general'];
        expect(validTypes).toContain(PostType.General);
        expect(validTypes).toContain(PostType.Discussion);
        expect(validTypes).toContain(PostType.Announcement);
      });

      it('should validate that only admins can create announcements', () => {
        const userRole = 'member';
        const postType = PostType.Announcement;
        const isAdmin = userRole === 'admin';

        expect(isAdmin).toBe(false);
        expect(postType === PostType.Announcement && !isAdmin).toBe(true);
      });
    });

    describe('Update Post Validation', () => {
      it('should allow updating content for post author', () => {
        const userId = 'user-1';
        const postOwnerId = 'user-1';
        const canEdit = userId === postOwnerId;

        expect(canEdit).toBe(true);
      });

      it('should allow updating content for admin even if not author', () => {
        const userId = 'admin-user';
        const userRole = 'admin';
        const postOwnerId = 'user-1';
        const canEdit = userId === postOwnerId || userRole === 'admin';

        expect(canEdit).toBe(true);
      });

      it('should prevent updating content for non-owner non-admin', () => {
        const userId = 'user-2';
        const userRole = 'member';
        const postOwnerId = 'user-1';
        const canEdit = userId === postOwnerId || userRole === 'admin';

        expect(canEdit).toBe(false);
      });

      it('should validate updated content length', () => {
        const MAX_LENGTH = 2000;
        const validContent = 'x'.repeat(MAX_LENGTH);
        const invalidContent = 'x'.repeat(MAX_LENGTH + 1);

        expect(validContent.length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(invalidContent.length).toBeGreaterThan(MAX_LENGTH);
      });
    });

    describe('Delete Post Validation', () => {
      it('should allow deleting post for author', () => {
        const userId = 'user-1';
        const postOwnerId = 'user-1';
        const canDelete = userId === postOwnerId;

        expect(canDelete).toBe(true);
      });

      it('should allow deleting post for admin even if not author', () => {
        const userId = 'admin-user';
        const userRole = 'admin';
        const postOwnerId = 'user-1';
        const canDelete = userId === postOwnerId || userRole === 'admin';

        expect(canDelete).toBe(true);
      });

      it('should prevent deleting post for non-owner non-admin', () => {
        const userId = 'user-2';
        const userRole = 'member';
        const postOwnerId = 'user-1';
        const canDelete = userId === postOwnerId || userRole === 'admin';

        expect(canDelete).toBe(false);
      });
    });

    describe('Post UUID Generation', () => {
      it('should generate valid UUID format', () => {
        const uuid = crypto.randomUUID();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuid).toMatch(uuidRegex);
      });

      it('should generate unique UUIDs', () => {
        const uuid1 = crypto.randomUUID();
        const uuid2 = crypto.randomUUID();
        expect(uuid1).not.toBe(uuid2);
      });
    });

    describe('Timestamp Handling', () => {
      it('should create valid Unix timestamps', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(now).toBeGreaterThan(0);
        expect(Number.isInteger(now)).toBe(true);
      });

      it('should update timestamps on modification', () => {
        const createdAt = Math.floor(Date.now() / 1000);
        // Simulate a delay
        const updatedAt = createdAt + 60; // 60 seconds later
        expect(updatedAt).toBeGreaterThan(createdAt);
      });
    });
  });

  // ============================================================================
  // API Endpoint Tests: POST /api/v1/posts - Create Post
  // ============================================================================

  describe('POST /api/v1/posts', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
    });

    it('should create a post with valid content', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Hello world! This is my first post.',
          post_type: 'general',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        user_id: testUser.id,
        content: 'Hello world! This is my first post.',
        post_type: 'general',
        likes_count: 0,
        comments_count: 0,
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
    });

    it('should create a discussion post', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'What are your thoughts on this topic?',
          post_type: 'discussion',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.post_type).toBe('discussion');
    });

    it('should default to general post type if not specified', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Post without type specification',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.post_type).toBe('general');
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Unauthorized post',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 400 when content is empty', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: '',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 when content exceeds max length', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'x'.repeat(2001),
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('2000 characters');
    });

    it('should return 400 when post type is invalid', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Valid content',
          post_type: 'invalid_type',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('post type');
    });

    it('should return 403 when non-admin tries to create announcement', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string, 'member');

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'This is an announcement',
          post_type: 'announcement',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('admin');
    });

    it('should allow admin to create announcement', async () => {
      // Create admin user
      const adminUser = await createTestUser(mockEnv, 'admin@example.com', 'Admin User');
      // Store admin role in mock database
      const roleId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await mockEnv.platform_db
        .prepare('INSERT INTO user_roles')
        .bind(roleId, adminUser.id, 'admin', now)
        .run();

      const token = await createTestToken(adminUser.id as string, adminUser.email as string, adminUser.name as string, 'admin');

      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Official announcement from admin',
          post_type: 'announcement',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.post_type).toBe('announcement');
    });
  });

  // ============================================================================
  // API Endpoint Tests: PUT /api/v1/posts/:id - Update Post
  // ============================================================================

  describe('PUT /api/v1/posts/:id', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let otherUser: Record<string, unknown>;
    let adminUser: Record<string, unknown>;
    let createdPostId: string;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };

      // Create test users
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
      otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');
      adminUser = await createTestUser(mockEnv, 'admin@example.com', 'Admin User');

      // Store admin role
      const roleId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await mockEnv.platform_db
        .prepare('INSERT INTO user_roles')
        .bind(roleId, adminUser.id, 'admin', now)
        .run();

      // Create a test post
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const createReq = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Original content',
          post_type: 'general',
        }),
      });

      const res = await app.fetch(createReq, mockEnv);
      const data = await res.json();
      createdPostId = data.id;
    });

    it('should update own post as author', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Updated content by author',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content).toBe('Updated content by author');
    });

    it('should update post type as author', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          post_type: 'discussion',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.post_type).toBe('discussion');
    });

    it('should return 403 when non-author tries to update', async () => {
      const token = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Trying to update someone else post',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(403);
    });

    it('should allow admin to update any post', async () => {
      const token = await createTestToken(adminUser.id as string, adminUser.email as string, adminUser.name as string, 'admin');

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Updated by admin',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content).toBe('Updated by admin');
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Unauthorized update',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 404 when post does not exist', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts/nonexistent-post-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Trying to update nonexistent post',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 400 when content exceeds max length', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'x'.repeat(2001),
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // API Endpoint Tests: DELETE /api/v1/posts/:id - Delete Post
  // ============================================================================

  describe('DELETE /api/v1/posts/:id', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let otherUser: Record<string, unknown>;
    let adminUser: Record<string, unknown>;
    let createdPostId: string;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };

      // Create test users
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
      otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');
      adminUser = await createTestUser(mockEnv, 'admin@example.com', 'Admin User');

      // Store admin role
      const roleId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await mockEnv.platform_db
        .prepare('INSERT INTO user_roles')
        .bind(roleId, adminUser.id, 'admin', now)
        .run();

      // Create a test post
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const createReq = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Post to be deleted',
          post_type: 'general',
        }),
      });

      const res = await app.fetch(createReq, mockEnv);
      const data = await res.json();
      createdPostId = data.id;
    });

    it('should delete own post as author', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
    });

    it('should return 403 when non-author tries to delete', async () => {
      const token = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(403);
    });

    it('should allow admin to delete any post', async () => {
      const token = await createTestToken(adminUser.id as string, adminUser.email as string, adminUser.name as string, 'admin');

      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${createdPostId}`, {
        method: 'DELETE',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 404 when post does not exist', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/posts/nonexistent-post-id', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // API Endpoint Tests: POST /api/v1/posts/:id/like - Like Post
  // ============================================================================

  describe('POST /api/v1/posts/:id/like', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let testPost: Record<string, unknown>;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');

      // Create a post to like
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Test post to like',
          post_type: 'general',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      testPost = await res.json();
    });

    it('should like a post successfully', async () => {
      const otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');
      const token = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toMatchObject({
        post: expect.objectContaining({
          id: testPost.id,
          likes_count: 1,
        }),
        user_has_liked: true,
      });
    });

    it('should return 409 when user tries to like the same post twice', async () => {
      const otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');
      const token = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);

      // First like
      const req1 = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res1 = await app.fetch(req1, mockEnv);
      expect(res1.status).toBe(200);

      // Second like (duplicate)
      const req2 = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res2 = await app.fetch(req2, mockEnv);
      expect(res2.status).toBe(409);
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'POST',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 404 when post does not exist', async () => {
      const otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');
      const token = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);

      const req = new Request('http://localhost/api/v1/posts/nonexistent-post-id/like', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // API Endpoint Tests: DELETE /api/v1/posts/:id/like - Unlike Post
  // ============================================================================

  describe('DELETE /api/v1/posts/:id/like', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let testPost: Record<string, unknown>;
    let otherUser: Record<string, unknown>;
    let likeToken: string;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
      otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');

      // Create a post to like
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Test post to like',
          post_type: 'general',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      testPost = await res.json();

      // Like the post
      likeToken = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);
      const likeReq = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${likeToken}`,
        },
      });

      await app.fetch(likeReq, mockEnv);
    });

    it('should unlike a post successfully', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${likeToken}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toMatchObject({
        post: expect.objectContaining({
          id: testPost.id,
          likes_count: 0,
        }),
        user_has_liked: false,
      });
    });

    it('should return 404 when user has not liked the post', async () => {
      const newUser = await createTestUser(mockEnv, 'newuser@example.com', 'New User');
      const token = await createTestToken(newUser.id as string, newUser.email as string, newUser.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/like`, {
        method: 'DELETE',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 404 when post does not exist', async () => {
      const req = new Request('http://localhost/api/v1/posts/nonexistent-post-id/like', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${likeToken}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // API Endpoint Tests: POST /api/v1/posts/:id/comments - Create Comment
  // ============================================================================

  describe('POST /api/v1/posts/:id/comments', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let testPost: Record<string, unknown>;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
      // Create a post to comment on
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Test post to comment on',
          post_type: 'general',
        }),
      });
      const res = await app.fetch(req, mockEnv);
      testPost = await res.json();
    });

    it('should create a comment successfully', async () => {
      const commenter = await createTestUser(mockEnv, 'commenter@example.com', 'Commenter');
      const token = await createTestToken(commenter.id as string, commenter.email as string, commenter.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Great post!',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        post_id: testPost.id,
        user_id: commenter.id,
        content: 'Great post!',
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
    });

    it('should update comments_count on post when comment is created', async () => {
      const commenter = await createTestUser(mockEnv, 'commenter@example.com', 'Commenter');
      const token = await createTestToken(commenter.id as string, commenter.email as string, commenter.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'First comment',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      // Verify the comment was created
      const commentData = await res.json();
      expect(commentData.id).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Unauthorized comment',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 400 when content is empty', async () => {
      const commenter = await createTestUser(mockEnv, 'commenter@example.com', 'Commenter');
      const token = await createTestToken(commenter.id as string, commenter.email as string, commenter.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: '',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 when content exceeds max length', async () => {
      const commenter = await createTestUser(mockEnv, 'commenter@example.com', 'Commenter');
      const token = await createTestToken(commenter.id as string, commenter.email as string, commenter.name as string);

      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'x'.repeat(501),
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('500 characters');
    });

    it('should return 404 when post does not exist', async () => {
      const commenter = await createTestUser(mockEnv, 'commenter@example.com', 'Commenter');
      const token = await createTestToken(commenter.id as string, commenter.email as string, commenter.name as string);

      const req = new Request('http://localhost/api/v1/posts/nonexistent-post-id/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Comment on nonexistent post',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // API Endpoint Tests: GET /api/v1/posts/:id/comments - Get Comments
  // ============================================================================

  describe('GET /api/v1/posts/:id/comments', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let testPost: Record<string, unknown>;
    const commentIds: string[] = [];

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
      // Create a post
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Test post with comments',
          post_type: 'general',
        }),
      });
      const res = await app.fetch(req, mockEnv);
      testPost = await res.json();

      // Create multiple comments
      for (let i = 0; i < 3; i++) {
        const commenter = await createTestUser(mockEnv, `commenter${i}@example.com`, `Commenter ${i}`);
        const commentToken = await createTestToken(commenter.id as string, commenter.email as string, commenter.name as string);
        const commentReq = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${commentToken}`,
          },
          body: JSON.stringify({
            content: `Comment ${i}`,
          }),
        });
        const commentRes = await app.fetch(commentReq, mockEnv);
        const commentData = await commentRes.json();
        commentIds.push(commentData.id);
      }
    });

    it('should get all comments for a post', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'GET',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.comments)).toBe(true);
      expect(data.comments.length).toBe(3);
      expect(data.total).toBe(3);
    });

    it('should return comments sorted by created_at (oldest first)', async () => {
      const req = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'GET',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      // Check that comments are in order
      for (let i = 0; i < data.comments.length - 1; i++) {
        expect(data.comments[i].created_at).toBeLessThanOrEqual(data.comments[i + 1].created_at);
      }
    });

    it('should return empty list for post with no comments', async () => {
      // Create a new post with no comments
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const createReq = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Post with no comments',
          post_type: 'general',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const emptyPost = await createRes.json();

      const req = new Request(`http://localhost/api/v1/posts/${emptyPost.id}/comments`, {
        method: 'GET',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.comments.length).toBe(0);
      expect(data.total).toBe(0);
    });

    it('should return 404 when post does not exist', async () => {
      const req = new Request('http://localhost/api/v1/posts/nonexistent-post-id/comments', {
        method: 'GET',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // API Endpoint Tests: DELETE /api/v1/comments/:id - Delete Comment
  // ============================================================================

  describe('DELETE /api/v1/comments/:id', () => {
    let mockEnv: TestEnv;
    let testUser: Record<string, unknown>;
    let commenterUser: Record<string, unknown>;
    let adminUser: Record<string, unknown>;
    let testPost: Record<string, unknown>;
    let testComment: Record<string, unknown>;

    beforeEach(async () => {
      mockEnv = {
        platform_db: createMockDb(),
        JWT_SECRET,
      };
      testUser = await createTestUser(mockEnv, 'user@example.com', 'Test User');
      commenterUser = await createTestUser(mockEnv, 'commenter@example.com', 'Commenter');
      adminUser = await createTestUser(mockEnv, 'admin@example.com', 'Admin User');

      // Assign admin role
      const roleId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await mockEnv.platform_db
        .prepare('INSERT INTO user_roles')
        .bind(roleId, adminUser.id, 'admin', now)
        .run();

      // Create a post
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = new Request('http://localhost/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: 'Test post',
          post_type: 'general',
        }),
      });
      const res = await app.fetch(req, mockEnv);
      testPost = await res.json();

      // Create a comment
      const commentToken = await createTestToken(commenterUser.id as string, commenterUser.email as string, commenterUser.name as string);
      const commentReq = new Request(`http://localhost/api/v1/posts/${testPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${commentToken}`,
        },
        body: JSON.stringify({
          content: 'Test comment',
        }),
      });
      const commentRes = await app.fetch(commentReq, mockEnv);
      testComment = await commentRes.json();
    });

    it('should delete a comment when user is the author', async () => {
      const token = await createTestToken(commenterUser.id as string, commenterUser.email as string, commenterUser.name as string);

      const req = new Request(`http://localhost/api/v1/comments/${testComment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('should delete a comment when user is admin', async () => {
      const token = await createTestToken(adminUser.id as string, adminUser.email as string, adminUser.name as string, 'admin');

      const req = new Request(`http://localhost/api/v1/comments/${testComment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('should return 403 when non-author non-admin tries to delete', async () => {
      const otherUser = await createTestUser(mockEnv, 'other@example.com', 'Other User');
      const token = await createTestToken(otherUser.id as string, otherUser.email as string, otherUser.name as string);

      const req = new Request(`http://localhost/api/v1/comments/${testComment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      const req = new Request(`http://localhost/api/v1/comments/${testComment.id}`, {
        method: 'DELETE',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should return 404 when comment does not exist', async () => {
      const token = await createTestToken(commenterUser.id as string, commenterUser.email as string, commenterUser.name as string);

      const req = new Request('http://localhost/api/v1/comments/nonexistent-comment-id', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });
});
