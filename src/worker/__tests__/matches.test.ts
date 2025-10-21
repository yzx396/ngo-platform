/**
 * Tests for Match Management API endpoints
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoints under test:
 * - POST /api/v1/matches - Create match request
 * - GET /api/v1/matches - List matches
 * - POST /api/v1/matches/:id/respond - Accept/reject match
 * - PATCH /api/v1/matches/:id/complete - Mark as completed
 * - DELETE /api/v1/matches/:id - Cancel/delete match
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { createToken } from '../auth/jwt';
import type { AuthPayload } from '../../types/user';

interface Env {
  platform_db: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_SECRET: string;
}

// ============================================================================
// Mock D1 Database
// ============================================================================

interface MockUser {
  id: string;
  email: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface MockMentorProfile {
  id: string;
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number;
  availability: string;
  hourly_rate: number;
  payment_types: number;
  allow_reviews: boolean;
  allow_recording: boolean;
  created_at: number;
  updated_at: number;
}

interface MockMatch {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  created_at: number;
  updated_at: number;
}

const createMockDb = () => {
  const mockUsers = new Map<string, MockUser>();
  const mockProfiles = new Map<string, MockMentorProfile>();
  const mockMatches = new Map<string, MockMatch>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: (string | number)[]) => ({
        all: vi.fn(async () => {
          // SELECT matches with filters
          if (query.includes('SELECT') && query.includes('matches') && query.includes('WHERE')) {
            let results = Array.from(mockMatches.values());
            let paramIndex = 0;

            // Handle OR condition first (it appears first in query string)
            if (query.includes('(mentor_id = ? OR mentee_id = ?)')) {
              const userId = params[paramIndex++];
              results = results.filter(m => m.mentor_id === userId || m.mentee_id === userId);
              // The OR condition has two parameters (same value repeated)
              paramIndex++; // Skip the second parameter in the OR
              // Check for role filter (additional condition after OR)
              if (query.includes('AND mentor_id = ?')) {
                const mentorId = params[paramIndex++];
                results = results.filter(m => m.mentor_id === mentorId);
              } else if (query.includes('AND mentee_id = ?')) {
                const menteeId = params[paramIndex++];
                results = results.filter(m => m.mentee_id === menteeId);
              }
            } else if (query.includes('mentor_id = ?') && !query.includes('OR')) {
              const mentorId = params[paramIndex++];
              results = results.filter(m => m.mentor_id === mentorId);
            } else if (query.includes('mentee_id = ?') && !query.includes('OR')) {
              const menteeId = params[paramIndex++];
              results = results.filter(m => m.mentee_id === menteeId);
            }

            // Handle status filter
            if (query.includes('status = ?')) {
              const status = params[paramIndex++];
              results = results.filter(m => m.status === status);
            }

            return { results };
          }

          return { results: [] };
        }),
        first: vi.fn(async () => {
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            return mockUsers.get(userId) || null;
          }
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            for (const [, profile] of mockProfiles.entries()) {
              if (profile.user_id === userId) {
                return profile;
              }
            }
            return null;
          }
          if (query.includes('SELECT') && query.includes('matches') && query.includes('WHERE id = ?')) {
            const matchId = params[0];
            return mockMatches.get(matchId) || null;
          }
          if (query.includes('SELECT') && query.includes('matches') && query.includes('mentor_id') && query.includes('mentee_id')) {
            const mentorId = params[0];
            const menteeId = params[1];
            for (const [, match] of mockMatches.entries()) {
              if (match.mentor_id === mentorId && match.mentee_id === menteeId) {
                return match;
              }
            }
            return null;
          }
          return null;
        }),
        run: vi.fn(async () => {
          if (query.includes('INSERT INTO users')) {
            const [id, email, name, created_at, updated_at] = params;
            mockUsers.set(id, { id, email, name, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }

          if (query.includes('INSERT INTO mentor_profiles')) {
            const [id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, allow_reviews, allow_recording, created_at, updated_at] = params;
            mockProfiles.set(id, { id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, allow_reviews, allow_recording, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }

          if (query.includes('INSERT INTO matches')) {
            const [id, mentor_id, mentee_id, status, created_at, updated_at] = params;
            mockMatches.set(id, { id, mentor_id, mentee_id, status, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }

          if (query.includes('UPDATE matches')) {
            const id = params[params.length - 1];
            const existing = mockMatches.get(id);
            if (existing) {
              const updated = { ...existing };
              let paramIndex = 0;

              if (query.includes('status = ?')) {
                updated.status = params[paramIndex++];
              }

              updated.updated_at = params[params.length - 2];
              mockMatches.set(id, updated);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }

          if (query.includes('DELETE FROM matches')) {
            const id = params[0];
            if (mockMatches.has(id)) {
              mockMatches.delete(id);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }

          return { success: true, meta: { changes: 0 } };
        }),
      })),
    })),
    _mockUsers: mockUsers,
    _mockProfiles: mockProfiles,
    _mockMatches: mockMatches,
  };
};

// ============================================================================
// Helper Functions for Tests
// ============================================================================

const JWT_SECRET = 'test-secret-key';

/**
 * Create a JWT token for testing
 */
