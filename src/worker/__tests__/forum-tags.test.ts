import { describe, it, expect, vi, afterAll } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';
import { createTestToken, createTestEnvWithDb } from './utils/testAuth';

const JWT_SECRET = 'test-jwt-secret';

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function createMockDb() {
  const threads = new Map<string, Record<string, unknown>>([
    [
      'thread_123',
      {
        id: 'thread_123',
        user_id: 'user_1',
        title: 'Test Thread',
        created_at: 1700000000,
      },
    ],
  ]);

  const tags = new Map<string, Record<string, unknown>>();

  const userRoles = new Map<string, Record<string, unknown>>([
    ['admin_1', { user_id: 'admin_1', role: 'admin' }],
    ['user_1', { user_id: 'user_1', role: 'member' }],
    ['user_2', { user_id: 'user_2', role: 'member' }],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => {
          // SELECT thread id only
          if (query.includes('SELECT id FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            const thread = threads.get(threadId as string);
            return thread ? { id: thread.id } : null;
          }

          // SELECT thread with user_id
          if (query.includes('SELECT user_id FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            const thread = threads.get(threadId as string);
            return thread ? { user_id: thread.user_id } : null;
          }

          // SELECT existing tag
          if (query.includes('SELECT id FROM forum_thread_tags WHERE thread_id = ? AND tag_name = ?')) {
            const [threadId, tagName] = params;
            const key = `${threadId}_${tagName}`;
            return tags.get(key) || null;
          }

          // SELECT user role
          if (query.includes('SELECT role FROM user_roles WHERE user_id = ?')) {
            const userId = params[0];
            const roleRecord = userRoles.get(userId as string);
            return roleRecord ? { role: roleRecord.role } : null;
          }

          return null;
        }),
        all: vi.fn(async () => {
          // SELECT all tags for thread
          if (query.includes('SELECT * FROM forum_thread_tags WHERE thread_id = ? ORDER BY created_at DESC')) {
            const threadId = params[0];
            const threadTags = Array.from(tags.values()).filter(
              t => t.thread_id === threadId
            );
            return { results: threadTags, success: true };
          }

          return { results: [], success: true };
        }),
        run: vi.fn(async () => {
          // INSERT tag
          if (query.includes('INSERT INTO forum_thread_tags')) {
            const [id, threadId, tagName, createdAt] = params;
            const key = `${threadId}_${tagName}`;
            tags.set(key, {
              id,
              thread_id: threadId,
              tag_name: tagName,
              created_at: createdAt,
            });
            return { success: true, meta: { changes: 1 } };
          }

          // DELETE tag
          if (query.includes('DELETE FROM forum_thread_tags WHERE thread_id = ? AND tag_name = ?')) {
            const [threadId, tagName] = params;
            const key = `${threadId}_${tagName}`;
            const deleted = tags.delete(key);
            return { success: true, meta: { changes: deleted ? 1 : 0 } };
          }

          return { success: true, meta: { changes: 0 } };
        }),
      })),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [], success: true })),
      run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
    })),
  };
}

describe('Forum Tags API', () => {
  describe('POST /api/v1/forums/threads/:threadId/tags', () => {
    it('should add tag to thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      const data = (await res.json()) as { tag: { tag_name: string } };
      expect(data).toHaveProperty('tag');
      expect(data.tag.tag_name).toBe('career-advice');
    });

    it('should normalize tag name (lowercase, hyphens)', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'Career Advice' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      const data = (await res.json()) as { tag: { tag_name: string } };
      expect(data.tag.tag_name).toBe('career-advice');
    });

    it('should require authentication', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should validate tag name', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: null }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(500);
    });

    it('should reject empty tag name', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: '' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should reject tag name > 50 chars', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const longTagName = 'a'.repeat(51);
      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: longTagName }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should reject invalid characters', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'tag@#$%' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should prevent duplicate tags', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      // First tag
      const req1 = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });
      const res1 = await app.fetch(req1, mockEnv);
      expect(res1.status).toBe(201);

      // Duplicate tag
      const req2 = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });
      const res2 = await app.fetch(req2, mockEnv);
      expect(res2.status).toBe(409);
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/threads/:threadId/tags', () => {
    it('should return tags for thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      // Add a tag first
      const addReq = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });
      await app.fetch(addReq, mockEnv);

      // Get tags
      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { tags: unknown[] };
      expect(Array.isArray(data.tags)).toBe(true);
    });

    it('should return empty array for thread with no tags', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/tags');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { tags: unknown[] };
      expect(data.tags.length).toBe(0);
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/tags');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/forums/threads/:threadId/tags/:tagName', () => {
    it('should delete tag for thread author', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      // Add a tag first
      const addReq = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });
      await app.fetch(addReq, mockEnv);

      // Delete tag
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/tags/career-advice',
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
    });

    it('should delete tag for admin', async () => {
      const mockDb = createMockDb();
      const userToken = await createTestToken('user_1', 'user1@example.com', 'User One');
      const adminToken = await createTestToken('admin_1', 'admin@example.com', 'Admin User', 'admin');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      // Add a tag as regular user
      const addReq = new Request('http://localhost/api/v1/forums/threads/thread_123/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ tag_name: 'career-advice' }),
      });
      await app.fetch(addReq, mockEnv);

      // Delete tag as admin
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/tags/career-advice',
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        }
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/tags/career-advice',
        { method: 'DELETE' }
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });

    it('should require authorization (403 for non-author/non-admin)', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_2', 'user2@example.com', 'User Two');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/tags/career-advice',
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request(
        'http://localhost/api/v1/forums/threads/fake_thread/tags/career-advice',
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent tag', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/tags/fake-tag',
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });
});
