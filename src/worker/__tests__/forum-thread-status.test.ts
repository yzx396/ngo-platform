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
        status: 'open',
        created_at: 1700000000,
      },
    ],
  ]);

  const users = new Map<string, Record<string, unknown>>([
    ['user_1', { id: 'user_1', name: 'User One', email: 'user1@example.com' }],
    ['user_2', { id: 'user_2', name: 'User Two', email: 'user2@example.com' }],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => {
          // SELECT thread user_id only
          if (query.includes('SELECT user_id FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            const thread = threads.get(threadId as string);
            return thread ? { user_id: thread.user_id } : null;
          }

          // SELECT thread with author info (JOIN query)
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

          return null;
        }),
        run: vi.fn(async () => {
          // UPDATE thread status
          if (query.includes('UPDATE forum_threads SET status')) {
            const [newStatus, , threadId] = params;
            const thread = threads.get(threadId as string);
            if (thread) {
              thread.status = newStatus;
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

describe('Forum Thread Status API', () => {
  describe('PATCH /api/v1/forums/threads/:threadId/status', () => {
    it("should update status to 'solved' for thread author", async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'solved' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { thread: { id: string; status: string } };
      expect(data).toHaveProperty('thread');
      expect(data.thread.status).toBe('solved');
    });

    it("should update status to 'closed' for thread author", async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'closed' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { thread: { id: string; status: string } };
      expect(data.thread.status).toBe('closed');
    });

    it("should update status to 'open' for thread author", async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'open' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { thread: { id: string; status: string } };
      expect(data.thread.status).toBe('open');
    });

    it('should require authentication', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'solved' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should require user to be thread author', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_2', 'user2@example.com', 'User Two');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'solved' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(403);
    });

    it('should validate status value', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'invalid-status' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'solved' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });

    it('should return updated thread with new status', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'solved' }),
      });

      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { thread: { id: string; status: string; title: string } };
      expect(data.thread).toHaveProperty('id');
      expect(data.thread).toHaveProperty('status');
      expect(data.thread).toHaveProperty('title');
      expect(data.thread.status).toBe('solved');
    });
  });
});
