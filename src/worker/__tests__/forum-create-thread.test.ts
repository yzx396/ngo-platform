import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import type { AuthPayload } from '../../types/user';
import { createToken } from '../auth/jwt';
import app from '../index';

const JWT_SECRET = 'test-jwt-secret';

/**
 * Create a JWT token for testing
 */
async function createTestToken(userId: string, email: string, name: string): Promise<string> {
  const payload: AuthPayload = { userId, email, name };
  return createToken(payload, JWT_SECRET);
}

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
}

function createMockDb() {
  const threads = new Map<string, Record<string, unknown>>();
  const categories = new Map<string, Record<string, unknown>>([
    [
      'cat_career',
      {
        id: 'cat_career',
        name: 'Career Development',
        slug: 'career-development',
      },
    ],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        run: vi.fn(async () => {
          // INSERT thread
          if (query.includes('INSERT INTO forum_threads')) {
            const threadId = params[0];
            const categoryId = params[1];
            const userId = params[2];
            const title = params[3];
            const content = params[4];
            const now = Math.floor(Date.now() / 1000);

            const thread: Record<string, unknown> = {
              id: threadId,
              category_id: categoryId,
              user_id: userId,
              title,
              content,
              status: 'open',
              is_pinned: 0,
              view_count: 0,
              reply_count: 0,
              upvote_count: 0,
              downvote_count: 0,
              hot_score: 0,
              last_activity_at: now,
              created_at: now,
              updated_at: now,
            };

            threads.set(threadId as string, thread);
            return { success: true };
          }

          return { success: true };
        }),
        first: vi.fn(async () => {
          // Check if category exists
          if (query.includes('SELECT id FROM forum_categories WHERE id = ?')) {
            const categoryId = params[0];
            return categories.get(categoryId as string) || null;
          }
          return null;
        }),
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

describe('Forum Create Thread API', () => {
  describe('POST /api/v1/forums/threads', () => {
    it('should create a new thread with valid data', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          title: 'How to negotiate salary?',
          content: 'I got an offer from a tech company...',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      const data = (await res.json()) as { thread: ThreadRecord; message: string };
      expect(data.thread).toHaveProperty('id');
      expect(data.thread).toHaveProperty('title', 'How to negotiate salary?');
      expect(data.thread).toHaveProperty('category_id', 'cat_career');
      expect(data.thread.status).toBe('open');
      expect(data.message).toBe('Thread created successfully');
    });

    it('should require authentication', async () => {
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          title: 'Test Thread',
          content: 'Test content',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          // Missing title and content
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should validate category exists', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'non_existent_category',
          title: 'Test Thread',
          content: 'Test content',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });

    it('should validate title is not empty', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          title: '',
          content: 'Test content',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should validate content is not empty', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          title: 'Test Thread',
          content: '',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);
    });

    it('should set thread status to open by default', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          title: 'Test Thread',
          content: 'Test content',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(201);
      const data = (await res.json()) as { thread: ThreadRecord };
      expect(data.thread.status).toBe('open');
    });

    it('should initialize engagement metrics to zero', async () => {
      const token = await createTestToken('user_1', 'test@example.com', 'Test User');
      const req = new Request('http://localhost/api/v1/forums/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: 'cat_career',
          title: 'Test Thread',
          content: 'Test content',
        }),
      });

      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { thread: ThreadRecord };
      expect(data.thread.view_count).toBe(0);
      expect(data.thread.reply_count).toBe(0);
      expect(data.thread.upvote_count).toBe(0);
      expect(data.thread.downvote_count).toBe(0);
    });
  });
});
