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
        upvote_count: 5,
        downvote_count: 1,
        reply_count: 3,
        created_at: 1700000000,
      },
    ],
  ]);

  const replies = new Map<string, Record<string, unknown>>([
    [
      'reply_123',
      {
        id: 'reply_123',
        upvote_count: 2,
        downvote_count: 0,
        created_at: 1700000000,
      },
    ],
  ]);

  const votes = new Map<string, Record<string, unknown>>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => {
          // SELECT thread with vote counts
          if (query.includes('SELECT id, upvote_count, downvote_count FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            return threads.get(threadId as string) || null;
          }

          // SELECT thread for updated counts
          if (query.includes('SELECT upvote_count, downvote_count FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            return threads.get(threadId as string) || null;
          }

          // SELECT thread data for hot score calculation
          if (query.includes('SELECT reply_count, created_at FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            return threads.get(threadId as string) || null;
          }

          // SELECT thread id only
          if (query.includes('SELECT id FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            const thread = threads.get(threadId as string);
            return thread ? { id: thread.id } : null;
          }

          // SELECT reply
          if (query.includes('FROM forum_replies WHERE id = ?')) {
            const replyId = params[0];
            return replies.get(replyId as string) || null;
          }

          // SELECT existing vote
          if (query.includes('SELECT vote_type FROM forum_votes WHERE votable_type = ? AND votable_id = ? AND user_id = ?')) {
            const [votableType, votableId, userId] = params;
            const key = `${userId}_${votableType}_${votableId}`;
            return votes.get(key) || null;
          }

          return null;
        }),
        run: vi.fn(async () => {
          // INSERT vote
          if (query.includes('INSERT INTO forum_votes')) {
            const [id, votableType, votableId, userId, voteType, createdAt] = params;
            const key = `${userId}_${votableType}_${votableId}`;
            votes.set(key, {
              id,
              user_id: userId as string,
              votable_type: votableType as string,
              votable_id: votableId as string,
              vote_type: voteType as string,
              created_at: createdAt as number,
            });
            return { success: true, meta: { changes: 1 } };
          }

          // UPDATE vote, thread, reply, or DELETE vote
          return { success: true, meta: { changes: 1 } };
        }),
      })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => ({ success: true, meta: { changes: 0 } })),
    })),
  };
}

describe('Forum Votes API', () => {
  describe('POST /api/v1/forums/threads/:threadId/vote', () => {
    it('should create upvote for authenticated user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { upvote_count: number; downvote_count: number; user_vote: string | null };
      expect(data).toHaveProperty('upvote_count');
      expect(data).toHaveProperty('user_vote');
    });

    it('should create downvote for authenticated user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: 'downvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { upvote_count: number; downvote_count: number; user_vote: string | null };
      expect(data).toHaveProperty('user_vote');
    });

    it('should require authentication', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should validate vote_type', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: 'invalid' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/forums/replies/:replyId/vote', () => {
    it('should create upvote for reply', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/replies/reply_123/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { upvote_count: number; user_vote: string | null };
      expect(data).toHaveProperty('user_vote');
    });

    it('should require authentication', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/replies/reply_123/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent reply', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/replies/fake_reply/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/threads/:threadId/vote', () => {
    it('should return user vote status for authenticated user', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/vote', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { user_vote: string | null };
      expect(data).toHaveProperty('user_vote');
    });

    it('should return null vote for unauthenticated user', async () => {
      const mockDb = createMockDb();
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/thread_123/vote');

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { user_vote: null };
      expect(data.user_vote).toBeNull();
    });

    it('should return 404 for non-existent thread', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/threads/fake_thread/vote', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/replies/:replyId/vote', () => {
    it('should return user vote status for reply', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/replies/reply_123/vote', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { user_vote: string | null };
      expect(data).toHaveProperty('user_vote');
    });

    it('should return 404 for non-existent reply', async () => {
      const mockDb = createMockDb();
      const token = await createTestToken('user_1', 'user1@example.com', 'User One');
      const mockEnv = createTestEnvWithDb(mockDb as unknown as D1Database, { JWT_SECRET });

      const req = new Request('http://localhost/api/v1/forums/replies/fake_reply/vote', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });
});
