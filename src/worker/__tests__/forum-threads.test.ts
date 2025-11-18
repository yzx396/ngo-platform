import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';

const JWT_SECRET = 'test-jwt-secret';

interface TestEnv {
  platform_db: D1Database;
  JWT_SECRET: string;
}

interface ThreadRecord {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  status: string;
  is_pinned: number;
  view_count: number;
  reply_count: number;
  upvote_count: number;
  downvote_count: number;
  hot_score: number;
  last_activity_at: number;
  created_at: number;
  updated_at: number;
  author_name: string;
  author_email: string;
}

function createMockDb() {
  const threads = new Map<string, Record<string, unknown>>([
    [
      'thread_1',
      {
        id: 'thread_1',
        category_id: 'cat_career_job',
        user_id: 'user_1',
        title: 'How to negotiate salary?',
        content: 'I have an offer for a remote role...',
        status: 'open',
        is_pinned: 0,
        view_count: 345,
        reply_count: 23,
        upvote_count: 45,
        downvote_count: 0,
        hot_score: 456.78,
        last_activity_at: 1700100000,
        created_at: 1700000000,
        updated_at: 1700100000,
      },
    ],
    [
      'thread_2',
      {
        id: 'thread_2',
        category_id: 'cat_career_job',
        user_id: 'user_2',
        title: 'Resume review request',
        content: 'Would appreciate feedback on my resume...',
        status: 'open',
        is_pinned: 1,
        view_count: 234,
        reply_count: 18,
        upvote_count: 34,
        downvote_count: 0,
        hot_score: 234.56,
        last_activity_at: 1700050000,
        created_at: 1699900000,
        updated_at: 1700050000,
      },
    ],
    [
      'thread_3',
      {
        id: 'thread_3',
        category_id: 'cat_mentorship',
        user_id: 'user_3',
        title: 'Finding a good mentor',
        content: 'How do I find a mentor in tech?',
        status: 'open',
        is_pinned: 0,
        view_count: 156,
        reply_count: 12,
        upvote_count: 23,
        downvote_count: 0,
        hot_score: 123.45,
        last_activity_at: 1700075000,
        created_at: 1699950000,
        updated_at: 1700075000,
      },
    ],
  ]);

  const users = new Map<string, Record<string, unknown>>([
    ['user_1', { id: 'user_1', name: 'Jane', email: 'jane@example.com' }],
    ['user_2', { id: 'user_2', name: 'John', email: 'john@example.com' }],
    ['user_3', { id: 'user_3', name: 'Sarah', email: 'sarah@example.com' }],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // SELECT threads by category
          if (
            query.includes('forum_threads') &&
            query.includes('WHERE t.category_id = ?')
          ) {
            const categoryId = params[0];
            const limit = params[1] || 20;
            const offset = params[2] || 0;

            let results = Array.from(threads.values()).filter(
              t => t.category_id === categoryId
            );

            // Sort: pinned first, then by last_activity DESC
            results = results.sort((a, b) => {
              const aPinned = a.is_pinned ? 1 : 0;
              const bPinned = b.is_pinned ? 1 : 0;
              if (aPinned !== bPinned) return bPinned - aPinned;
              return (b.last_activity_at as number) - (a.last_activity_at as number);
            });

            results = results.slice(
              offset as number,
              (offset as number) + (limit as number)
            );

            // Add author info
            results = results.map(t => ({
              ...t,
              author_name: (users.get(t.user_id as string) as Record<string, unknown> | undefined)?.name || 'Unknown',
              author_email: (users.get(t.user_id as string) as Record<string, unknown> | undefined)?.email || '',
            }));

            return { results, success: true };
          }

          // COUNT threads by category
          if (query.includes('COUNT(*) as total') && query.includes('forum_threads')) {
            const categoryId = params[0];
            const results = Array.from(threads.values()).filter(
              t => t.category_id === categoryId
            );
            return { results: [{ total: results.length }], success: true };
          }

          return { results: [], success: true };
        }),
        first: vi.fn(async () => null),
      })),
      all: vi.fn(async () => ({ results: [], success: true })),
      first: vi.fn(async () => null),
    })),
  };
}

const mockEnv: TestEnv = {
  platform_db: createMockDb() as D1Database,
  JWT_SECRET,
};

describe('Forum Threads API', () => {
  describe('GET /api/v1/forums/threads', () => {
    it('should return threads for a category', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=cat_career_job'
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { threads: ThreadRecord[]; total: number };
      expect(Array.isArray(data.threads)).toBe(true);
      expect(data.threads.length).toBeGreaterThan(0);
    });

    it('should include thread metadata', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=cat_career_job'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { threads: ThreadRecord[] };

      const thread = data.threads[0];
      expect(thread).toHaveProperty('id');
      expect(thread).toHaveProperty('title');
      expect(thread).toHaveProperty('content');
      expect(thread).toHaveProperty('author_name');
      expect(thread).toHaveProperty('author_email');
      expect(thread).toHaveProperty('status');
      expect(thread).toHaveProperty('view_count');
      expect(thread).toHaveProperty('reply_count');
      expect(thread).toHaveProperty('upvote_count');
      expect(thread).toHaveProperty('is_pinned');
      expect(thread).toHaveProperty('last_activity_at');
    });

    it('should show pinned threads first', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=cat_career_job'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { threads: ThreadRecord[] };

      // First thread should be pinned
      expect(data.threads[0].is_pinned).toBe(1);
    });

    it('should support pagination', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=cat_career_job&limit=1&offset=0'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { threads: ThreadRecord[] };

      expect(data.threads.length).toBeLessThanOrEqual(1);
    });

    it('should return total thread count', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=cat_career_job'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { total: number };

      expect(typeof data.total).toBe('number');
      expect(data.total).toBeGreaterThanOrEqual(0);
    });

    it('should require category_id parameter', async () => {
      const req = new Request('http://localhost/api/v1/forums/threads');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
    });

    it('should return empty array for non-existent category', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=fake_category'
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { threads: ThreadRecord[] };
      expect(data.threads.length).toBe(0);
    });

    it('should sort by last activity (bumping)', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads?category_id=cat_career_job'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { threads: ThreadRecord[] };

      // After pinned threads, should be sorted by last_activity DESC
      if (data.threads.length > 1) {
        for (let i = 1; i < data.threads.length; i++) {
          if (!data.threads[i - 1].is_pinned || !data.threads[i].is_pinned) {
            // Compare last_activity for non-pinned threads
            if (!data.threads[i].is_pinned && !data.threads[i - 1].is_pinned) {
              expect(data.threads[i - 1].last_activity_at).toBeGreaterThanOrEqual(
                data.threads[i].last_activity_at
              );
            }
          }
        }
      }
    });
  });
});
