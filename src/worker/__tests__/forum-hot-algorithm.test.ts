import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';

const JWT_SECRET = 'test-jwt-secret';

interface TestEnv {
  platform_db: D1Database;
  JWT_SECRET: string;
}

function createMockDb() {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 24 * 60 * 60;
  const oneMonthAgo = now - 30 * 24 * 60 * 60;

  const threads = new Map<string, Record<string, unknown>>([
    [
      'thread_popular',
      {
        id: 'thread_popular',
        upvote_count: 50,
        downvote_count: 2,
        reply_count: 30,
        created_at: oneWeekAgo,
        hot_score: 0,
      },
    ],
    [
      'thread_old',
      {
        id: 'thread_old',
        upvote_count: 100,
        downvote_count: 5,
        reply_count: 50,
        created_at: oneMonthAgo,
        hot_score: 0,
      },
    ],
    [
      'thread_new',
      {
        id: 'thread_new',
        upvote_count: 5,
        downvote_count: 0,
        reply_count: 2,
        created_at: now - 3600, // 1 hour ago
        hot_score: 0,
      },
    ],
    [
      'thread_no_votes',
      {
        id: 'thread_no_votes',
        upvote_count: 0,
        downvote_count: 0,
        reply_count: 0,
        created_at: now,
        hot_score: 0,
      },
    ],
    [
      'thread_no_replies',
      {
        id: 'thread_no_replies',
        upvote_count: 10,
        downvote_count: 1,
        reply_count: 0,
        created_at: oneWeekAgo,
        hot_score: 0,
      },
    ],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        first: vi.fn(async () => {
          // SELECT thread with all fields for hot score calculation
          if (query.includes('SELECT upvote_count, downvote_count, reply_count, created_at FROM forum_threads WHERE id = ?')) {
            const threadId = params[0];
            return threads.get(threadId as string) || null;
          }

          return null;
        }),
        run: vi.fn(async () => {
          // UPDATE thread hot_score
          if (query.includes('UPDATE forum_threads SET hot_score')) {
            const [hotScore, , threadId] = params;
            const thread = threads.get(threadId as string);
            if (thread) {
              thread.hot_score = hotScore;
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

const mockEnv: TestEnv = {
  platform_db: createMockDb() as unknown as D1Database,
  JWT_SECRET,
};

describe('Forum Hot Algorithm API', () => {
  describe('POST /api/v1/forums/threads/:threadId/calculate-hot-score', () => {
    it('should calculate hot score for thread', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_popular/calculate-hot-score',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { hot_score: number };
      expect(data).toHaveProperty('hot_score');
      expect(typeof data.hot_score).toBe('number');
    });

    it('should return 404 for non-existent thread', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/fake_thread/calculate-hot-score',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });

    it('should return hot_score in response', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_popular/calculate-hot-score',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { hot_score: number };
      expect(data.hot_score).toBeGreaterThanOrEqual(0);
    });

    it('should handle threads with no votes', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_no_votes/calculate-hot-score',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { hot_score: number };
      expect(typeof data.hot_score).toBe('number');
    });

    it('should handle threads with no replies', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_no_replies/calculate-hot-score',
        { method: 'POST' }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { hot_score: number };
      expect(typeof data.hot_score).toBe('number');
    });
  });
});