async function createTestToken(userId: string, email: string, name: string): Promise<string> {
  const payload: AuthPayload = { userId, email, name };
  return createToken(payload, JWT_SECRET);
}

async function createTestUser(mockEnv: Env, email: string, name: string) {
  const req = new Request('http://localhost/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const res = await app.fetch(req, mockEnv);
  return await res.json();
}

async function createTestMentorProfile(mockEnv: Env, userId: string, nickName: string) {
  const token = await createTestToken(userId, 'test@example.com', 'Test User');
  const req = new Request('http://localhost/api/v1/mentors/profiles', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: userId,
      nick_name: nickName,
      bio: 'Test mentor',
      mentoring_levels: 1,
      payment_types: 1,
    }),
  });
  const res = await app.fetch(req, mockEnv);
  return await res.json();
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Match Management API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: Env;
  let mentor: MockUser;
  let mentee: MockUser;
  let mentorProfile: MockMentorProfile;

  beforeEach(async () => {
    mockDb = createMockDb();
     
    mockEnv = {
      platform_db: mockDb as unknown,
      JWT_SECRET: JWT_SECRET,
    } as Env;

    // Create test users and mentor profile
    mentor = await createTestUser(mockEnv, 'mentor@example.com', 'Test Mentor');
    mentee = await createTestUser(mockEnv, 'mentee@example.com', 'Test Mentee');
    mentorProfile = await createTestMentorProfile(mockEnv, mentor.id, 'TestMentor');
  });

  // ==========================================================================
  // POST /api/v1/matches - Create Match Request
  // ==========================================================================

  describe('POST /api/v1/matches - Create match', () => {
    it('should create a new match request with pending status', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const matchData = {
        mentor_id: mentorProfile.user_id,
      };

      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(matchData),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        mentor_id: mentorProfile.user_id,
        mentee_id: mentee.id,
        status: 'pending',
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
    });

    it('should return 400 when mentor_id is missing', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 when mentor does not exist', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mentor_id: 'nonexistent-user-id' }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Mentor');
    });

    it('should return 400 when mentor profile does not exist', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mentor_id: mentee.id }), // User without mentor profile
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('mentor profile');
    });

    it('should return 400 when mentee tries to match with themselves', async () => {
      // First create a mentor profile for mentee
      await createTestMentorProfile(mockEnv, mentee.id, 'MenteeMentor');

      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mentor_id: mentee.id }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('themselves');
    });

    it('should return 409 when duplicate match already exists', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);

      // Create first match
      const req1 = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      await app.fetch(req1, mockEnv);

      // Try to create duplicate
      const req2 = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const res = await app.fetch(req2, mockEnv);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.toLowerCase()).toContain('duplicate');
    });
  });

  // ==========================================================================
  // GET /api/v1/matches - List Matches
  // ==========================================================================

  describe('GET /api/v1/matches - List matches', () => {
    let menteeToken: string;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);

      // Create a match for testing
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const res = await app.fetch(req, mockEnv);
      await res.json();
    });

    it('should list matches for mentee', async () => {
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('matches');
      expect(Array.isArray(data.matches)).toBe(true);
      expect(data.matches).toHaveLength(1);
    });

    it('should filter matches by status', async () => {
      const req = new Request('http://localhost/api/v1/matches?status=pending', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.matches).toHaveLength(1);
      expect(data.matches[0].status).toBe('pending');
    });

    it('should return 400 for invalid status filter', async () => {
      const req = new Request('http://localhost/api/v1/matches?status=invalid', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should return empty list when no matches exist', async () => {
      // Create a new user with no matches
      const newUser = await createTestUser(mockEnv, 'newuser@example.com', 'New User');
      const newUserToken = await createTestToken(newUser.id, newUser.email, newUser.name);

      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${newUserToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.matches)).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/v1/matches/:id/respond - Accept/Reject Match
  // ==========================================================================

  describe('POST /api/v1/matches/:id/respond - Respond to match', () => {
    let testMatch: MockMatch;
    let menteeToken: string;
    let mentorToken: string;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const res = await app.fetch(req, mockEnv);
      testMatch = await res.json();
    });

    it('should accept a match request', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('active');
      expect(data.id).toBe(testMatch.id);
    });

    it('should reject a match request', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('rejected');
      expect(data.id).toBe(testMatch.id);
    });

    it('should return 400 when action is invalid', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'invalid' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 when action is missing', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
    });

    it('should return 404 when match does not exist', async () => {
      const req = new Request('http://localhost/api/v1/matches/nonexistent-id/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // PATCH /api/v1/matches/:id/complete - Mark as Completed
  // ==========================================================================

  describe('PATCH /api/v1/matches/:id/complete - Complete match', () => {
    let testMatch: MockMatch;
    let menteeToken: string;
    let mentorToken: string;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create and accept a match
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      testMatch = await createRes.json();

      // Accept it
      const acceptReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const acceptRes = await app.fetch(acceptReq, mockEnv);
      testMatch = await acceptRes.json();
    });

    it('should mark an active match as completed', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('completed');
      expect(data.id).toBe(testMatch.id);
    });

    it('should return 404 when match does not exist', async () => {
      const req = new Request('http://localhost/api/v1/matches/nonexistent-id/complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 400 when match is not active', async () => {
      // Create a new mentee for this test (to avoid duplicate match)
      const newMentee = await createTestUser(mockEnv, 'newmentee@example.com', 'New Mentee');
      const newMenteeToken = await createTestToken(newMentee.id, newMentee.email, newMentee.name);

      // Create a pending match with the new mentee
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newMenteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const pendingMatch = await createRes.json();

      // Try to complete a pending match
      const req = new Request(`http://localhost/api/v1/matches/${pendingMatch.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('active');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/matches/:id - Delete/Cancel Match
  // ==========================================================================

  describe('DELETE /api/v1/matches/:id - Cancel match', () => {
    it('should delete a pending match', async () => {
      // Create a match
      const menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);

      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const testMatch = await createRes.json();

      // Delete it - mentee can delete their own pending match
      const deleteReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const deleteRes = await app.fetch(deleteReq, mockEnv);

      expect(deleteRes.status).toBe(200);
      const data = await deleteRes.json();
      expect(data).toEqual({ success: true });
    });

    it('should return 404 when match does not exist', async () => {
      const mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      const req = new Request('http://localhost/api/v1/matches/nonexistent-id', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${mentorToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Match lifecycle', () => {
    it('should go through complete lifecycle: pending → active → completed', async () => {
      // Create tokens for mentee and mentor
      const menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      const mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create match (pending)
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      let match = await createRes.json();
      expect(match.status).toBe('pending');

      // Accept match (active) - mentor responds
      const acceptReq = new Request(`http://localhost/api/v1/matches/${match.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const acceptRes = await app.fetch(acceptReq, mockEnv);
      match = await acceptRes.json();
      expect(match.status).toBe('active');

      // Complete match - mentor completes
      const completeReq = new Request(`http://localhost/api/v1/matches/${match.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const completeRes = await app.fetch(completeReq, mockEnv);
      match = await completeRes.json();
      expect(match.status).toBe('completed');
    });

    it('should reject match: pending → rejected', async () => {
      // Create tokens for mentee and mentor
      const menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      const mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create match (pending)
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({ mentor_id: mentorProfile.user_id }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      let match = await createRes.json();
      expect(match.status).toBe('pending');

      // Reject match - mentor rejects
      const rejectReq = new Request(`http://localhost/api/v1/matches/${match.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      });
      const rejectRes = await app.fetch(rejectReq, mockEnv);
      match = await rejectRes.json();
      expect(match.status).toBe('rejected');
    });
  });
});
