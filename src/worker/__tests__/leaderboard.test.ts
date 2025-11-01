import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import type { D1Database } from '@cloudflare/workers-types';
import type { GetLeaderboardResponse } from '../../types/api';

interface Env {
  platform_db: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
}

describe('Leaderboard API', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret',
      platform_db: {
        prepare: () => ({
          bind: () => ({
            first: async () => null,
            all: async () => ({ success: true, results: [] }),
            run: async () => ({ success: true }),
          }),
          first: async () => null,
          all: async () => ({ success: true, results: [] }),
          run: async () => ({ success: true }),
        }),
      },
    } as unknown as Env;
  });

  describe('GET /api/v1/leaderboard', () => {
    it('should return leaderboard with users sorted by points', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json<GetLeaderboardResponse>();
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
      expect(Array.isArray(data.users)).toBe(true);
    });

    it('should return users with rank, name, points, and id', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      if (data.users.length > 0) {
        const user = data.users[0];
        expect(user).toHaveProperty('user_id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('points');
        expect(user).toHaveProperty('rank');
        expect(typeof user.rank).toBe('number');
        expect(user.rank >= 1).toBe(true);
      }
    });

    it('should return users sorted by points in descending order', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      const users = data.users;
      for (let i = 0; i < users.length - 1; i++) {
        expect(users[i].points >= users[i + 1].points).toBe(true);
      }
    });

    it('should support limit parameter', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard?limit=10');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      expect(data.limit).toBe(10);
      expect(data.users.length <= 10).toBe(true);
    });

    it('should support offset parameter', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard?offset=0&limit=5');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      expect(data.offset).toBe(0);
    });

    it('should return default limit of 50', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      expect(data.limit).toBe(50);
    });

    it('should return total count of all users', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      expect(typeof data.total).toBe('number');
      expect(data.total >= 0).toBe(true);
    });

    it('should handle empty leaderboard gracefully', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      expect(Array.isArray(data.users)).toBe(true);
      // Even if empty, should have the structure
      expect(data).toHaveProperty('total');
    });

    it('should validate limit parameter', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard?limit=10000');
      const res = await app.fetch(req, mockEnv);

      const data = await res.json<GetLeaderboardResponse>();
      // Should cap the limit at 100
      expect(data.limit <= 100).toBe(true);
    });

    it('should handle invalid limit parameter', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard?limit=abc');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
    });

    it('should handle invalid offset parameter', async () => {
      const req = new Request('http://localhost/api/v1/leaderboard?offset=abc');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
    });
  });
});
