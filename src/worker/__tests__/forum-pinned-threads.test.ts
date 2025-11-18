import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';
import { createTestToken, createTestEnvWithDb } from './utils/testAuth';

const JWT_SECRET = 'test-jwt-secret';

function createMockDb() {
  const threads = new Map<string, Record<string, unknown>>([
    [
      'thread_123',
      {
        id: 'thread_123',
        user_id: 'user_1',
        title: 'Test Thread',
        is_pinned: 0,
        created_at: 1700000000,
      },
    ],
  ]);

  const users = new Map<string, Record<string, unknown>>([
    ['user_1', { id: 'user_1', name: 'User One' }],
    ['admin_1', { id: 'admin_1', name: 'Admin User' }],
  ]);

  const userRoles = new Map<string, Record<string, unknown>>([
    ['admin_1', { user_id: 'admin_1', role: 'admin' }],
    ['user_1', { user_id: 'user_1', role: 'member' }],
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

          // SELECT thread with user info (JOIN query)
          if (query.includes('JOIN users u ON t.user_id = u.id')) {
            const threadId = params[params.length - 1];
            const thread = threads.get(threadId as string);
            if (thread) {
              const user = users.get(thread.user_id as string);
              return {
                ...thread,
                author_name: user?.name || 'Unknown',
              };
            }
            return null;
          }

          // SELECT user role
          if (query.includes('SELECT role FROM user_roles WHERE user_id = ?')) {
            const userId = params[0];
            const roleRecord = userRoles.get(userId as string);
            return roleRecord ? { role: roleRecord.role } : null;
          }

          return null;
        }),
        run: vi.fn(async () => {
          // UPDATE thread is_pinned
          if (query.includes('UPDATE forum_threads SET is_pinned')) {
            const [isPinned, , threadId] = params;
            const thread = threads.get(threadId as string);
            if (thread) {
              thread.is_pinned = isPinned;
            }
            return { success: true, meta: { changes: 1 } };
          }

          return { success: true, meta: { changes: 0 } };
        }),
      })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
    })),
  };
}

describe('Forum Pinned Threads API', () => {
  describe('PATCH /api/v1/forums/threads/:threadId/pin', () => {
    it('should pin thread for admin user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('admin_1', 'admin@example.com', 'Admin User', 'admin');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: true }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { thread: { id: string; is_pinned: number } };
      expect(data).toHaveProperty('thread');
      expect(data.thread.is_pinned).toBe(1);
    });

    it('should unpin thread for admin user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('admin_1', 'admin@example.com', 'Admin User', 'admin');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: false }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { thread: { id: string; is_pinned: number } };
      expect(data.thread.is_pinned).toBe(0);
    });

    it('should require authentication', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: true }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should require admin role', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user@example.com', 'Regular User');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: true }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(403);
    });

    it('should validate is_pinned is boolean', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('admin_1', 'admin@example.com', 'Admin User', 'admin');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: 'invalid' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('admin_1', 'admin@example.com', 'Admin User', 'admin');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: true }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });

    it('should return updated thread with is_pinned status', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('admin_1', 'admin@example.com', 'Admin User', 'admin');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_pinned: true }),
      });

      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { thread: { id: string; is_pinned: number; title: string } };
      expect(data.thread).toHaveProperty('id');
      expect(data.thread).toHaveProperty('is_pinned');
      expect(data.thread).toHaveProperty('title');
    });
  });
});
