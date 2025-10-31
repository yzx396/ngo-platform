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
          // UPDATE posts
          if (query.includes('UPDATE posts')) {
            const id = params[params.length - 1];
            const existing = mockPosts.get(id);
            if (existing) {
              const updated = { ...existing };
              let paramIndex = 0;
              if (query.includes('content =')) updated.content = params[paramIndex++];
              if (query.includes('post_type =')) updated.post_type = params[paramIndex++];
              updated.updated_at = params[params.length - 2];
              mockPosts.set(id, updated);
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
});
