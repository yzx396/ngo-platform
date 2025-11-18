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
        view_count: 10,
        created_at: 1700000000,
      },
    ],
  ]);

  const views = new Map<string, Record<string, unknown>>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => {
          // SELECT thread
          if (query.includes('SELECT id, view_count FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            return threads.get(threadId as string) || null;
          }

          // SELECT view count only
          if (query.includes('SELECT view_count FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            const thread = threads.get(threadId as string);
            return thread ? { view_count: thread.view_count } : null;
          }

          // SELECT existing view by user_id
          if (query.includes('SELECT id FROM forum_thread_views WHERE thread_id = ? AND user_id = ?')) {
            const [threadId, userId] = params;
            const key = `${threadId}_user_${userId}`;
            return views.get(key) || null;
          }

          // SELECT existing view by ip_address
          if (query.includes('SELECT id FROM forum_thread_views WHERE thread_id = ? AND ip_address = ? AND user_id IS NULL')) {
            const [threadId, ipAddress] = params;
            const key = `${threadId}_ip_${ipAddress}`;
            return views.get(key) || null;
          }

          return null;
        }),
        all: vi.fn(async () => ({ results: [], success: true })),
        run: vi.fn(async () => {
          // INSERT view
          if (query.includes('INSERT INTO forum_thread_views')) {
            const [id, threadId, userId, ipAddress, createdAt] = params;
            const key = userId
              ? `${threadId}_user_${userId}`
              : `${threadId}_ip_${ipAddress}`;
            views.set(key, {
              id,
              thread_id: threadId,
              user_id: userId || null,
              ip_address: ipAddress || null,
              created_at: createdAt,
            });

            // Increment view count on thread
            const thread = threads.get(threadId as string);
            if (thread) {
              thread.view_count = (thread.view_count as number) + 1;
            }

            return { success: true, meta: { changes: 1 } };
          }

          // UPDATE thread view_count
          if (query.includes('UPDATE forum_threads SET view_count')) {
            return { success: true, meta: { changes: 1 } };
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

describe('Forum View Tracking API', () => {
  describe('POST /api/v1/forums/threads/:threadId/view', () => {
    it('should create view for authenticated user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { view_count: number; new_view: boolean };
      expect(data).toHaveProperty('new_view');
      expect(data.new_view).toBe(true);
    });

    it('should create view for unauthenticated user with IP', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { view_count: number; new_view: boolean };
      expect(data.new_view).toBe(true);
    });

    it('should not create duplicate view for same user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      // First view
      const req1 = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const res1 = await app.fetch(req1, mockEnv);
      expect(res1.status).toBe(200);
      const data1 = (await res1.json()) as { new_view: boolean };
      expect(data1.new_view).toBe(true);

      // Second view - should not be new
      const req2 = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const res2 = await app.fetch(req2, mockEnv);
      expect(res2.status).toBe(200);
      const data2 = (await res2.json()) as { new_view: boolean };
      expect(data2.new_view).toBe(false);
    });

    it('should not create duplicate view for same IP', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      // First view
      const req1 = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });
      const res1 = await app.fetch(req1, mockEnv);
      expect(res1.status).toBe(200);
      const data1 = (await res1.json()) as { new_view: boolean };
      expect(data1.new_view).toBe(true);

      // Second view - should not be new
      const req2 = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });
      const res2 = await app.fetch(req2, mockEnv);
      expect(res2.status).toBe(200);
      const data2 = (await res2.json()) as { new_view: boolean };
      expect(data2.new_view).toBe(false);
    });

    it('should increment view count', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { view_count: number; new_view: boolean };
      expect(data.new_view).toBe(true);
      expect(typeof data.view_count).toBe('number');
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/threads/:threadId/views', () => {
    it('should return view statistics', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/views');

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { total_views: number; unique_views: number };
      expect(data).toHaveProperty('total_views');
      expect(data).toHaveProperty('unique_views');
      expect(typeof data.total_views).toBe('number');
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/views');

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });
});
