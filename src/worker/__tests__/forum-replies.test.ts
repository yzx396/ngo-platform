import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';

const JWT_SECRET = 'test-jwt-secret';

interface TestEnv {
  platform_db: D1Database;
  JWT_SECRET: string;
}

interface ReplyRecord {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  parent_reply_id: string | null;
  is_solution: number;
  upvote_count: number;
  downvote_count: number;
  created_at: number;
  updated_at: number;
  author_name: string;
  author_email: string;
}

function createMockDb() {
  const replies = new Map<string, Record<string, unknown>>([
    [
      'reply_1',
      {
        id: 'reply_1',
        thread_id: 'thread_1',
        user_id: 'user_1',
        content: 'Great question! Here are some tips...',
        parent_reply_id: null,
        is_solution: 0,
        upvote_count: 12,
        downvote_count: 0,
        created_at: 1700100000,
        updated_at: 1700100000,
      },
    ],
    [
      'reply_2',
      {
        id: 'reply_2',
        thread_id: 'thread_1',
        user_id: 'user_2',
        content: 'I agree with this approach',
        parent_reply_id: 'reply_1',
        is_solution: 0,
        upvote_count: 5,
        downvote_count: 0,
        created_at: 1700110000,
        updated_at: 1700110000,
      },
    ],
    [
      'reply_3',
      {
        id: 'reply_3',
        thread_id: 'thread_1',
        user_id: 'user_1',
        content: 'Here is the solution!',
        parent_reply_id: null,
        is_solution: 1,
        upvote_count: 18,
        downvote_count: 0,
        created_at: 1700120000,
        updated_at: 1700120000,
      },
    ],
  ]);

  const users = new Map<string, Record<string, unknown>>([
    ['user_1', { id: 'user_1', name: 'Jane', email: 'jane@example.com' }],
    ['user_2', { id: 'user_2', name: 'John', email: 'john@example.com' }],
  ]);

  const threads = new Map<string, Record<string, unknown>>([
    ['thread_1', { id: 'thread_1', reply_count: 3, last_activity_at: 1700120000 }],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // SELECT replies by thread
          if (
            query.includes('forum_replies') &&
            query.includes('WHERE r.thread_id = ?') &&
            !query.includes('parent_reply_id = ?')
          ) {
            const threadId = params[0];
            const limit = params[1] || 50;
            const offset = params[2] || 0;

            let results = Array.from(replies.values()).filter(
              r => r.thread_id === threadId && r.parent_reply_id === null
            );

            // Sort by created_at ASC (oldest first for thread view)
            results = results.sort((a, b) => (a.created_at as number) - (b.created_at as number));

            results = results.slice(offset as number, (offset as number) + (limit as number));

            // Add author info
            results = results.map(r => ({
              ...r,
              author_name: (users.get(r.user_id as string) as Record<string, unknown> | undefined)?.name || 'Unknown',
              author_email: (users.get(r.user_id as string) as Record<string, unknown> | undefined)?.email || '',
            }));

            return { results, success: true };
          }

          // SELECT nested replies by parent_reply_id
          if (query.includes('parent_reply_id = ?') && query.includes('forum_replies')) {
            const parentReplyId = params[0];
            const results = Array.from(replies.values())
              .filter(r => r.parent_reply_id === parentReplyId)
              .map(r => ({
                ...r,
                author_name: (users.get(r.user_id as string) as Record<string, unknown> | undefined)?.name || 'Unknown',
                author_email: (users.get(r.user_id as string) as Record<string, unknown> | undefined)?.email || '',
              }));

            return { results, success: true };
          }

          // COUNT replies by thread
          if (query.includes('COUNT(*) as total') && query.includes('forum_replies')) {
            const threadId = params[0];
            const results = Array.from(replies.values()).filter(
              r => r.thread_id === threadId && r.parent_reply_id === null
            );
            return { results: [{ total: results.length }], success: true };
          }

          return { results: [], success: true };
        }),
        first: vi.fn(async () => {
          // SELECT single reply
          if (query.includes('WHERE r.id = ?') && query.includes('forum_replies')) {
            const replyId = params[0];
            const reply = replies.get(replyId as string);
            if (reply) {
              return {
                ...reply,
                author_name: (users.get(reply.user_id as string) as Record<string, unknown> | undefined)?.name || 'Unknown',
                author_email: (users.get(reply.user_id as string) as Record<string, unknown> | undefined)?.email || '',
              };
            }
            return null;
          }

          // SELECT thread
          if (query.includes('forum_threads') && query.includes('WHERE id = ?')) {
            const threadId = params[0];
            return threads.get(threadId as string) || null;
          }

          // SELECT parent reply
          if (query.includes('parent_reply_id = ?') && query.includes('forum_replies')) {
            const parentReplyId = params[0];
            return replies.get(parentReplyId as string) || null;
          }

          return null;
        }),
        run: vi.fn(async () => {
          // INSERT reply
          if (query.includes('INSERT INTO forum_replies')) {
            const [id, threadId, userId, content, parentReplyId, createdAt, updatedAt] = params;
            replies.set(id as string, {
              id,
              thread_id: threadId,
              user_id: userId,
              content,
              parent_reply_id: parentReplyId || null,
              is_solution: 0,
              upvote_count: 0,
              downvote_count: 0,
              created_at: createdAt,
              updated_at: updatedAt,
            });
            return { success: true };
          }

          // UPDATE reply
          if (query.includes('UPDATE forum_replies SET content')) {
            const [newContent, , replyId] = params;
            const reply = replies.get(replyId as string);
            if (reply) {
              reply.content = newContent;
              reply.updated_at = Math.floor(Date.now() / 1000);
            }
            return { success: true };
          }

          // DELETE reply
          if (query.includes('DELETE FROM forum_replies')) {
            const replyId = params[0];
            replies.delete(replyId as string);
            return { success: true };
          }

          // UPDATE thread reply_count
          if (query.includes('UPDATE forum_threads')) {
            return { success: true };
          }

          return { success: true };
        }),
      })),
      all: vi.fn(async () => ({ results: [], success: true })),
      first: vi.fn(async () => null),
      run: vi.fn(async () => ({ success: true })),
    })),
  };
}

const mockEnv: TestEnv = {
  platform_db: createMockDb() as D1Database,
  JWT_SECRET,
};

describe('Forum Replies API', () => {
  describe('GET /api/v1/forums/threads/:id/replies', () => {
    it('should return replies for a thread', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies'
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { replies: ReplyRecord[]; total: number };
      expect(Array.isArray(data.replies)).toBe(true);
      expect(data.replies.length).toBeGreaterThan(0);
    });

    it('should include reply metadata', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { replies: ReplyRecord[] };

      const reply = data.replies[0];
      expect(reply).toHaveProperty('id');
      expect(reply).toHaveProperty('content');
      expect(reply).toHaveProperty('author_name');
      expect(reply).toHaveProperty('author_email');
      expect(reply).toHaveProperty('parent_reply_id');
      expect(reply).toHaveProperty('is_solution');
      expect(reply).toHaveProperty('upvote_count');
      expect(reply).toHaveProperty('downvote_count');
      expect(reply).toHaveProperty('created_at');
    });

    it('should support pagination', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies?limit=1&offset=0'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { replies: ReplyRecord[] };

      expect(data.replies.length).toBeLessThanOrEqual(1);
    });

    it('should return total reply count', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { total: number };

      expect(typeof data.total).toBe('number');
      expect(data.total).toBeGreaterThanOrEqual(0);
    });

    it('should sort replies by creation time (oldest first)', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { replies: ReplyRecord[] };

      // Replies should be ordered by created_at ascending
      for (let i = 1; i < data.replies.length; i++) {
        expect(data.replies[i].created_at).toBeGreaterThanOrEqual(
          data.replies[i - 1].created_at
        );
      }
    });

    it('should return empty array for non-existent thread', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/fake_thread/replies'
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { replies: ReplyRecord[] };
      expect(data.replies.length).toBe(0);
    });

    it('should include solution indicator', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies'
      );
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { replies: ReplyRecord[] };

      // Check if any reply is marked as solution
      const hasSolution = data.replies.some(r => r.is_solution);
      expect(hasSolution).toBe(true);
    });
  });

  describe('GET /api/v1/forums/replies/:replyId', () => {
    it('should return 404 for non-existent reply', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/fake_reply'
      );
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/forums/threads/:threadId/replies', () => {
    it('should require authentication', async () => {
      const body = { content: 'This is a new reply' };
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_1/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/forums/replies/:replyId', () => {
    it('should require authentication', async () => {
      const body = { content: 'Updated reply content' };
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/forums/replies/:replyId', () => {
    it('should require authentication', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_1',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });
  });
});
